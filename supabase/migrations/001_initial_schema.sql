-- Campus Bentahan - Initial Database Schema
-- Migration 001: Core tables for authentication, users, and marketplace foundation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
    display_name TEXT,
    university_id TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    rating_avg NUMERIC(3,2),
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10,2) CHECK (original_price >= price),
    condition TEXT NOT NULL CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'REMOVED', 'EXPIRED')),
    images TEXT[] NOT NULL DEFAULT '{}',
    meetup_location_preference UUID,
    view_count INTEGER NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    item_request_id UUID,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_participants CHECK (buyer_id != seller_id)
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'OFFER', 'COUNTER_OFFER', 'SYSTEM', 'IMAGE', 'MEETUP_SCHEDULED', 'TRANSACTION_COMPLETED')),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- OFFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    note TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    item_request_id UUID,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agreed_price NUMERIC(10,2) NOT NULL CHECK (agreed_price > 0),
    meetup_location_id UUID,
    scheduled_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESERVED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED')),
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MEETUP LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS meetup_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    building TEXT,
    floor TEXT,
    room TEXT,
    landmark TEXT,
    security_present BOOLEAN NOT NULL DEFAULT FALSE,
    lighting_condition TEXT NOT NULL DEFAULT 'well_lit' CHECK (lighting_condition IN ('well_lit', 'moderate', 'dim')),
    campus_classification TEXT NOT NULL DEFAULT 'indoor' CHECK (campus_classification IN ('indoor', 'outdoor', 'covered')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_rating CHECK (rater_id != rated_id)
);

-- ============================================================================
-- ITEM REQUESTS TABLE (Looking For)
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    budget_min NUMERIC(10,2),
    budget_max NUMERIC(10,2),
    preferred_meetup_location_id UUID REFERENCES meetup_locations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULFILLED', 'CLOSED', 'EXPIRED')),
    response_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ITEM REQUEST RESPONSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS item_request_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_request_id UUID NOT NULL REFERENCES item_requests(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_response CHECK (responder_id != (SELECT requester_id FROM item_requests WHERE id = item_request_id))
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'NEW_MESSAGE', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED',
        'COUNTER_OFFER', 'TRANSACTION_SCHEDULED', 'MEETUP_REMINDER_24H',
        'MEETUP_REMINDER_1H', 'TRANSACTION_COMPLETED', 'RATING_RECEIVED',
        'ITEM_REQUEST_RESPONSE', 'LISTING_EXPIRING', 'LISTING_SOLD',
        'ADMIN_ACTION', 'SYSTEM'
    )),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- REPORTS/FLAGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('LISTING', 'USER', 'MESSAGE', 'ITEM_REQUEST', 'TRANSACTION')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);

-- Listings
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status_category ON listings(status, category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_created ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_university ON users(id, status); -- for university-scoped queries

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id, last_message_at DESC);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Offers
CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id, status);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_meetup ON transactions(meetup_location_id, scheduled_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- Item Requests
CREATE INDEX IF NOT EXISTS idx_item_requests_status ON item_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_requests_requester ON item_requests(requester_id, status);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS RLS POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- CATEGORIES RLS POLICIES
-- ============================================================================

-- Everyone can view active categories
CREATE POLICY "Everyone can view categories" ON categories
    FOR SELECT USING (true);

-- Only admins can modify categories
CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- LISTINGS RLS POLICIES
-- ============================================================================

-- Everyone can view available listings
CREATE POLICY "Everyone can view available listings" ON listings
    FOR SELECT USING (status = 'AVAILABLE' OR status = 'RESERVED');

-- Users can view their own listings (any status)
CREATE POLICY "Users can view own listings" ON listings
    FOR SELECT USING (seller_id = auth.uid());

-- Users can create their own listings
CREATE POLICY "Users can create listings" ON listings
    FOR INSERT WITH CHECK (seller_id = auth.uid());

-- Users can update their own listings (if not sold/removed/expired)
CREATE POLICY "Users can update own listings" ON listings
    FOR UPDATE USING (
        seller_id = auth.uid()
        AND status NOT IN ('SOLD', 'REMOVED', 'EXPIRED')
    );

-- Users can delete their own listings (soft delete via status)
CREATE POLICY "Users can delete own listings" ON listings
    FOR UPDATE USING (
        seller_id = auth.uid()
        AND status IN ('AVAILABLE', 'RESERVED', 'DRAFT')
    );

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings" ON listings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Participants can view their conversations
CREATE POLICY "Participants can view conversations" ON conversations
    FOR SELECT USING (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

-- Participants can create conversations
CREATE POLICY "Participants can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

-- ============================================================================
-- MESSAGES RLS POLICIES
-- ============================================================================

-- Participants can view messages in their conversations
CREATE POLICY "Participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE id = conversation_id
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );

-- Participants can send messages
CREATE POLICY "Participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversations
            WHERE id = conversation_id
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );

-- ============================================================================
-- OFFERS RLS POLICIES
-- ============================================================================

-- Buyer can view their offers
CREATE POLICY "Buyer can view own offers" ON offers
    FOR SELECT USING (buyer_id = auth.uid());

-- Seller can view offers on their listings
CREATE POLICY "Seller can view offers on listings" ON offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid()
        )
    );

-- Buyers can create offers
CREATE POLICY "Buyers can create offers" ON offers
    FOR INSERT WITH CHECK (
        buyer_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid()
        )
    );

-- Seller can update offer status (accept/reject/counter)
CREATE POLICY "Seller can update offer status" ON offers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM listings WHERE id = listing_id AND seller_id = auth.uid()
        )
    );

-- Buyer can cancel their own offer
CREATE POLICY "Buyer can cancel own offer" ON offers
    FOR UPDATE USING (
        buyer_id = auth.uid() AND status = 'PENDING'
    );

-- ============================================================================
-- TRANSACTIONS RLS POLICIES
-- ============================================================================

-- Buyer and seller can view their transactions
CREATE POLICY "Participants can view transactions" ON transactions
    FOR SELECT USING (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

-- System creates transactions (via trigger from offer acceptance)
CREATE POLICY "System can create transactions" ON transactions
    FOR INSERT WITH CHECK (true);

-- Buyer/seller can update transaction status
CREATE POLICY "Participants can update transactions" ON transactions
    FOR UPDATE USING (
        buyer_id = auth.uid() OR seller_id = auth.uid()
    );

-- ============================================================================
-- MEETUP LOCATIONS RLS POLICIES
-- ============================================================================

-- Everyone can view active meetup locations
CREATE POLICY "Everyone can view active meetup locations" ON meetup_locations
    FOR SELECT USING (is_active = true);

-- Admins can manage meetup locations
CREATE POLICY "Admins can manage meetup locations" ON meetup_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RATINGS RLS POLICIES
-- ============================================================================

-- Everyone can view ratings
CREATE POLICY "Everyone can view ratings" ON ratings
    FOR SELECT USING (true);

-- Users can create ratings for completed transactions they participated in
CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (
        rater_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM transactions
            WHERE id = transaction_id
            AND status = 'COMPLETED'
            AND (buyer_id = auth.uid() OR seller_id = auth.uid())
        )
    );

-- Users can update their own ratings within 24 hours
CREATE POLICY "Users can update own ratings" ON ratings
    FOR UPDATE USING (
        rater_id = auth.uid()
        AND created_at > NOW() - INTERVAL '24 hours'
    );

-- ============================================================================
-- ITEM REQUESTS RLS POLICIES
-- ============================================================================

-- Everyone can view open item requests
CREATE POLICY "Everyone can view open item requests" ON item_requests
    FOR SELECT USING (status = 'OPEN');

-- Requesters can view their own requests
CREATE POLICY "Requesters can view own requests" ON item_requests
    FOR SELECT USING (requester_id = auth.uid());

-- Users can create item requests
CREATE POLICY "Users can create item requests" ON item_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

-- Requesters can update their own requests
CREATE POLICY "Requesters can update own requests" ON item_requests
    FOR UPDATE USING (requester_id = auth.uid());

-- ============================================================================
-- ITEM REQUEST RESPONSES RLS POLICIES
-- ============================================================================

-- Everyone can view responses to open requests
CREATE POLICY "Everyone can view responses" ON item_request_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM item_requests WHERE id = item_request_id AND status = 'OPEN'
        )
    );

-- Requester can view all responses to their request
CREATE POLICY "Requester can view all responses" ON item_request_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM item_requests WHERE id = item_request_id AND requester_id = auth.uid()
        )
    );

-- Responder can view their own responses
CREATE POLICY "Responder can view own responses" ON item_request_responses
    FOR SELECT USING (responder_id = auth.uid());

-- Users can create responses (not to their own requests)
CREATE POLICY "Users can create responses" ON item_request_responses
    FOR INSERT WITH CHECK (
        responder_id = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM item_requests WHERE id = item_request_id AND requester_id = auth.uid()
        )
    );

-- ============================================================================
-- NOTIFICATIONS RLS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- REPORTS RLS POLICIES
-- ============================================================================

-- Reporters can view their own reports
CREATE POLICY "Reporters can view own reports" ON reports
    FOR SELECT USING (reporter_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- AUDIT LOGS RLS POLICIES
-- ============================================================================

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can create audit logs
CREATE POLICY "Admins can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SYSTEM CONFIG RLS POLICIES
-- ============================================================================

-- Everyone can view system config (for feature flags, etc.)
CREATE POLICY "Everyone can view system config" ON system_config
    FOR SELECT USING (true);

-- Only admins can modify system config
CREATE POLICY "Admins can manage system config" ON system_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetup_locations_updated_at BEFORE UPDATE ON meetup_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_requests_updated_at BEFORE UPDATE ON item_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER FOR LISTING VIEW COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_listing_view_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'SELECT' THEN
        UPDATE listings SET view_count = view_count + 1 WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: View count increment is typically handled in application code
-- This trigger approach is for reference only

-- ============================================================================
-- SEED DATA - INITIAL CATEGORIES
-- ============================================================================

INSERT INTO categories (name, slug, icon, position) VALUES
    ('Textbooks', 'textbooks', 'BookOpen', 1),
    ('Electronics', 'electronics', 'Smartphone', 2),
    ('Dorm Essentials', 'dorm-essentials', 'Home', 3),
    ('Clothing & Accessories', 'clothing', 'Shirt', 4),
    ('Sports & Fitness', 'sports', 'Dumbbell', 5),
    ('Services', 'services', 'Tool', 6),
    ('Food & Beverages', 'food', 'Coffee', 7),
    ('Other', 'other', 'Package', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA - INITIAL MEETUP LOCATIONS (10 Required)
-- ============================================================================

INSERT INTO meetup_locations (name, description, building, floor, room, landmark, security_present, lighting_condition, campus_classification, is_active) VALUES
    ('ISU Exit Gate', 'Main campus exit', NULL, NULL, NULL, 'Near main gate', true, 'well_lit', 'outdoor', true),
    ('University Food Court', 'High traffic area with food options', 'Food Court Building', '1', NULL, 'Central dining area', true, 'well_lit', 'indoor', true),
    ('Front Ramon Magsaysay Building', 'Building entrance', 'Ramon Magsaysay Building', '1', NULL, 'Main building entrance', true, 'well_lit', 'outdoor', true),
    ('University Library Ground Floor', 'Library entrance', 'University Library', 'G', NULL, 'Near main entrance', true, 'well_lit', 'indoor', true),
    ('University Library 2nd Floor', 'Study area', 'University Library', '2', NULL, 'Quiet study section', true, 'well_lit', 'indoor', true),
    ('College of Education Old Building', 'Building lobby', 'College of Education Old Building', '1', NULL, 'Old building lobby', false, 'moderate', 'indoor', true),
    ('College of Education New Building', 'Building lobby', 'College of Education New Building', '1', NULL, 'New building lobby', true, 'well_lit', 'indoor', true),
    ('Old Stage', 'Open area', NULL, NULL, NULL, 'Old stage area', false, 'moderate', 'outdoor', true),
    ('University Gymnasium', 'Gym entrance', 'University Gymnasium', '1', NULL, 'Main gym entrance', true, 'well_lit', 'indoor', true),
    ('Admin Building', 'Building lobby', 'Admin Building', '1', NULL, 'Administration building', true, 'well_lit', 'indoor', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA - SYSTEM CONFIG
-- ============================================================================

INSERT INTO system_config (key, value, description) VALUES
    ('site_name', '"Campus Bentahan"', 'Site name displayed in UI'),
    ('university_domain', '"youruniversity.edu"', 'Allowed university email domain'),
    ('listing_expiry_days', '30', 'Days until listing expires'),
    ('max_images_per_listing', '10', 'Maximum images per listing'),
    ('max_image_size_mb', '10', 'Maximum image size in MB'),
    ('offer_expiry_hours', '48', 'Hours until offer expires'),
    ('rating_window_days', '7', 'Days to leave rating after transaction'),
    ('rating_editable_hours', '24', 'Hours to edit rating'),
    ('maintenance_mode', 'false', 'Maintenance mode toggle')
ON CONFLICT (key) DO NOTHING;