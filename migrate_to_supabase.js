require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

const Session = require('./models/Session');
const Interaction = require('./models/Interaction');
const Lead = require('./models/Lead');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('🚀 Starting migration from MongoDB to Supabase...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Migrate Sessions
    const sessions = await Session.find({}).lean();
    console.log(`📦 Found ${sessions.length} sessions in MongoDB`);
    
    if (sessions.length > 0) {
        const mappedSessions = sessions.map(s => ({
            session_id: s.sessionId,
            institute_id: 'rvce',
            landing_page: s.landingPage || '/',
            entry_page: s.entryPage || '/',
            exit_page: s.exitPage || '/',
            page_history: s.pageHistory || [],
            referrer: s.referrer || 'Direct',
            referrer_domain: s.referrerDomain || 'direct',
            utm: s.utm || {},
            geo: s.geo || {},
            device: s.device || {},
            metrics: s.metrics || {},
            dialogue: s.dialogue || [],
            sentiment: s.sentiment || 'Neutral',
            last_intent: s.lastIntent || '',
            is_converted_lead: !!s.isConvertedLead,
            lead_summary: s.leadSummary || {},
            start_time: s.startTime || new Date(),
            last_active: s.lastActive || new Date(),
            created_at: s.createdAt || new Date()
        }));

        // Batch upsert sessions in chunks of 100
        for (let i = 0; i < mappedSessions.length; i += 100) {
            const chunk = mappedSessions.slice(i, i + 100);
            const { error: sessErr } = await supabase.from('sessions').upsert(chunk, { onConflict: 'session_id' });
            if (sessErr) console.error(`Error migrating sessions chunk (${i}-${i+chunk.length}):`, sessErr.message);
        }
        console.log(`✅ Successfully migrated ${mappedSessions.length} sessions to Supabase!`);
    }

    // 2. Migrate Interactions
    const interactions = await Interaction.find({}).lean();
    console.log(`📦 Found ${interactions.length} interactions in MongoDB`);

    if (interactions.length > 0) {
        const mappedInteractions = interactions.map(i => ({
            session_id: i.sessionId,
            institute_id: 'rvce',
            event_type: i.eventType,
            interaction_id: i.interactionId || '',
            query_text: i.queryText || '',
            bot_reply: i.botReply || '',
            page_url: i.pageUrl || '',
            page_path: i.pagePath || '',
            element: i.element || {},
            is_unanswered: !!i.isUnanswered,
            is_resolved: !!i.isResolved,
            resolved_at: i.resolvedAt || null,
            metadata: i.metaData || {},
            created_at: i.createdAt || new Date()
        }));

        // Batch insert in chunks of 100
        for (let i = 0; i < mappedInteractions.length; i += 100) {
            const chunk = mappedInteractions.slice(i, i + 100);
            const { error: intErr } = await supabase.from('interactions').insert(chunk);
            if (intErr) console.error('Error inserting interactions chunk:', intErr.message);
        }
        console.log(`✅ Successfully migrated ${mappedInteractions.length} interactions to Supabase!`);
    }

    // 3. Migrate Leads
    const leads = await Lead.find({}).lean();
    console.log(`📦 Found ${leads.length} leads in MongoDB`);

    if (leads.length > 0) {
        const mappedLeads = leads.map(l => ({
            session_id: l.sessionId,
            institute_id: 'rvce',
            name: l.name || 'Candidate',
            phone: l.phone || '',
            email: l.email || '',
            status: l.status || 'New',
            notes: l.notes || '',
            score: l.score || 85,
            lead_data: l.leadData || {},
            attribution: l.attribution || {},
            geo: l.geo || {},
            device: l.device || {},
            created_at: l.createdAt || new Date()
        }));

        const { error: leadErr } = await supabase.from('leads').insert(mappedLeads);
        if (leadErr) console.error('Error migrating leads:', leadErr.message);
        else console.log(`✅ Successfully migrated ${mappedLeads.length} leads to Supabase!`);
    }

    console.log('🎉 Migration to Supabase Complete!');
    process.exit(0);
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
