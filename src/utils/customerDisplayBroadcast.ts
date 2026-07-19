/**
 * customerDisplayBroadcast.ts
 * Utility untuk mengirim data ke layar Customer Display.
 * Menggunakan BroadcastChannel (primary) + localStorage (fallback).
 * BroadcastChannel bekerja lintas-tab pada origin yang SAMA.
 */

import { supabase } from "../lib/supabase";

const STORAGE_KEY = "pos_customer_display";
const CHANNEL_NAME = "pos18_customer_display";


export interface DisplayItem {
  name: string;
  qty: number;
  price: number;
  notes?: string;
}

export interface CustomerDisplayPayload {
  state: "idle" | "order" | "payment" | "success";
  items?: DisplayItem[];
  subtotal?: number;
  discount?: number;
  discountName?: string;
  tax?: number;
  total?: number;
  customerName?: string;
  paymentMethod?: "Cash" | "QRIS";
  qrisUrl?: string | null;
  qrisTimer?: number;
  orderId?: string;
  change?: number;
}

export function broadcastToDisplay(payload: CustomerDisplayPayload) {
  try {
    // 1. BroadcastChannel — primary (instan, lintas-tab same-origin)
    const bc = new BroadcastChannel(CHANNEL_NAME);
    bc.postMessage(payload);
    bc.close();
  } catch { /* BroadcastChannel mungkin tidak tersedia */ }

  try {
    // 2. localStorage — fallback (untuk polling lokal)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Customer Display local broadcast failed:", e);
  }

  try {
    // 3. Supabase Realtime — untuk lintas perangkat (Skenario B)
    // Buat channel baru setiap kali agar tidak zombie saat reconnect
    const ch = supabase.channel(`display-${Date.now()}`);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "display-update", payload });
        // Tutup setelah 3 detik agar tidak menumpuk
        setTimeout(() => supabase.removeChannel(ch), 3000);
      }
    });
  } catch (e) {
    console.warn("Customer Display remote broadcast failed:", e);
  }
}

export function clearDisplay() {
  broadcastToDisplay({ state: "idle" });
}
