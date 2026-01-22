-- =============================================
-- PAPER BOX - SUPABASE DATABASE SCHEMA V2
-- =============================================
-- Includes: Orders, Offers, Payment Settings, Comparison Images
-- Run this SQL in your Supabase SQL Editor after the initial schema

-- =============================================
-- OFFERS/COUPON CODES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(100) NOT NULL,
    customer_address TEXT NOT NULL,

    -- Order details
    box_type VARCHAR(100) NOT NULL,
    box_size VARCHAR(100),
    quantity INTEGER NOT NULL CHECK (quantity >= 250),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    -- Offer/discount
    offer_code VARCHAR(50),
    discount_amount DECIMAL(10,2) DEFAULT 0,

    -- Final amounts
    total_amount DECIMAL(10,2) NOT NULL,

    -- Payment
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('full', 'partial')),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('bkash', 'nagad', 'rocket', 'bank', 'cod')),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    due_amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(100),
    payment_proof TEXT,

    -- Status
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),

    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PAYMENT SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_label VARCHAR(255),
    setting_type VARCHAR(50) DEFAULT 'text',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment settings
INSERT INTO payment_settings (setting_key, setting_value, setting_label, setting_type) VALUES
('bkash_merchant', '', 'Bkash Merchant Number', 'text'),
('nagad_merchant', '', 'Nagad Merchant Number', 'text'),
('rocket_merchant', '', 'Rocket Merchant Number', 'text'),
('bank_name', 'City Bank', 'Bank Name', 'text'),
('bank_branch', 'Islampur Branch', 'Bank Branch', 'text'),
('bank_account_name', 'Retrova', 'Account Holder Name', 'text'),
('bank_account_number', '1504181841001', 'Account Number', 'text'),
('partial_payment_percentage', '50', 'Partial Payment Percentage', 'number'),
('min_box_quantity', '250', 'Minimum Box Quantity', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- =============================================
-- COMPARISON IMAGES TABLE (Good vs Bad Packaging)
-- =============================================
CREATE TABLE IF NOT EXISTS comparison_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    good_image TEXT NOT NULL,
    bad_image TEXT NOT NULL,
    good_label VARCHAR(100) DEFAULT 'Good Packaging',
    bad_label VARCHAR(100) DEFAULT 'Bad Packaging',
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparison_images ENABLE ROW LEVEL SECURITY;

-- Offers policies
CREATE POLICY "Offers are viewable by everyone" ON offers
    FOR SELECT USING (true);
CREATE POLICY "Offers are insertable by everyone" ON offers
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Offers are updatable by everyone" ON offers
    FOR UPDATE USING (true);
CREATE POLICY "Offers are deletable by everyone" ON offers
    FOR DELETE USING (true);

-- Orders policies
CREATE POLICY "Orders are viewable by everyone" ON orders
    FOR SELECT USING (true);
CREATE POLICY "Orders are insertable by everyone" ON orders
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders are updatable by everyone" ON orders
    FOR UPDATE USING (true);
CREATE POLICY "Orders are deletable by everyone" ON orders
    FOR DELETE USING (true);

-- Payment settings policies
CREATE POLICY "Payment settings are viewable by everyone" ON payment_settings
    FOR SELECT USING (true);
CREATE POLICY "Payment settings are updatable by everyone" ON payment_settings
    FOR UPDATE USING (true);

-- Comparison images policies
CREATE POLICY "Comparison images are viewable by everyone" ON comparison_images
    FOR SELECT USING (true);
CREATE POLICY "Comparison images are insertable by everyone" ON comparison_images
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Comparison images are updatable by everyone" ON comparison_images
    FOR UPDATE USING (true);
CREATE POLICY "Comparison images are deletable by everyone" ON comparison_images
    FOR DELETE USING (true);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE comparison_images;

-- =============================================
-- INDEXES FOR BETTER PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(code);
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_settings_key ON payment_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_comparison_images_order ON comparison_images(display_order);

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- After running this SQL, the following features are enabled:
-- 1. Offer/Coupon codes with percentage or fixed discounts
-- 2. Orders with full/partial payment support
-- 3. Payment settings for Bkash, Nagad, Rocket, Bank
-- 4. Comparison images for good vs bad packaging
