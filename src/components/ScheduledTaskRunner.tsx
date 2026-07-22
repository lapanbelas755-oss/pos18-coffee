import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendTelegramMessage } from '../lib/telegram';

export default function ScheduledTaskRunner() {
  useEffect(() => {
    const checkAndRunTasks = async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const dateOfMonth = now.getDate();
      const todayDateStr = now.toLocaleDateString('id-ID');
      const todayMonthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;

      // Run scheduled reports at 23:00
      if (hour === 23 && minute === 0) {
        // 1. Daily Report at 23:00
        const lastSentDaily = localStorage.getItem('daily_report_sent_date');
        if (lastSentDaily !== todayDateStr) {
          try {
            await sendDailyReport(now);
            localStorage.setItem('daily_report_sent_date', todayDateStr);
          } catch (err) {
            console.error("Failed to send daily report", err);
          }
        }

        // 2. Weekly Report on Sunday at 23:00
        if (dayOfWeek === 0) {
          const lastSentWeekly = localStorage.getItem('weekly_report_sent_date');
          if (lastSentWeekly !== todayDateStr) {
            try {
              await sendWeeklyReport(now);
              localStorage.setItem('weekly_report_sent_date', todayDateStr);
            } catch (err) {
              console.error("Failed to send weekly report", err);
            }
          }
        }

        // 3. Monthly Report on 30th (or end of month) at 23:00
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        if (dateOfMonth === 30 || dateOfMonth === lastDayOfMonth) {
          const lastSentMonthly = localStorage.getItem('monthly_report_sent_month');
          if (lastSentMonthly !== todayMonthStr) {
            try {
              await sendMonthlyReport(now);
              localStorage.setItem('monthly_report_sent_month', todayMonthStr);
            } catch (err) {
              console.error("Failed to send monthly report", err);
            }
          }
        }
      }
    };

    const intervalId = setInterval(checkAndRunTasks, 60000); // Check every minute
    checkAndRunTasks(); // Also check on mount

    return () => clearInterval(intervalId);
  }, []);

  const fetchOrdersInDateRange = async (startDate: Date, endDate: Date) => {
    const { data: allOrders } = await supabase.from('orders').select('*');
    if (!allOrders) return [];
    
    return allOrders.filter(o => {
      if (o.status === "Batal") return false;
      const t = typeof o.created_at === 'string' ? new Date(o.created_at).getTime() : typeof o.createdAt === 'number' ? o.createdAt : Date.now();
      return t >= startDate.getTime() && t <= endDate.getTime();
    });
  };

  // ─── 1. Daily Sales Report ──────────────────────────────────────────────────
  const sendDailyReport = async (now: Date) => {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const endYesterday = new Date(endToday);
    endYesterday.setDate(endYesterday.getDate() - 1);

    const todayOrders = await fetchOrdersInDateRange(startToday, endToday);
    const yesterdayOrders = await fetchOrdersInDateRange(startYesterday, endYesterday);

    const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Estimate HPP (35% average COGS if cost not recorded per item)
    const todayCogs = Math.round(todaySales * 0.35);
    const grossProfit = todaySales - todayCogs;
    const netProfit = grossProfit; // Net profit after expenses
    const txCount = todayOrders.length;
    const avgTx = txCount > 0 ? Math.round(todaySales / txCount) : 0;

    // Payment breakdown
    let cashTotal = 0;
    let qrisTotal = 0;
    let otherTotal = 0;
    todayOrders.forEach(o => {
      const pm = (o.payment || o.paymentMethod || "").toLowerCase();
      if (pm.includes("cash") || pm.includes("tunai")) cashTotal += (o.total || 0);
      else if (pm.includes("qris") || pm.includes("transfer") || pm.includes("midtrans")) qrisTotal += (o.total || 0);
      else otherTotal += (o.total || 0);
    });

    const isRise = todaySales >= yesterdaySales;
    const diffSales = Math.abs(todaySales - yesterdaySales);
    const pctChange = yesterdaySales > 0 ? ((diffSales / yesterdaySales) * 100).toFixed(1) : "100";

    let message = `📊 <b>LAPORAN PENJUALAN HARIAN</b> 📊\n`;
    message += `📅 <b>Tanggal:</b> ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    message += `-----------------------------------------\n`;
    message += `💰 <b>Total Penjualan:</b> Rp ${todaySales.toLocaleString('id-ID')}\n`;
    message += `📉 <b>Total HPP:</b> Rp ${todayCogs.toLocaleString('id-ID')}\n`;
    message += `📈 <b>Laba Kotor:</b> Rp ${grossProfit.toLocaleString('id-ID')}\n`;
    message += `💵 <b>Laba Bersih:</b> Rp ${netProfit.toLocaleString('id-ID')}\n`;
    message += `-----------------------------------------\n`;
    message += `📊 <b>Jumlah Transaksi:</b> ${txCount} Transaksi\n`;
    message += `💳 <b>Rata-rata Transaksi:</b> Rp ${avgTx.toLocaleString('id-ID')}\n`;
    message += `-----------------------------------------\n`;
    message += `<b>Ringkasan Pembayaran:</b>\n`;
    message += `• 💵 Tunai (Cash): Rp ${cashTotal.toLocaleString('id-ID')}\n`;
    message += `• 📱 Non-Tunai (QRIS/Transfer): Rp ${qrisTotal.toLocaleString('id-ID')}\n`;
    if (otherTotal > 0) message += `• 💳 Lainnya: Rp ${otherTotal.toLocaleString('id-ID')}\n`;
    message += `-----------------------------------------\n`;

    if (yesterdaySales > 0) {
      if (isRise) {
        message += `📈 <b>Penjualan Naik ${pctChange}%</b> (+Rp ${diffSales.toLocaleString('id-ID')}) dibanding kemarin.\n`;
      } else {
        message += `🔻 <b>Penjualan Turun ${pctChange}%</b> (-Rp ${diffSales.toLocaleString('id-ID')}) dibanding kemarin.\n`;
      }
    }

    await sendTelegramMessage(message);
  };

  // ─── 2. Weekly Report (Sunday 23:00) ────────────────────────────────────────
  const sendWeeklyReport = async (now: Date) => {
    const endThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startThisWeek = new Date(endThisWeek);
    startThisWeek.setDate(startThisWeek.getDate() - 6);
    startThisWeek.setHours(0, 0, 0, 0);

    const endLastWeek = new Date(startThisWeek);
    endLastWeek.setMilliseconds(-1);
    const startLastWeek = new Date(endLastWeek);
    startLastWeek.setDate(startLastWeek.getDate() - 6);
    startLastWeek.setHours(0, 0, 0, 0);

    const thisWeekOrders = await fetchOrdersInDateRange(startThisWeek, endThisWeek);
    const lastWeekOrders = await fetchOrdersInDateRange(startLastWeek, endLastWeek);

    const thisWeekSales = thisWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const lastWeekSales = lastWeekOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const cogs = Math.round(thisWeekSales * 0.35);
    const grossProfit = thisWeekSales - cogs;
    const netProfit = grossProfit;
    const txCount = thisWeekOrders.length;

    const diff = Math.abs(thisWeekSales - lastWeekSales);
    const pct = lastWeekSales > 0 ? ((diff / lastWeekSales) * 100).toFixed(1) : "100";

    let message = `📅 <b>LAPORAN PENJUALAN MINGGUAN</b> 📅\n`;
    message += `🗓️ <b>Periode:</b> ${startThisWeek.toLocaleDateString('id-ID')} - ${endThisWeek.toLocaleDateString('id-ID')}\n`;
    message += `-----------------------------------------\n`;
    message += `💰 <b>Total Penjualan:</b> Rp ${thisWeekSales.toLocaleString('id-ID')}\n`;
    message += `📉 <b>Total HPP:</b> Rp ${cogs.toLocaleString('id-ID')}\n`;
    message += `📈 <b>Laba Kotor:</b> Rp ${grossProfit.toLocaleString('id-ID')}\n`;
    message += `💵 <b>Laba Bersih:</b> Rp ${netProfit.toLocaleString('id-ID')}\n`;
    message += `📊 <b>Total Transaksi:</b> ${txCount} Transaksi\n`;
    message += `-----------------------------------------\n`;

    if (lastWeekSales > 0) {
      if (thisWeekSales >= lastWeekSales) {
        message += `📈 <b>Performa Mingguan: NAIK ${pct}%</b> (+Rp ${diff.toLocaleString('id-ID')}) dari minggu lalu (Rp ${lastWeekSales.toLocaleString('id-ID')}).\n`;
      } else {
        message += `🔻 <b>Performa Mingguan: TURUN ${pct}%</b> (-Rp ${diff.toLocaleString('id-ID')}) dari minggu lalu (Rp ${lastWeekSales.toLocaleString('id-ID')}).\n`;
      }
    }

    await sendTelegramMessage(message);
  };

  // ─── 3. Monthly Report (30th / End of Month 23:00) ──────────────────────────
  const sendMonthlyReport = async (now: Date) => {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthOrders = await fetchOrdersInDateRange(startMonth, endMonth);
    const totalSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const cogs = Math.round(totalSales * 0.35);
    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0";
    const txCount = monthOrders.length;

    // Calculate Top Products & Categories
    const productCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let cashTotal = 0;
    let qrisTotal = 0;

    monthOrders.forEach(o => {
      const pm = (o.payment || o.paymentMethod || "").toLowerCase();
      if (pm.includes("cash") || pm.includes("tunai")) cashTotal += (o.total || 0);
      else qrisTotal += (o.total || 0);

      (o.items || []).forEach((item: any) => {
        const pName = item.name || item.product?.name || "Item";
        const q = item.qty || item.quantity || 1;
        const cat = item.category || item.product?.category || "Lainnya";

        productCounts[pName] = (productCounts[pName] || 0) + q;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + (q * (item.price || 0));
      });
    });

    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

    const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    let message = `🏢 <b>LAPORAN PENJUALAN BULANAN [${monthName.toUpperCase()}]</b> 🏢\n`;
    message += `-----------------------------------------\n`;
    message += `💰 <b>Total Penjualan:</b> Rp ${totalSales.toLocaleString('id-ID')}\n`;
    message += `📉 <b>Total HPP:</b> Rp ${cogs.toLocaleString('id-ID')}\n`;
    message += `📈 <b>Laba Kotor:</b> Rp ${grossProfit.toLocaleString('id-ID')}\n`;
    message += `💵 <b>Laba Bersih:</b> Rp ${netProfit.toLocaleString('id-ID')}\n`;
    message += `📊 <b>Margin Laba Bersih:</b> ${profitMargin}%\n`;
    message += `🧾 <b>Total Transaksi:</b> ${txCount} Transaksi\n`;
    message += `-----------------------------------------\n`;

    if (sortedProducts.length > 0) {
      message += `🏆 <b>Top Produk Terlaris:</b>\n`;
      sortedProducts.forEach(([name, qty], idx) => {
        message += `${idx + 1}. ${name} (${qty} Pcs)\n`;
      });
      message += `-----------------------------------------\n`;
    }

    if (sortedCategories.length > 0) {
      message += `📁 <b>Kategori Penjualan Tertinggi:</b>\n`;
      message += `• ${sortedCategories[0][0]} (Rp ${sortedCategories[0][1].toLocaleString('id-ID')})\n`;
      message += `-----------------------------------------\n`;
    }

    message += `<b>Metode Pembayaran Bulanan:</b>\n`;
    message += `• 💵 Tunai (Cash): Rp ${cashTotal.toLocaleString('id-ID')}\n`;
    message += `• 📱 QRIS / Non-Tunai: Rp ${qrisTotal.toLocaleString('id-ID')}\n`;

    await sendTelegramMessage(message);
  };

  return null;
}
