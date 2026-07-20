/**
 * Bluetooth Thermal Printer Utility
 * Menggunakan Web Bluetooth API (browser-native) + ESC/POS command set
 * Kompatibel dengan: GOOJPRT PT-200, Epson TM-T82, Xprinter, dan thermal BT umum
 */

// ─── ESC/POS Command Constants ────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;
const CR  = 0x0d;

const CMD = {
  INIT:            [ESC, 0x40],           // Initialize printer
  ALIGN_LEFT:      [ESC, 0x61, 0x00],
  ALIGN_CENTER:    [ESC, 0x61, 0x01],
  ALIGN_RIGHT:     [ESC, 0x61, 0x02],
  BOLD_ON:         [ESC, 0x45, 0x01],
  BOLD_OFF:        [ESC, 0x45, 0x00],
  FONT_NORMAL:     [ESC, 0x21, 0x00],
  FONT_DOUBLE_H:   [ESC, 0x21, 0x10],
  FONT_DOUBLE:     [ESC, 0x21, 0x30],     // Double width + height
  CUT:             [GS, 0x56, 0x00],      // Full cut
  PARTIAL_CUT:     [GS, 0x56, 0x01],
  FEED_3:          [ESC, 0x64, 0x03],     // Feed 3 lines
};

// ─── Type Definitions ─────────────────────────────────────────────────────────
export interface PrinterDevice {
  id: string;
  name: string;
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
  rssi?: number;
}

export interface ReceiptLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  size?: 'normal' | 'double-height' | 'double';
  separator?: boolean; // --- dashed line
}

export interface ReceiptData {
  lines: ReceiptLine[];
  feedLines?: number;
  cut?: boolean;
}

// ─── State (singleton) ────────────────────────────────────────────────────────
const connectedPrinters: Record<string, PrinterDevice> = {};

// ─── Helper: Build ESC/POS byte buffer from lines ─────────────────────────────
function buildBuffer(data: ReceiptData): Uint8Array {
  const bytes: number[] = [];

  const push = (...args: number[]) => bytes.push(...args);
  const text = (str: string) => {
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  };

  // Initialize
  push(...CMD.INIT);

  for (const line of data.lines) {
    // Alignment
    if (line.align === 'center') push(...CMD.ALIGN_CENTER);
    else if (line.align === 'right') push(...CMD.ALIGN_RIGHT);
    else push(...CMD.ALIGN_LEFT);

    // Font size
    if (line.size === 'double') push(...CMD.FONT_DOUBLE);
    else if (line.size === 'double-height') push(...CMD.FONT_DOUBLE_H);
    else push(...CMD.FONT_NORMAL);

    // Bold
    if (line.bold) push(...CMD.BOLD_ON);
    else push(...CMD.BOLD_OFF);

    // Separator line
    if (line.separator) {
      text('--------------------------------');
    } else {
      text(line.text ?? '');
    }

    push(LF);
  }

  // Reset font & alignment
  push(...CMD.FONT_NORMAL);
  push(...CMD.BOLD_OFF);
  push(...CMD.ALIGN_LEFT);

  // Feed lines before cut
  const feedCount = data.feedLines ?? 3;
  for (let i = 0; i < feedCount; i++) push(LF);

  // Cut paper
  if (data.cut !== false) push(...CMD.CUT);

  return new Uint8Array(bytes);
}

// ─── Helper: Write to characteristic in 20-byte chunks ───────────────────────
async function writeChunked(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  chunkSize = 20
) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
    // Small delay to avoid buffer overflow
    await new Promise<void>((res) => setTimeout(res, 20));
  }
}

// ─── Main API ─────────────────────────────────────────────────────────────────

async function findWritableCharacteristic(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic | null> {
  const serviceUUIDs = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000fff0-0000-1000-8000-00805f9b34fb',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  ];

  const charUUIDs = [
    '00002af1-0000-1000-8000-00805f9b34fb',
    '0000ff02-0000-1000-8000-00805f9b34fb',
    '0000fff2-0000-1000-8000-00805f9b34fb',
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  ];

  for (const sUUID of serviceUUIDs) {
    try {
      const service = await server.getPrimaryService(sUUID);
      for (const cUUID of charUUIDs) {
        try {
          const ch = await service.getCharacteristic(cUUID);
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            return ch;
          }
        } catch { /* try next */ }
      }
    } catch { /* try next service */ }
  }

  // Fallback: try to get all services and look for writable characteristic
  try {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      try {
        const chars = await svc.getCharacteristics();
        for (const ch of chars) {
          if (ch.properties.write || ch.properties.writeWithoutResponse) {
            return ch;
          }
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  return null;
}

/**
 * Scan dan sambungkan ke printer Bluetooth terdekat.
 * Memunculkan native browser dialog pemilihan perangkat BT.
 */
export async function scanAndConnect(role: string): Promise<PrinterDevice> {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge.');
  }

  const device = await navigator.bluetooth.requestDevice({
    // Filter umum printer thermal BT
    filters: [
      { namePrefix: 'RPP' },
      { namePrefix: 'Xprinter' },
      { namePrefix: 'POS' },
      { namePrefix: 'Printer' },
      { namePrefix: 'BlueTooth' },
      { namePrefix: 'BT' },
      { namePrefix: 'MPT' },
      { namePrefix: 'MTP' },
      { namePrefix: 'TP' },
      { namePrefix: 'PT' },
      { namePrefix: 'JP' },
    ],
    // Fallback: accept all devices (jika nama printer tidak ada di filter atas)
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb', // SPP-like serial profile
      '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal printer service
      '0000fff0-0000-1000-8000-00805f9b34fb', // Alternative thermal service
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common Bluetooth printer
    ],
  });

  const server = await device.gatt!.connect();
  const characteristic = await findWritableCharacteristic(server);

  if (!characteristic) {
    throw new Error('Tidak dapat menemukan karakteristik write di printer ini. Pastikan printer kompatibel ESC/POS.');
  }

  const printerDevice: PrinterDevice = {
    id: device.id,
    name: device.name || 'Unknown Printer',
    device,
    characteristic,
  };

  connectedPrinters[role] = printerDevice;
  localStorage.setItem(`printer_${role}`, device.id); // Simpan ID device untuk reconnect

  // Listen for disconnect
  device.addEventListener('gattserverdisconnected', () => {
    delete connectedPrinters[role];
    console.log(`Printer ${role} terputus.`);
  });

  return printerDevice;
}

/**
 * Coba sambungkan kembali ke printer yang tersimpan tanpa prompt.
 * Memerlukan browser yang mendukung navigator.bluetooth.getDevices() (Chrome >= 85 dengan flag, atau default di Chrome modern)
 */
export async function reconnectPrinter(role: string): Promise<PrinterDevice | null> {
  if (!navigator.bluetooth || typeof (navigator.bluetooth as any).getDevices !== 'function') {
    return null;
  }

  const savedDeviceId = localStorage.getItem(`printer_${role}`);
  if (!savedDeviceId) return null;

  try {
    const devices = await (navigator.bluetooth as any).getDevices();
    const device = devices.find((d: any) => d.id === savedDeviceId);

    if (device) {
      const server = await device.gatt!.connect();
      const characteristic = await findWritableCharacteristic(server);
      
      if (!characteristic) {
        throw new Error('Tidak dapat menemukan karakteristik write.');
      }

      const printerDevice: PrinterDevice = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        device,
        characteristic,
      };

      connectedPrinters[role] = printerDevice;

      device.addEventListener('gattserverdisconnected', () => {
        delete connectedPrinters[role];
        console.log(`Printer ${role} terputus.`);
      });

      return printerDevice;
    }
  } catch (error) {
    console.error(`Gagal reconnect printer ${role}:`, error);
  }
  return null;
}

/** Disconnect dari printer aktif */
export function disconnectPrinter(role: string) {
  const printer = connectedPrinters[role];
  if (printer?.device.gatt?.connected) {
    printer.device.gatt.disconnect();
  }
  delete connectedPrinters[role];
  localStorage.removeItem(`printer_${role}`);
}

/** Cek apakah ada printer yang terhubung */
export function isConnected(role: string): boolean {
  return !!(connectedPrinters[role]?.device.gatt?.connected);
}

/** Ambil info printer yang sedang terhubung */
export function getConnectedPrinter(role: string): PrinterDevice | null {
  return connectedPrinters[role] || null;
}

// ─── Print Queue (Untuk mencegah error "GATT operation already in progress" bila menggunakan printer yang sama)
let isPrinting = false;
const printQueue: (() => Promise<void>)[] = [];

async function processQueue() {
  if (isPrinting || printQueue.length === 0) return;
  isPrinting = true;
  while (printQueue.length > 0) {
    const job = printQueue.shift();
    if (job) {
      try {
        await job();
        // Beri jeda 1 detik antar struk agar buffer printer tidak tumpang tindih
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error("Print job failed:", err);
      }
    }
  }
  isPrinting = false;
}

/** Cetak dokumen (ReceiptData) ke printer yang aktif */
export function printReceipt(data: ReceiptData, role: string): Promise<void> {
  return new Promise((resolve, reject) => {
    printQueue.push(async () => {
      try {
        const printer = connectedPrinters[role];
        if (!printer) throw new Error(`Tidak ada printer yang terhubung untuk ${role}.`);
        const buffer = buildBuffer(data);
        await writeChunked(printer.characteristic, buffer);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
}

/** Test print untuk memverifikasi koneksi printer */
export async function testPrint(role: string): Promise<void> {
  const testData: ReceiptData = {
    lines: [
      { text: '',              align: 'center' },
      { text: 'Lapanbelas Coffee', align: 'center', bold: true, size: 'double' },
      { text: '',              align: 'center' },
      { text: '==============================', align: 'left' },
      { text: `  TEST PRINT ${role.toUpperCase()} BERHASIL!`, align: 'center', bold: true },
      { text: '==============================', align: 'left' },
      { text: '',              align: 'left' },
      { text: 'Printer terhubung dengan baik.', align: 'center' },
      { text: 'Aceh Tamiang',                   align: 'center' },
      { text: 'Tel: 0838-3337-6959',            align: 'center' },
      { text: '',              align: 'left' },
    ],
    feedLines: 3,
    cut: true,
  };

  await printReceipt(testData, role);
}

/** Helper: Buat struk Kasir dari data order */
export function buildKasirReceipt(order: {
  storeName: string;
  storeAddress: string;
  cashierName: string;
  tableNo?: string;
  items: { name: string; qty: number; price: number; mood?: string; ice?: string; sugar?: string; notes?: string }[];
  total: number;
  paid: number;
  change: number;
  paymentMethod: string;
  footerText?: string;
  showWifi?: boolean;
  queueNo?: string;
}): ReceiptData {
  const lines: ReceiptLine[] = [
    { text: order.storeName, align: 'center', bold: true, size: 'double-height' },
    { text: order.storeAddress, align: 'center' },
    { text: '', separator: true },
    { text: `kasir : ${order.cashierName}` },
    ...(order.queueNo ? [{ text: `Antrian : ${order.queueNo}`, bold: true } as ReceiptLine] : []),
    ...(order.tableNo ? [{ text: `Meja  : ${order.tableNo}` } as ReceiptLine] : []),
    { text: `Tgl : ${new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}` },
    { text: '', separator: true },
  ];

  for (const item of order.items) {
    const totalStr = `Rp. ${(item.qty * item.price).toLocaleString('id-ID')}`;
    lines.push({ text: `${item.name} ( ${item.qty} x )`.padEnd(20) + totalStr.padStart(12), bold: true });
    
    let tipe = [];
    if (item.mood) tipe.push(item.mood);
    if (item.ice) tipe.push(item.ice);
    
    if (tipe.length > 0) {
      lines.push({ text: `tipe : ( ${tipe.join('/').toLowerCase()} )` });
    }
    if (item.notes) {
      lines.push({ text: `Catatan : ${item.notes}` });
    }
  }

  lines.push(
    { text: '', separator: true },
    { text: `${'Total :'.padEnd(16)}${order.total.toLocaleString('id-ID').padStart(16)}`, bold: true },
    { text: `${'Bayar :'.padEnd(16)}${order.paid.toLocaleString('id-ID').padStart(16)}` },
    { text: `${'Kembali :'.padEnd(16)}${order.change.toLocaleString('id-ID').padStart(16)}`, bold: true },
    { text: `Metode : ${order.paymentMethod.toLowerCase()}` },
    { text: '', separator: true },
  );

  if (order.showWifi) {
    lines.push(
      { text: '',              align: 'center' },
      { text: '[ QR WiFi ]', align: 'center', bold: true },
      { text: 'Scan for WiFi - Pass: Kopi18', align: 'center' },
      { text: '', separator: true },
    );
  }

  lines.push(
    { text: '',              align: 'center' },
    { text: order.footerText ?? 'Terima kasih atas kunjungan Anda!', align: 'center' },
  );

  return { lines, feedLines: 3, cut: true };
}

/** Helper: Buat tiket dapur dari data order */
export function buildDapurTicket(order: {
  orderId: string;
  tableNo?: string;
  customerName?: string;
  queueNo?: string;
  items: { name: string; qty: number; notes?: string }[];
  largeNotes?: boolean;
}): ReceiptData {
  const lines: ReceiptLine[] = [
    { text: '-- TIKET KITCHEN --', align: 'center', bold: true },
    { text: order.tableNo ? `MEJA ${order.tableNo}` : 'TAKE AWAY', align: 'center', bold: true, size: 'double' },
    { text: '', separator: true },
    ...(order.queueNo ? [{ text: `Antrian : ${order.queueNo}`, bold: true } as ReceiptLine] : []),
    { text: `Nama : ${order.customerName || '-'}` },
    { text: `order #${order.orderId}` },
    { text: '', separator: true },
  ];

  for (const item of order.items) {
    lines.push({ text: `${item.name} ( ${item.qty} x )`, bold: true });
    if (item.notes) {
      lines.push({
        text: `Catatan : ${item.notes}`,
        bold: !!order.largeNotes,
      });
    }
    lines.push({ text: '' });
  }

  return { lines, feedLines: 2, cut: true };
}

/** Helper: Buat tiket barista dari data order */
export function buildBaristaTicket(order: {
  orderId: string;
  tableNo?: string;
  customerName?: string;
  queueNo?: string;
  item: { name: string; size?: string; sugar?: string; ice?: string; mood?: string; notes?: string };
  itemIndex: number;
  totalItems: number;
  stickerMode?: boolean;
  qty?: number;
}): ReceiptData {
  if (order.stickerMode) {
    // Format kotak kecil (50mm thermal / label)
    return {
      lines: [
        { text: `MEJA ${order.tableNo ?? '-'}   #${order.itemIndex}/${order.totalItems}`, bold: true },
        { text: '', separator: true },
        { text: order.item.name, bold: true, size: 'double-height' },
        { text: `${order.item.size ?? ''} | ${order.item.mood ?? ''}` },
        ...(order.item.sugar ? [{ text: `Gula: ${order.item.sugar}` } as ReceiptLine] : []),
        ...(order.item.ice   ? [{ text: `Es  : ${order.item.ice}` }   as ReceiptLine] : []),
        ...(order.item.notes ? [{ text: `*${order.item.notes}*`, bold: true } as ReceiptLine] : []),
      ],
      feedLines: 2,
      cut: true,
    };
  }

  let tipe = [];
  if (order.item.mood) tipe.push(order.item.mood);
  if (order.item.ice) tipe.push(order.item.ice);

  return {
    lines: [
      { text: '-- TIKET BARISTA --', align: 'center', bold: true },
      { text: order.tableNo ? `MEJA ${order.tableNo}` : 'TAKE AWAY', align: 'center', bold: true, size: 'double' },
      { text: '', separator: true },
      ...(order.queueNo ? [{ text: `Antrian : ${order.queueNo}`, bold: true } as ReceiptLine] : []),
      { text: `Nama : ${order.customerName || '-'}` },
      { text: `order #${order.orderId}` },
      { text: '', separator: true },
      { text: `${order.item.name} ( ${order.qty || 1} x )`, bold: true },
      ...(tipe.length > 0 ? [{ text: `tipe : ( ${tipe.join('/').toLowerCase()} )` } as ReceiptLine] : []),
      ...(order.item.notes ? [{ text: `Catatan : ${order.item.notes}`, bold: true } as ReceiptLine] : []),
    ],
    feedLines: 2,
    cut: true,
  };
}
