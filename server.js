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

// Ganti Server Key ini dengan Server Key Midtrans Sandbox / Production Anda
// JANGAN di-share ke orang lain!
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'YOUR_MIDTRANS_SERVER_KEY';
const IS_PRODUCTION = true; // Ubah ke true jika sudah siap live (Production)

const BASE_URL = IS_PRODUCTION 
  ? 'https://app.midtrans.com/snap/v1/transactions' 
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

app.post('/api/qris', async (req, res) => {
  console.log('--- Request masuk ke /api/qris (SNAP API) ---');
  try {
    const { order_id, gross_amount, customer_name } = req.body;

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
        return res.json({ 
          success: true, 
          qr_url: payData.qr_code_url,
          transaction_id: payData.transaction_id,
          order_id: payload.transaction_details.order_id
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
