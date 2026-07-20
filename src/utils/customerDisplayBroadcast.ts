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

let remoteChannel: ReturnType<typeof supabase.channel> | null = null;
function getRemoteChannel() {
  if (!remoteChannel) {
    remoteChannel = supabase.channel("public:customer-display");
    remoteChannel.subscribe();
  }
  return remoteChannel;
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
    // 3. Supabase Realtime — untuk lintas perangkat
    const ch = getRemoteChannel();
    ch.send({ type: "broadcast", event: "display-update", payload });
  } catch (e) {
    console.warn("Customer Display remote broadcast failed:", e);
  }
}

export function clearDisplay() {
  broadcastToDisplay({ state: "idle" });
}
