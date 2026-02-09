-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL, -- Changed from UUID to BIGINT
    quantity INTEGER NOT NULL DEFAULT 1,
    reservation_expires_at TIMESTAMP WITH TIME ZONE, -- Optional for future use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, variant_id)
);

-- Index for faster lookups
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
