const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    console.log('⚡ Initialized Supabase Client for RVCE Standalone');
} else {
    console.log('ℹ️ Supabase credentials not found in .env yet. Running in dual-readiness mode.');
}

module.exports = { supabase };
