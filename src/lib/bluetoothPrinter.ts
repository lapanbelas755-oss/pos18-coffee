// src/lib/bluetoothPrinter.ts
export class BluetoothPrinter {
  device: BluetoothDevice | null = null;
  server: BluetoothRemoteGATTServer | null = null;
  characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API is not available in this browser. Please use Google Chrome on Android/PC.');
      }

      console.log('Requesting Bluetooth Device...');
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Serial Port
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          // Add other common UUIDs here if needed
        ]
      });

      console.log('Connecting to GATT Server...');
      this.server = await this.device.gatt?.connect() || null;

      if (!this.server) {
        throw new Error('Could not connect to GATT server');
      }

      console.log('Getting Services...');
      const services = await this.server.getPrimaryServices();
      
      for (const service of services) {
        console.log('Getting Characteristics for service', service.uuid);
        const characteristics = await service.getCharacteristics();
        
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            console.log('Found writable characteristic:', char.uuid);
            break;
          }
        }
        if (this.characteristic) break;
      }

      if (!this.characteristic) {
        throw new Error('Could not find a writable characteristic on this printer.');
      }

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  onDisconnected = () => {
    console.log('Bluetooth Device disconnected');
    this.device = null;
    this.server = null;
    this.characteristic = null;
    // You could trigger a global event or callback here to update UI state
    window.dispatchEvent(new Event('printer-disconnected'));
  };

  private printQueue: Uint8Array[] = [];
  private isPrinting: boolean = false;

  async print(data: Uint8Array) {
    if (!this.characteristic) {
      console.warn('Printer not connected. Cannot print.');
      return false;
    }

    // Tambahkan data ke antrean
    this.printQueue.push(data);
    
    // Jika tidak sedang nge-print, jalankan proses antrean
    if (!this.isPrinting) {
      this.processQueue();
    }
    
    return true;
  }

  private async processQueue() {
    this.isPrinting = true;

    while (this.printQueue.length > 0) {
      const data = this.printQueue.shift();
      if (!data || !this.characteristic) continue;

      try {
        // Send data in chunks of 512 bytes to prevent buffer overflow
        const chunkSize = 512;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          await this.characteristic.writeValue(chunk);
        }
        
        // Jeda kecil (100ms) antar struk agar printer tidak hang/tersendat
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('Error writing to printer in queue:', error);
      }
    }

    this.isPrinting = false;
  }

  disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
}

export const printerManager = new BluetoothPrinter();
