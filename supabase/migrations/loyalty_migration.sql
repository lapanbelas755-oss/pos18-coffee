-- Migration for Loyalty Member System

-- 1. Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_code VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR NOT NULL,
    phone VARCHAR UNIQUE NOT NULL,
    email VARCHAR,
    birthday DATE,
    level VARCHAR DEFAULT 'Bronze',
    total_point INTEGER DEFAULT 0,
    total_spending NUMERIC DEFAULT 0,
    total_transaction INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create member_point_history table
CREATE TABLE IF NOT EXISTS public.member_point_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    order_id VARCHAR NOT NULL,
    type VARCHAR NOT NULL, -- Earn / Redeem / Adjust / Birthday
    point INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_order_point_claim UNIQUE (member_id, order_id) -- Prevent double point claim per order
);

-- 3. Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reward_name VARCHAR NOT NULL,
    required_point INTEGER NOT NULL,
    reward_type VARCHAR NOT NULL, -- Product / Discount / Voucher
    reward_value VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create loyalty_settings table (singleton pattern)
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    point_per_amount NUMERIC DEFAULT 10000,
    point_expired_month INTEGER DEFAULT 12,
    birthday_bonus INTEGER DEFAULT 0,
    minimum_redeem INTEGER DEFAULT 0,
    level_bronze_max INTEGER DEFAULT 199,
    level_silver_max INTEGER DEFAULT 499,
    level_gold_max INTEGER DEFAULT 999,
    double_point_day VARCHAR, -- comma separated days like "Monday,Friday"
    double_point_time VARCHAR, -- HH:mm-HH:mm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exist
INSERT INTO public.loyalty_settings (id, point_per_amount, level_bronze_max, level_silver_max, level_gold_max)
VALUES (1, 10000, 199, 499, 999)
ON CONFLICT (id) DO NOTHING;

-- Insert default rewards
INSERT INTO public.loyalty_rewards (reward_name, required_point, reward_type, reward_value)
VALUES 
    ('Espresso', 100, 'Product', 'Espresso'),
    ('Americano', 150, 'Product', 'Americano'),
    ('Cafe Latte', 250, 'Product', 'Cafe Latte'),
    ('Voucher Rp50.000', 500, 'Voucher', '50000')
ON CONFLICT DO NOTHING;
