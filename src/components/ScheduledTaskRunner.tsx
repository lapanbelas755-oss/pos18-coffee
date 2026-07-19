import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendTelegramMessage } from '../lib/telegram';

export default function ScheduledTaskRunner() {
  useEffect(() => {
    const checkAndRunTasks = async () => {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const todayDateStr = now.toLocaleDateString('id-ID');

      // 1. Daily Report at 23:00
      if (hour === 23 && minute === 0) {
        const lastSentDate = localStorage.getItem('daily_report_sent_date');
        
        if (lastSentDate !== todayDateStr) {
          try {
            await sendDailyReport();
            localStorage.setItem('daily_report_sent_date', todayDateStr);
          } catch (err) {
            console.error("Failed to send daily report", err);
          }
        }
      }
    };

    const intervalId = setInterval(checkAndRunTasks, 60000); // Check every minute
    checkAndRunTasks(); // Also check on mount

    return () => clearInterval(intervalId);
  }, []);

  const sendDailyReport = async () => {
    const now = new Date();
    const todayStr = now.toDateString();
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Fetch transactions
    const { data: allTxs } = await supabase.from('transactions').select('*');
    if (!allTxs) return;

    // Helper: parse berbagai format tanggal ke objek Date (sama dengan Dashboard)
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      const iso = new Date(dateStr);
      if (!isNaN(iso.getTime())) return iso;
      const parts = dateStr.split(/[\/\-]/);
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
      return null;
    };

    // Filter today
    const todayTxs = allTxs.filter(t => parseDate(t.date)?.toDateString() === todayStr);
    const todayIncome = todayTxs.filter(t => t.type === 'inflow').reduce((sum, t) => sum + (t.amount || 0), 0);
    const todayCogs = todayTxs.filter(t => t.type === 'outflow').reduce((sum, t) => sum + (t.amount || 0), 0);
    const todayProfit = todayIncome - todayCogs;

    // Filter yesterday
    const yesterdayTxs = allTxs.filter(t => parseDate(t.date)?.toDateString() === yesterdayStr);
    const yesterdayIncome = yesterdayTxs.filter(t => t.type === 'inflow').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate drop
    const isDrop = todayIncome < yesterdayIncome;
    const diff = Math.abs(todayIncome - yesterdayIncome);
    const diffPercent = yesterdayIncome > 0 ? (diff / yesterdayIncome) * 100 : 0;

    let message = `📊 <b>LAPORAN HARIAN [${todayDateString(now)}]</b> 📊\n\n`;
    message += `💰 <b>Pendapatan:</b> Rp ${todayIncome.toLocaleString('id-ID')}\n`;
    message += `📉 <b>Pengeluaran (HPP):</b> Rp ${todayCogs.toLocaleString('id-ID')}\n`;
    message += `💵 <b>Laba Bersih:</b> Rp ${todayProfit.toLocaleString('id-ID')}\n\n`;

    if (isDrop && yesterdayIncome > 0) {
      message += `🔻 <b>PERINGATAN PENJUALAN TURUN</b>\n`;
      message += `Penjualan hari ini turun <b>${diffPercent.toFixed(1)}% (Rp ${diff.toLocaleString('id-ID')})</b> dibanding kemarin (Rp ${yesterdayIncome.toLocaleString('id-ID')}).\n\n`;
    } else if (todayIncome > yesterdayIncome) {
      message += `📈 <b>PENJUALAN NAIK</b>\n`;
      message += `Naik <b>${diffPercent.toFixed(1)}%</b> dibanding kemarin.\n\n`;
    }

    // Check shift status
    const shiftDataStr = localStorage.getItem("current_shift");
    if (shiftDataStr) {
      const shiftData = JSON.parse(shiftDataStr);
      if (shiftData.isOpen) {
        message += `⚠️ <b>PERINGATAN: KASIR BELUM CLOSING SHIFT</b>\n`;
        message += `Shift atas nama <b>${shiftData.staff}</b> masih berstatus AKTIF sejak ${new Date(shiftData.openedAt).toLocaleTimeString('id-ID')}.\n\n`;
      }
    }

    await sendTelegramMessage(message);
  };

  const todayDateString = (d: Date) => {
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return null;
}
