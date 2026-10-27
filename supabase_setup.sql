-- ========================================================
-- RVCE CHATBOT & CLARITY TELEMETRY SUPABASE SCHEMA v2.0
-- ========================================================

-- 1. SESSIONS TABLE (Clarity Visitor Journey, Environment & Dialogue)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    institute_id TEXT DEFAULT 'rvce',
    
    -- Entry & Exit Navigation (Microsoft Clarity)
    landing_page TEXT DEFAULT '/',
    entry_page TEXT DEFAULT '/',
    exit_page TEXT DEFAULT '/',
    page_history JSONB DEFAULT '[]'::jsonb,
    
    -- Attribution & Referrer
    referrer TEXT DEFAULT 'Direct',
    referrer_domain TEXT DEFAULT 'direct',
    utm JSONB DEFAULT '{}'::jsonb,
    
    -- Geo Location (Enriched from IP)
    geo JSONB DEFAULT '{
        "country": "India",
        "country_code": "IN",
        "region": "Karnataka",
        "city": "Bengaluru"
    }'::jsonb,
    
    -- Device & Browser Fingerprint
    device JSONB DEFAULT '{
        "type": "Desktop",
        "os": "Windows",
        "browser": "Chrome",
        "screen": "1920x1080",
        "viewport": "1920x1080"
    }'::jsonb,
    
    -- Clarity UX Behavioral Signals
    metrics JSONB DEFAULT '{
        "event_count": 0,
        "message_count": 0,
        "click_count": 0,
        "rage_clicks": 0,
        "dead_clicks": 0,
        "max_scroll_depth": 0,
        "dwell_seconds": 0,
        "frustration_score": 0
    }'::jsonb,
    
    -- Dialogue stream for visual chat replay
    dialogue JSONB DEFAULT '[]'::jsonb,
    
    sentiment TEXT DEFAULT 'Neutral',
    last_intent TEXT DEFAULT '',
    is_converted_lead BOOLEAN DEFAULT FALSE,
    lead_summary JSONB DEFAULT '{}'::jsonb,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning-fast Clarity analytics
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_is_lead ON sessions(is_converted_lead);
CREATE INDEX IF NOT EXISTS idx_sessions_geo_city ON sessions((geo->>'city'));
CREATE INDEX IF NOT EXISTS idx_sessions_referrer ON sessions(referrer);

-- 2. INTERACTIONS TABLE (Event Stream & Chat Messages)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    institute_id TEXT DEFAULT 'rvce',
    event_type TEXT NOT NULL,           -- 'message', 'click', 'rage_click', 'dead_click', 'page_visit', 'scroll', 'copy'
    interaction_id TEXT DEFAULT '',     -- intent name, element ID, or action tag
    query_text TEXT DEFAULT '',         -- user message or button label
    bot_reply TEXT DEFAULT '',          -- bot response
    page_url TEXT DEFAULT '',
    page_path TEXT DEFAULT '',
    element JSONB DEFAULT '{}'::jsonb,  -- tag, id, class, text, isDeadClick
    is_unanswered BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb, -- custom parameters & bot replies
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_session_id ON interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_interactions_event_type ON interactions(event_type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_unanswered ON interactions(is_unanswered, is_resolved);

-- 3. LEADS TABLE (Captured Inquiries with CRM Pipeline Status)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    institute_id TEXT DEFAULT 'rvce',
    name TEXT DEFAULT 'Candidate',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    status TEXT DEFAULT 'New',          -- 'New', 'Contacted', 'Qualified', 'Enrolled'
    notes TEXT DEFAULT '',
    score INT DEFAULT 85,
    lead_data JSONB DEFAULT '{}'::jsonb,
    attribution JSONB DEFAULT '{}'::jsonb, -- entry_page, referrer, utm
    geo JSONB DEFAULT '{}'::jsonb,         -- city, region, country
    device JSONB DEFAULT '{}'::jsonb,      -- device type, browser, os
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- 4. ENABLE REALTIME SUBSCRIPTIONS (IDEMPOTENT)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class pc ON pr.prrelid = pc.oid
        JOIN pg_publication pp ON pr.prpubid = pp.oid
        WHERE pp.pubname = 'supabase_realtime' AND pc.relname = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class pc ON pr.prrelid = pc.oid
        JOIN pg_publication pp ON pr.prpubid = pp.oid
        WHERE pp.pubname = 'supabase_realtime' AND pc.relname = 'interactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_rel pr
        JOIN pg_class pc ON pr.prrelid = pc.oid
        JOIN pg_publication pp ON pr.prpubid = pp.oid
        WHERE pp.pubname = 'supabase_realtime' AND pc.relname = 'leads'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE leads;
    END IF;
END $$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous log inserts" ON interactions;
DROP POLICY IF EXISTS "Allow anonymous session upserts" ON sessions;
DROP POLICY IF EXISTS "Allow anonymous lead inserts" ON leads;
DROP POLICY IF EXISTS "Allow dashboard access" ON interactions;
DROP POLICY IF EXISTS "Allow dashboard session access" ON sessions;
DROP POLICY IF EXISTS "Allow dashboard lead access" ON leads;

CREATE POLICY "Allow anonymous log inserts" ON interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous session upserts" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous lead inserts" ON leads FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow dashboard access" ON interactions FOR ALL USING (true);
CREATE POLICY "Allow dashboard session access" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow dashboard lead access" ON leads FOR ALL USING (true);

-- 6. GRANT TABLE PERMISSIONS TO API ROLES (REQUIRED FOR POSTGREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
