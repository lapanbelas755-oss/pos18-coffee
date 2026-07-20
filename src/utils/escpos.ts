// escpos.ts
// Utility for generating raw ESC/POS byte arrays for thermal printers.

const ESC = 0x1B;
const GS = 0x1D;

export const ESC_POS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_TEXT: [ESC, 0x21, 0x00],
  PAPER_CUT: [GS, 0x56, 0x41, 0x00], // Partial cut
  OPEN_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA], // Kick drawer 1
  OPEN_DRAWER_2: [ESC, 0x70, 0x01, 0x19, 0xFA], // Kick drawer 2
  NEW_LINE: [0x0A],
};

function textToBytes(text: string): number[] {
  // Simple ASCII encoding
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i));
  }
  return bytes;
}

export function buildReceiptData(
  orderId: string,
  items: { name: string; qty: number; price: number; notes?: string }[],
  subtotal: number,
  discount: number,
  tax: number,
  total: number,
  paymentMethod: string,
  amountGiven?: number,
  change?: number,
  customerName?: string,
  discountName?: string,
  isPaid: boolean = true,
  table?: string,
  queue?: string
): Uint8Array {
  const charsPerLine = 32; // Default for 58mm printer
  let buffer: number[] = [];

  const addLine = (text: string) => {
    buffer.push(...textToBytes(text), ...ESC_POS.NEW_LINE);
  };

  const addCommand = (cmd: number[]) => {
    buffer.push(...cmd);
  };

  const padLeft = (text: string, length: number) => {
    return text.length > length ? text.substring(0, length) : text.padStart(length, ' ');
  };

  const formatLineBreak = (left: string, right: string) => {
    const space = charsPerLine - left.length - right.length;
    if (space > 0) {
      return left + ' '.repeat(space) + right;
    }
    return left.substring(0, charsPerLine - right.length - 1) + ' ' + right;
  };

  // Init
  addCommand(ESC_POS.INIT);
  
  // Header
  addCommand(ESC_POS.ALIGN_CENTER);
  addCommand(ESC_POS.BOLD_ON);
  addLine('Lapanbelas Coffee');
  addCommand(ESC_POS.BOLD_OFF);
  addLine('Aceh Tamiang');
  addLine('-'.repeat(charsPerLine));

  // Order Info
  addCommand(ESC_POS.ALIGN_LEFT);
  addLine(`ID: #${orderId}`);
  if (queue) addLine(`ANTRIAN: ${queue}`);
  if (table) {
    addLine(`MEJA: ${table}`);
  } else if (customerName) {
    addLine(`NAMA: ${customerName}`);
  }
  addLine(`STATUS: ${isPaid ? 'LUNAS' : 'BELUM LUNAS'}`);
  addLine('-'.repeat(charsPerLine));

  // Items
  items.forEach(item => {
    const line1 = `${item.qty}x ${item.name}`;
    const priceStr = (item.price * item.qty).toLocaleString('id-ID');
    
    if (line1.length + priceStr.length + 1 > charsPerLine) {
      addLine(line1);
      addLine(padLeft(priceStr, charsPerLine));
    } else {
      addLine(formatLineBreak(line1, priceStr));
    }
    if (item.notes) {
      addLine(`   ${item.notes}`);
    }
  });

  addLine('-'.repeat(charsPerLine));

  // Totals
  addLine(formatLineBreak('SUBTOTAL:', subtotal.toLocaleString('id-ID')));
  if (discount > 0) {
    const discLabel = discountName ? `DISKON (${discountName}):` : 'DISKON:';
    addLine(formatLineBreak(discLabel, `-${discount.toLocaleString('id-ID')}`));
  }
  if (tax > 0) {
    addLine(formatLineBreak('PAJAK:', tax.toLocaleString('id-ID')));
  }
  
  addCommand(ESC_POS.BOLD_ON);
  addLine(formatLineBreak('TOTAL:', `Rp ${total.toLocaleString('id-ID')}`));
  addCommand(ESC_POS.BOLD_OFF);
  
  addLine('-'.repeat(charsPerLine));

  // Payment
  if (isPaid) {
    addLine(formatLineBreak('PEMBAYARAN:', paymentMethod.toUpperCase()));
    if (amountGiven !== undefined) {
      addLine(formatLineBreak('TUNAI:', amountGiven.toLocaleString('id-ID')));
      addLine(formatLineBreak('KEMBALIAN:', (change || 0).toLocaleString('id-ID')));
    }
  }

  // Footer
  addCommand(ESC_POS.ALIGN_CENTER);
  addLine('-'.repeat(charsPerLine));
  addLine('Terima Kasih!');
  addLine(' ');
  addLine(' ');
  addLine(' ');
  
  if (isPaid) {
    // Kick drawer if paid
    addCommand(ESC_POS.OPEN_DRAWER);
    addCommand(ESC_POS.OPEN_DRAWER_2);
  }
  
  // Cut Paper
  addCommand(ESC_POS.PAPER_CUT);

  return new Uint8Array(buffer);
}

export function buildKdsTicketData(
  orderId: string,
  target: 'Barista' | 'Kitchen',
  items: { name: string; qty: number; notes?: string }[],
  customerName?: string,
  isPaid: boolean = false
): Uint8Array {
  const charsPerLine = 32;
  let buffer: number[] = [];

  const addLine = (text: string) => buffer.push(...textToBytes(text), ...ESC_POS.NEW_LINE);
  const addCommand = (cmd: number[]) => buffer.push(...cmd);

  addCommand(ESC_POS.INIT);
  addCommand(ESC_POS.ALIGN_CENTER);
  addCommand(ESC_POS.DOUBLE_HEIGHT);
  addCommand(ESC_POS.BOLD_ON);
  addLine(`=== TIKET ${target.toUpperCase()} ===`);
  addCommand(ESC_POS.BOLD_OFF);
  addCommand(ESC_POS.NORMAL_TEXT);
  
  addLine('-'.repeat(charsPerLine));
  addCommand(ESC_POS.ALIGN_LEFT);
  addLine(`ID: #${orderId}`);
  if (customerName) addLine(`NAMA: ${customerName}`);
  addLine('-'.repeat(charsPerLine));

  addCommand(ESC_POS.BOLD_ON);
  items.forEach(item => {
    addLine(`[ ] ${item.qty}x ${item.name}`);
    if (item.notes) {
      addCommand(ESC_POS.BOLD_OFF);
      addLine(`    Catatan: ${item.notes}`);
      addCommand(ESC_POS.BOLD_ON);
    }
    addLine(' ');
  });
  addCommand(ESC_POS.BOLD_OFF);

  addLine('-'.repeat(charsPerLine));
  addLine(' ');
  addCommand(ESC_POS.PAPER_CUT);

  return new Uint8Array(buffer);
}
