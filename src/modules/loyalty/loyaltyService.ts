import { supabase } from '../../lib/supabase';
import { LoyaltyMember, LoyaltySettings } from '../../types';

export const loyaltyService = {
  /**
   * Cari member berdasarkan nomor HP
   */
  async searchMember(phone: string): Promise<LoyaltyMember | null> {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'Aktif')
      .single();

    if (error || !data) return null;
    return data as LoyaltyMember;
  },

  /**
   * Daftarkan member baru
   */
  async createMember(name: string, phone: string, birthday?: string): Promise<LoyaltyMember | null> {
    const memberCode = `LB-${Math.floor(10000 + Math.random() * 90000)}`;
    
    const newMember = {
      member_code: memberCode,
      full_name: name,
      phone,
      birthday: birthday || null,
      level: 'Bronze',
      total_point: 0,
      total_spending: 0,
      total_transaction: 0,
      status: 'Aktif'
    };

    const { data, error } = await supabase
      .from('members')
      .insert([newMember])
      .select()
      .single();

    if (error) {
      console.error('Error creating member:', error);
      throw new Error(error.message);
    }
    if (!data) return null;
    return data as LoyaltyMember;
  },

  /**
   * Dapatkan konfigurasi loyalty settings (point per amount, dll)
   */
  async getSettings(): Promise<LoyaltySettings | null> {
    const { data, error } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('Error fetching loyalty settings:', error);
      return null;
    }
    return data as LoyaltySettings;
  },

  /**
   * Kalkulasi dan berikan poin setelah order berhasil
   * Harus idempotent berdasarkan orderId (supaya tidak dobel)
   */
  async calculateAndAwardPoint(orderId: string, totalAmount: number, memberId: string): Promise<boolean> {
    try {
      // 1. Get Settings
      const settings = await this.getSettings();
      if (!settings) return false;

      // 2. Calculate Point
      const pointsEarned = Math.floor(totalAmount / settings.point_per_amount);
      if (pointsEarned <= 0) return true; // No points to award, but successful flow

      // 3. Get Current Member Data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();
        
      if (memberError || !memberData) return false;
      const member = memberData as LoyaltyMember;

      const newBalance = member.total_point + pointsEarned;
      const newTotalSpending = Number(member.total_spending) + totalAmount;
      const newTotalTransaction = member.total_transaction + 1;

      // 4. Update Level Logic
      let newLevel = member.level;
      if (newTotalSpending > settings.level_gold_max * settings.point_per_amount) {
        newLevel = 'Platinum';
      } else if (newTotalSpending > settings.level_silver_max * settings.point_per_amount) {
        newLevel = 'Gold';
      } else if (newTotalSpending > settings.level_bronze_max * settings.point_per_amount) {
        newLevel = 'Silver';
      }

      // 5. Save History & Update Member (using individual queries to avoid race condition)
      // Note: Idealnya menggunakan RPC / database transaction, namun kita simulasi lewat client dengan safe insert.
      
      const historyRecord = {
        member_id: memberId,
        order_id: orderId,
        type: 'Earn',
        point: pointsEarned,
        balance_after: newBalance,
        description: `Earned from transaction ${orderId}`
      };

      const { error: historyError } = await supabase
        .from('member_point_history')
        .insert([historyRecord]);

      if (historyError) {
        // If history fails, likely a unique constraint violation (duplicate orderId)
        console.warn('Point already awarded for this order or history insert failed', historyError);
        return false;
      }

      // If history insert success, update member
      await supabase
        .from('members')
        .update({
          total_point: newBalance,
          total_spending: newTotalSpending,
          total_transaction: newTotalTransaction,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      return true;

    } catch (err) {
      console.error('Error calculating and awarding points:', err);
      return false;
    }
  }
};
