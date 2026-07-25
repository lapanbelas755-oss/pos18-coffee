import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Client (server-side)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kdrtpzbxgjvkznkokxmi.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnRwemJ4Z2p2a3pua29reG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzk5NjYsImV4cCI6MjA5OTMxNTk2Nn0.PnhXOkGwVytUG-mimpgmaaPZilb7iDteVnf-VXsO_4U';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Ganti Server Key ini dengan Server Key Midtrans Sandbox / Production Anda
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_MIDTRANS_SERVER_KEY';
const IS_PRODUCTION = true;

const BASE_URL = IS_PRODUCTION 
  ? 'https://app.midtrans.com/snap/v1/transactions' 
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

// In-memory cache: midtransOrderId → { items, customer_name, table_id }
// Disimpan sementara di RAM hingga webhook diterima (maks 2 jam)
const pendingOrdersCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 jam

app.post('/api/qris', async (req, res) => {
  console.log('--- Request masuk ke /api/qris (SNAP API) ---');
  try {
    const { order_id, gross_amount, customer_name, items, table_id } = req.body;

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: 'order_id dan gross_amount harus diisi' });
    }

    const payload = {
      transaction_details: {
        order_id: `POS18-${order_id}-${Date.now()}`,
        gross_amount: Math.round(gross_amount)
      },
      customer_details: {
        first_name: customer_name || "Pelanggan POS"
      },
      enabled_payments: ["qris", "gopay", "other_qris"]
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
      // Langkah 2: Bypass UI Snap dan langsung request QR Code menggunakan token
      const snapPayUrl = IS_PRODUCTION 
        ? `https://app.midtrans.com/snap/v1/transactions/${data.token}/pay`
        : `https://app.sandbox.midtrans.com/snap/v1/transactions/${data.token}/pay`;
        
      const payResponse = await fetch(snapPayUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_type: "gopay" })
      });
      
      const payData = await payResponse.json();
      
      if (payResponse.ok && payData.qr_code_url) {
        const midtransId = payload.transaction_details.order_id;
        // Cache items for webhook use
        pendingOrdersCache.set(midtransId, {
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
          order_id: midtransId
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

app.get('/api/qris/status/:order_id', async (req, res) => {
  const { order_id } = req.params;
  const statusUrl = IS_PRODUCTION
    ? `https://api.midtrans.com/v2/${order_id}/status`
    : `https://api.sandbox.midtrans.com/v2/${order_id}/status`;
    
  const authString = Buffer.from(`${SERVER_KEY}:`).toString('base64');
  
  try {
    const response = await fetch(statusUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      }
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

// ─── Midtrans Payment Notification Webhook ───────────────────────────────────
// URL sudah terdaftar di Midtrans Dashboard: https://app.lapanbelas.id/api/midtrans-notification
app.post('/api/midtrans-notification', async (req, res) => {
  const notif = req.body;
  console.log('[Midtrans Notification]', notif?.order_id, notif?.transaction_status);

  // Only process settlement or capture
  const status = notif?.transaction_status;
  if (status !== 'settlement' && status !== 'capture') {
    return res.json({ ok: true, message: `Status ${status} diabaikan` });
  }

  const midtransOrderId = notif.order_id; // e.g. "POS18-ONL-4780-1753419123456"
  const grossAmount = parseInt(notif.gross_amount) || 0;

  // Retrieve cached data (items + customer) saved when QRIS was created
  const cached = pendingOrdersCache.get(midtransOrderId);
  const cachedItems = cached?.items || [];
  const custName = cached?.customer_name || notif.customer_details?.first_name || 'Tamu';
  const tableId = cached?.table_id || null;

  // Extract our internal order ID
  // If we have cache, use the stored internal_order_id directly
  let internalId = cached?.internal_order_id;
  if (!internalId) {
    // Fallback: strip "POS18-" prefix and timestamp suffix
    const parts = midtransOrderId.replace(/^POS18-/, '').split('-');
    internalId = parts.slice(0, -1).join('-') || midtransOrderId;
  }

  // Check if order already exists in Supabase (avoid duplicate from polling)
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('id', internalId)
    .single();

  if (existing) {
    console.log(`[Webhook] Order ${internalId} sudah ada, skip.`);
    pendingOrdersCache.delete(midtransOrderId);
    return res.json({ ok: true, message: 'Order sudah ada' });
  }

  // Build items for storage
  const orderItems = cachedItems.length > 0 ? cachedItems.map((item, idx) => ({
    id: `qr-item-${idx}`,
    product: { name: item.name, price: item.price || 0 },
    quantity: item.quantity,
    notes: item.notes || ''
  })) : [];

  // Insert order
  const nowStr = new Date().toLocaleString('id-ID');
  const { error: orderErr } = await supabase.from('orders').insert([{
    id: internalId,
    queue: 'OL',
    staff: 'Online',
    table: tableId || 'Unknown',
    pager: '-',
    type: 'Online',
    payment: 'QRIS (Paid)',
    status: 'Pending',
    total: grossAmount,
    time: nowStr,
    items: orderItems,
    customer_name: custName,
    created_at: new Date().toISOString()
  }]);

  if (orderErr) {
    console.error('[Webhook] Order insert error:', orderErr);
    return res.status(500).json({ error: 'Order insert failed' });
  }

  // Build KDS items from cache (with real item names)
  const buildKdsItems = (station) => {
    if (cachedItems.length === 0) {
      return [{ id: `${internalId}-${station}-0`, name: `Total Rp${grossAmount.toLocaleString('id-ID')} (item tidak tersedia)`, checked: false }];
    }
    return cachedItems.map((item, idx) => ({
      id: `${internalId}-${station}-${idx}`,
      name: `${item.quantity}x ${item.name}`,
      notes: item.notes || '',
      checked: false
    }));
  };

  await supabase.from('kds_orders').insert([
    { id: `${internalId}-B`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'barista', items: buildKdsItems('B'), customer_name: custName },
    { id: `${internalId}-K`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'kitchen', items: buildKdsItems('K'), customer_name: custName },
    { id: `${internalId}-KSR`, type: 'Online (QR)', table: tableId, time_in_seconds: 0, status: 'incoming', station: 'kasir', items: buildKdsItems('KSR'), customer_name: custName },
  ]);


  console.log(`[Webhook] ✅ Order ${internalId} (Rp${grossAmount.toLocaleString('id-ID')}) berhasil dibuat dari notifikasi Midtrans.`);
  res.json({ ok: true, message: 'Order created from webhook' });
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`\n✅ POS18 Server berjalan di port ${PORT}`);
  console.log(`👉 Mode: ${IS_PRODUCTION ? 'PRODUCTION' : 'SANDBOX'}`);
  console.log(`📡 API & Frontend siap digunakan!\n`);
});
