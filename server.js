import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_MIDTRANS_SERVER_KEY';
const IS_PRODUCTION = true;

const BASE_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// Supabase via REST API (no SDK, prevents crash in Docker)
const SUPABASE_URL = 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzk5NjYsImV4cCI6MjA5OTMxNTk2Nn0.PnhXOkGwVytUG-mimpgmaaPZilb7iDteVnf-VXsO_4U';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function sbInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify(rows)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert ${table} error: ${err}`);
  }
}

async function sbSelect(table, column, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=${column}`, {
    headers: { ...sbHeaders, 'Prefer': 'return=representation' }
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// In-memory cache: midtransOrderId -> { items, customer_name, table_id, internal_order_id }
const pendingOrdersCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

// ─── POST /api/qris ──────────────────────────────────────────────────────────
app.post('/api/qris', async (req, res) => {
  console.log('--- Request masuk ke /api/qris ---');
  try {
    const { order_id, gross_amount, customer_name, items, table_id } = req.body;

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: 'order_id dan gross_amount harus diisi' });
    }

    const midtransOrderId = `POS18-${order_id}-${Date.now()}`;
    const payload = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: Math.round(gross_amount)
      },
      customer_details: { first_name: customer_name || 'Pelanggan POS' },
      enabled_payments: ['qris', 'gopay', 'other_qris']
    };

    const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok && data.token) {
      const snapPayUrl = IS_PRODUCTION
        ? `https://app.midtrans.com/snap/v1/transactions/${data.token}/pay`
        : `https://app.sandbox.midtrans.com/snap/v1/transactions/${data.token}/pay`;

      const payResponse = await fetch(snapPayUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_type: 'gopay' })
      });

      const payData = await payResponse.json();

      if (payResponse.ok && payData.qr_code_url) {
        // Cache cart items for webhook use
        pendingOrdersCache.set(midtransOrderId, {
          items: items || [],
          customer_name: customer_name || 'Tamu',
          table_id: table_id || null,
          internal_order_id: order_id,
          expires_at: Date.now() + CACHE_TTL_MS
        });
        return res.json({
          success: true,
          qr_url: payData.qr_code_url,
          transaction_id: payData.transaction_id,
          order_id: midtransOrderId
        });
      } else {
        return res.status(400).json({ error: payData.status_message || 'Gagal generate QR Code dari Snap', raw: payData });
      }
    } else {
      return res.status(400).json({ error: data.error_messages?.[0] || 'Gagal membuat transaksi Midtrans Snap', raw: data });
    }
  } catch (error) {
    console.error('Error generating QRIS:', error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server lokal' });
  }
});

// ─── GET /api/qris/status/:order_id ──────────────────────────────────────────
app.get('/api/qris/status/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const statusUrl = IS_PRODUCTION
    ? `https://api.midtrans.com/v2/${order_id}/status`
    : `https://api.sandbox.midtrans.com/v2/${order_id}/status`;

  const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');

  try {
    const response = await fetch(statusUrl, {
      headers: { 'Accept': 'application/json', 'Authorization': `Basic ${authString}` }
    });
    const data = await response.json();
    console.log(`Status check for ${order_id}:`, data.transaction_status || data);

    if (response.ok && (data.transaction_status === 'settlement' || data.transaction_status === 'capture')) {
      res.json({ success: true, status: data.transaction_status });
    } else {
      res.json({ success: false, status: data.transaction_status || 'pending' });
    }
  } catch (err) {
    console.error('Error checking status:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ─── POST /api/midtrans-notification (Webhook) ────────────────────────────────
app.post('/api/midtrans-notification', async (req, res) => {
  const notif = req.body;
  console.log('[Webhook]', notif?.order_id, notif?.transaction_status);

  const status = notif?.transaction_status;
  if (status !== 'settlement' && status !== 'capture') {
    return res.json({ ok: true, message: `Status ${status} diabaikan` });
  }

  const midtransOrderId = notif.order_id;
  const grossAmount = parseInt(notif.gross_amount) || 0;

  const cached = pendingOrdersCache.get(midtransOrderId);
  const cachedItems = cached?.items || [];
  const custName = cached?.customer_name || 'Tamu';
  const tableId = cached?.table_id || null;

  let internalId = cached?.internal_order_id;
  if (!internalId) {
    const parts = midtransOrderId.replace(/^POS18-/, '').split('-');
    internalId = parts.slice(0, -1).join('-') || midtransOrderId;
  }

  try {
    // Check if already exists
    const existing = await sbSelect('orders', 'id', internalId);
    if (existing.length > 0) {
      console.log(`[Webhook] Order ${internalId} sudah ada, skip.`);
      pendingOrdersCache.delete(midtransOrderId);
      return res.json({ ok: true, message: 'Order sudah ada' });
    }

    // Build order items
    const orderItems = cachedItems.map((item, idx) => ({
      id: `qr-item-${idx}`,
      product: { name: item.name, price: item.price || 0 },
      quantity: item.quantity,
      notes: item.notes || ''
    }));

    // Insert order
    await sbInsert('orders', [{
      id: internalId,
      queue: 'OL',
      staff: 'Online',
      table: tableId || 'Unknown',
      pager: '-',
      type: 'Online',
      payment: 'QRIS (Paid)',
      status: 'Pending',
      total: grossAmount,
      time: new Date().toLocaleString('id-ID'),
      items: orderItems,
      customer_name: custName,
      created_at: new Date().toISOString()
    }]);

    // Build KDS items
    const buildKdsItems = (prefix) => {
      if (cachedItems.length === 0) {
        return [{ id: `${internalId}-${prefix}-0`, name: `Total Rp${grossAmount.toLocaleString('id-ID')} (via QR)`, checked: false }];
      }
      return cachedItems.map((item, idx) => ({
        id: `${internalId}-${prefix}-${idx}`,
        name: `${item.quantity}x ${item.name}`,
        notes: item.notes || '',
        checked: false
      }));
    };

    // Insert KDS tickets
    await sbInsert('kds_orders', [
      { id: `${internalId}-B`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'barista', items: buildKdsItems('B'), customer_name: custName },
      { id: `${internalId}-K`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'kitchen', items: buildKdsItems('K'), customer_name: custName },
      { id: `${internalId}-KSR`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'kasir', items: buildKdsItems('KSR'), customer_name: custName },
    ]);

    pendingOrdersCache.delete(midtransOrderId);
    console.log(`[Webhook] ✅ Order ${internalId} berhasil dibuat.`);
    res.json({ ok: true, message: 'Order created from webhook' });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── Catch-all → React app ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ POS18 Server berjalan di port ${PORT}`);
  console.log(`👉 Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`📡 API & Frontend siap!\n`);
});
