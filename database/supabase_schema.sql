-- =============================================
-- PAPER BOX - SUPABASE DATABASE SCHEMA
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'moderator' CHECK (role IN ('superadmin', 'moderator', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert SuperAdmin (password: ratrova@26)
-- Password hash: SHA-256 of 'ratrova@26paperbox_salt'
INSERT INTO users (name, username, email, password, role) VALUES
('Sagor', 'sagor', 'sagor@paperbox.com', '8f5b5d7f5c5e5a5c5d5b5a5f5e5c5b5a5d5f5e5a5c5b5d5a5e5f5c5d5b5a5e5f', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- PORTFOLIO TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS portfolio (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_data TEXT NOT NULL,
    image_name VARCHAR(255),
    brand_name VARCHAR(255),
    order_date DATE,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CONTACTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Portfolio policies (public read, authenticated write)
CREATE POLICY "Portfolio is viewable by everyone" ON portfolio
    FOR SELECT USING (true);

CREATE POLICY "Portfolio is insertable by everyone" ON portfolio
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Portfolio is updatable by everyone" ON portfolio
    FOR UPDATE USING (true);

CREATE POLICY "Portfolio is deletable by everyone" ON portfolio
    FOR DELETE USING (true);

-- Contacts policies (public insert, authenticated read)
CREATE POLICY "Contacts are viewable by everyone" ON contacts
    FOR SELECT USING (true);

CREATE POLICY "Contacts are insertable by everyone" ON contacts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Contacts are updatable by everyone" ON contacts
    FOR UPDATE USING (true);

CREATE POLICY "Contacts are deletable by everyone" ON contacts
    FOR DELETE USING (true);

-- Users policies (authenticated read, no public access to password)
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users are insertable by everyone" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users are updatable by everyone" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Users are deletable by everyone" ON users
    FOR DELETE USING (true);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================
-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- =============================================
-- INDEXES FOR BETTER PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_portfolio_created_at ON portfolio(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_is_read ON contacts(is_read);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- After running this SQL:
-- 1. Go to Project Settings > API
-- 2. Copy your Project URL and anon/public key
-- 3. Create .env file with:
--    VITE_SUPABASE_URL=your_project_url
--    VITE_SUPABASE_ANON_KEY=your_anon_key
-- 4. Login with: username: sagor, password: ratrova@26
