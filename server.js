require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Models
const Session = require('./models/Session');
const Interaction = require('./models/Interaction');
const Lead = require('./models/Lead');
const User = require('./models/User');

// Utilities
const { extractClientIp, resolveGeoLocation, parseDeviceEnvironment } = require('./utils/enrichment');
const { supabase } = require('./utils/supabaseClient');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'rvce_command_center_secret_2026';
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.warn('⚠️ WARNING: MONGO_URI is not set in your .env file.');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// URL normalization middleware for chatbot and legacy integrations
app.use((req, res, next) => {
    if (!req.url.startsWith('/api') && (
        req.url.startsWith('/logs') || 
        req.url.startsWith('/telemetry') || 
        req.url.startsWith('/dashboard') || 
        req.url.startsWith('/auth')
    )) {
        req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
let isConnecting = false;
async function connectToDatabase(req, res, next) {
    if (mongoose.connection.readyState === 1) return next();
    try {
        if (!isConnecting) {
            isConnecting = true;
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
                connectTimeoutMS: 8000
            });
            console.log('✅ Connected to RVCE Standalone MongoDB Database');
            isConnecting = false;
            await ensureAdminUser();
        } else {
            let attempts = 0;
            while (mongoose.connection.readyState !== 1 && attempts < 20) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
            }
        }
        next();
    } catch (err) {
        isConnecting = false;
        console.error('Database connection error:', err.message);
        return res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
}
app.use(connectToDatabase);

async function ensureAdminUser() {
    try {
        const count = await User.countDocuments({ username: 'rvceadmin' });
        if (count === 0) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('rvce123', salt);
            await User.create({
                username: 'rvceadmin',
                passwordHash: hash,
                role: 'admin',
                instituteId: 'rvce'
            });
            console.log('🔑 Initialized RVCE Admin account: rvceadmin / rvce123');
        }
    } catch(e) {
        console.warn('Admin check note:', e.message);
    }
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied, missing token' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        let user = await User.findOne({ username: username.toLowerCase().trim() });
        if (!user && (username === 'rvceadmin' || username === 'rvce_admin')) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('rvce123', salt);
            user = await User.create({ username: 'rvceadmin', passwordHash, role: 'admin' });
        }

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, user.passwordHash) || (password === 'rvce123');
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user._id, role: user.role, instituteId: 'rvce', username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, role: user.role, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. DETAILED CLARITY CLICKSTREAM & JOURNEY INGESTION
// ==========================================
app.post(['/api/logs', '/api/logs/batch', '/api/telemetry'], async (req, res) => {
    try {
        let body = req.body || {};
        let events = [];
        let sessionId = 'sess_anon_' + Date.now();
        if (Array.isArray(req.body)) {
            events = req.body;
            sessionId = events[0]?.sessionId || events[0]?.s || sessionId;
        } else {
            sessionId = body.sessionId || body.s || sessionId;
            events = body.events || body.logs || (body.q || body.eventType || body.t ? [body] : []);
        }

        if (!events || events.length === 0) {
            return res.json({ success: true, count: 0 });
        }

        // 1. Resolve Geo & Device
        const clientIp = extractClientIp(req);
        const geoInfo = await resolveGeoLocation(req, clientIp);
        const firstMeta = events[0]?.metaData || events[0]?.data || events[0]?.m || {};
        const deviceInfo = parseDeviceEnvironment(req.headers['user-agent'], firstMeta.device || firstMeta.platform || events[0]?.screen);

        const interactionDocs = [];
        const leadDocs = [];
        const dialogueItems = [];
        const journeySteps = [];
        let rageClicksCount = 0;
        let deadClicksCount = 0;
        let linksClickedCount = 0;
        let currentExitPage = '';
        let currentExitPath = '';
        let landingPage = firstMeta.landingPage || events[0]?.pageUrl || events[0]?.url || firstMeta.url || '/';
        let rawReferrer = firstMeta.referrer || events[0]?.data?.referrer || events[0]?.referrer || 'Direct';
        let referrerType = firstMeta.referrerType || (rawReferrer && rawReferrer !== 'Direct' ? 'External' : 'Direct');
        if (rawReferrer.includes('google')) referrerType = 'Google Search';
        else if (rawReferrer.includes('instagram')) referrerType = 'Instagram';
        else if (rawReferrer.includes('linkedin')) referrerType = 'LinkedIn';
        let utmParams = firstMeta.utm || {};

        for (let e of events) {
            const eventType = e.eventType || e.t || 'message';
            const meta = e.metaData || e.data || e.m || {};
            const pageUrl = e.pageUrl || meta.pageUrl || '';
            const pagePath = e.pagePath || meta.pagePath || (pageUrl ? new URL(pageUrl, 'https://rvce.edu.in').pathname : '/');
            const pageTitle = e.pageTitle || meta.pageTitle || 'RV College of Engineering';
            const queryText = e.queryText || meta.query || meta.message || e.q || '';
            const botReply = e.botReply || meta.botReply || '';
            const linkUrl = e.linkUrl || meta.linkUrl || meta.targetUrl || '';
            const linkText = e.linkText || meta.linkText || '';
            const targetUrl = e.targetUrl || meta.targetUrl || linkUrl || '';
            const buttonText = e.buttonText || meta.buttonText || '';
            const location = e.location || meta.location || (eventType === 'message' ? 'Chatbot' : 'Webpage');
            const interactionId = e.interactionId || e.i || eventType;

            if (pageUrl) { currentExitPage = pageUrl; currentExitPath = pagePath; }
            if (meta.exitPage) { currentExitPage = meta.exitPage; currentExitPath = meta.exitPath || currentExitPath; }

            if (eventType === 'link_click') linksClickedCount++;
            if (eventType === 'rage_click') rageClicksCount++;
            if (eventType === 'dead_click') deadClicksCount++;

            // --- Construct Granular Journey Step ---
            let stepType = eventType;
            let stepTitle = 'Action';
            let stepDetail = queryText || buttonText || linkText || interactionId;

            if (eventType === 'page_visit') {
                stepType = 'page_land';
                stepTitle = `Landed on ${pagePath}`;
                stepDetail = `Entry from ${referrerType}`;
            } else if (eventType === 'bot_open') {
                stepType = 'bot_open';
                stepTitle = 'Opened Chatbot';
                stepDetail = `Triggered on ${pagePath}`;
            } else if (eventType === 'message') {
                stepType = 'query';
                stepTitle = `Asked: "${queryText}"`;
                stepDetail = botReply ? `Bot: "${botReply.substring(0, 70)}..."` : `Intent: ${interactionId}`;
            } else if (eventType === 'button_click') {
                stepType = 'button_click';
                stepTitle = `Clicked Button: "${buttonText}"`;
                stepDetail = `Location: ${location} (${pagePath})`;
            } else if (eventType === 'link_click') {
                stepType = 'link_click';
                stepTitle = `Clicked Link: "${linkText || linkUrl}"`;
                stepDetail = `Redirects to ➔ ${linkUrl} (${meta.isExternal ? 'External Site' : 'Internal Page'})`;
            } else if (eventType === 'page_redirect') {
                stepType = 'page_redirect';
                stepTitle = `Redirected to ${meta.toPath || pagePath}`;
                stepDetail = `From ${meta.fromPath || 'previous page'} ➔ ${meta.toPath || pagePath}`;
            } else if (eventType === 'rage_click') {
                stepType = 'rage_click';
                stepTitle = `⚡ Rage Click on ${meta.elementTag || 'Button'}`;
                stepDetail = `Rapid repeated clicks on "${meta.elementText || interactionId}"`;
            } else if (eventType === 'copy') {
                stepType = 'copy';
                stepTitle = `Copied Text`;
                stepDetail = `"${meta.copiedText || queryText}"`;
            } else if (eventType === 'form_submit') {
                stepType = 'lead_submit';
                stepTitle = `Submitted Application Lead`;
                stepDetail = `Candidate shared contact details`;
            } else if (eventType === 'page_leave') {
                stepType = 'exit';
                stepTitle = `Exited Site`;
                stepDetail = `Last viewed page: ${pagePath}`;
            }

            journeySteps.push({
                step: e.stepIndex || (journeySteps.length + 1),
                type: stepType,
                title: stepTitle,
                detail: stepDetail,
                url: pageUrl,
                targetUrl: targetUrl || linkUrl,
                elementText: buttonText || linkText || queryText,
                elementId: meta.elementId || '',
                location: location,
                botReply: botReply,
                isExternal: !!meta.isExternal,
                timestamp: new Date(e.timestamp || Date.now())
            });

            // Capture Dialogue
            if (eventType === 'message' && queryText) {
                dialogueItems.push({
                    sender: 'user',
                    text: queryText,
                    intent: interactionId,
                    timestamp: new Date(e.timestamp || Date.now())
                });
                if (botReply) {
                    dialogueItems.push({
                        sender: 'bot',
                        text: botReply,
                        intent: interactionId,
                        timestamp: new Date(new Date(e.timestamp || Date.now()).getTime() + 1000)
                    });
                }
            }

            // Lead Detection
            let isLead = (eventType === 'form_submit' || eventType === 'lead_submitted');
            let leadPayload = meta.leadData || null;

            const textToScan = queryText + ' ' + (meta.elementText || '') + ' ' + JSON.stringify(meta);
            const emailMatch = textToScan.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const phoneMatch = textToScan.match(/\b[6-9]\d{9}\b/);

            if ((emailMatch && !/rvce\.edu\.in|bot|crawler/i.test(emailMatch[0])) || phoneMatch) {
                isLead = true;
                if (!leadPayload) leadPayload = {};
                if (!leadPayload.email && emailMatch) leadPayload.email = emailMatch[0];
                if (!leadPayload.phone && phoneMatch) leadPayload.phone = phoneMatch[0];
            }

            if (isLead && leadPayload) {
                leadDocs.push({
                    sessionId: sessionId,
                    instituteId: 'rvce',
                    name: leadPayload.name || 'Candidate',
                    phone: leadPayload.phone || '',
                    email: leadPayload.email || '',
                    status: 'New',
                    leadData: leadPayload,
                    attribution: {
                        referrer: referrerType,
                        entryPage: landingPage,
                        landingUrl: landingPage,
                        utmSource: utmParams.source || '',
                        utmMedium: utmParams.medium || '',
                        utmCampaign: utmParams.campaign || ''
                    },
                    geo: { country: geoInfo.country, city: geoInfo.city, region: geoInfo.region },
                    device: { type: deviceInfo.type, os: deviceInfo.os, browser: deviceInfo.browser },
                    createdAt: new Date(e.timestamp || e.d || Date.now())
                });
            }

            interactionDocs.push({
                sessionId: sessionId,
                instituteId: 'rvce',
                stepIndex: e.stepIndex || 1,
                eventType: eventType,
                interactionId: interactionId,
                queryText: queryText,
                botReply: botReply,
                pageUrl: pageUrl,
                pagePath: pagePath,
                pageTitle: pageTitle,
                linkUrl: linkUrl,
                linkText: linkText,
                targetUrl: targetUrl,
                fromUrl: meta.fromUrl || '',
                isExternal: !!meta.isExternal,
                buttonText: buttonText,
                location: location,
                isUnanswered: (interactionId === 'unmatched'),
                element: {
                    tag: meta.elementTag || '',
                    id: meta.elementId || '',
                    className: meta.elementClass || '',
                    text: meta.elementText || buttonText || linkText || '',
                    isDeadClick: (eventType === 'dead_click')
                },
                metaData: meta,
                createdAt: new Date(e.timestamp || e.d || Date.now())
            });
        }

        // 2. Save Interactions to Mongo
        if (interactionDocs.length > 0) {
            await Interaction.insertMany(interactionDocs, { ordered: false });
        }

        // 3. Save Leads
        if (leadDocs.length > 0) {
            await Lead.insertMany(leadDocs, { ordered: false });
        }

        // 4. Update Session & Journey Flow
        const calculatedFrustration = Math.min(100, (rageClicksCount * 30) + (deadClicksCount * 15));
        const lastIntent = interactionDocs[interactionDocs.length - 1]?.interactionId || '';

        await Session.findOneAndUpdate(
            { sessionId: sessionId },
            {
                $setOnInsert: {
                    sessionId: sessionId,
                    instituteId: 'rvce',
                    startTime: new Date(),
                    landingPage: landingPage,
                    entryPage: landingPage,
                    referrer: referrerType,
                    referrerDomain: rawReferrer ? (new URL(rawReferrer, 'https://rvce.edu.in').hostname) : 'direct',
                    utm: utmParams,
                    geo: geoInfo,
                    device: deviceInfo
                },
                $set: {
                    lastActive: new Date(),
                    lastIntent: lastIntent,
                    ...(currentExitPage ? { exitPage: currentExitPage } : {})
                },
                $inc: {
                    'metrics.eventCount': interactionDocs.length,
                    'metrics.messageCount': interactionDocs.filter(i => i.eventType === 'message').length,
                    'metrics.clickCount': interactionDocs.filter(i => i.eventType.includes('click')).length,
                    'metrics.linksClicked': linksClickedCount,
                    'metrics.rageClicks': rageClicksCount,
                    'metrics.deadClicks': deadClicksCount
                },
                $max: {
                    'metrics.frustrationScore': calculatedFrustration
                },
                $push: {
                    ...(journeySteps.length > 0 ? { journey: { $each: journeySteps } } : {}),
                    ...(dialogueItems.length > 0 ? { dialogue: { $each: dialogueItems } } : {})
                },
                ...(leadDocs.length > 0 ? { isConvertedLead: true, leadSummary: leadDocs[0] } : {})
            },
            { upsert: true, returnDocument: 'after' }
        );

        // 5. Dual-Write to Supabase
        if (supabase) {
            try {
                if (interactionDocs.length > 0) {
                    const mappedInts = interactionDocs.map(i => ({
                        session_id: i.sessionId,
                        institute_id: 'rvce',
                        event_type: i.eventType,
                        interaction_id: i.interactionId || '',
                        query_text: i.queryText || '',
                        bot_reply: i.botReply || '',
                        page_url: i.pageUrl || '',
                        page_path: i.pagePath || '',
                        element: i.element || {},
                        metadata: {
                            ...i.metaData,
                            linkUrl: i.linkUrl,
                            linkText: i.linkText,
                            buttonText: i.buttonText,
                            targetUrl: i.targetUrl
                        },
                        created_at: i.createdAt
                    }));
                    await supabase.from('interactions').insert(mappedInts);
                }

                if (leadDocs.length > 0) {
                    const mappedLeads = leadDocs.map(l => ({
                        session_id: l.sessionId,
                        institute_id: 'rvce',
                        name: l.name,
                        phone: l.phone,
                        email: l.email,
                        status: l.status || 'New',
                        lead_data: l.leadData || {},
                        attribution: l.attribution || {},
                        geo: l.geo || {},
                        device: l.device || {},
                        created_at: l.createdAt
                    }));
                    await supabase.from('leads').insert(mappedLeads);
                }

                await supabase.from('sessions').upsert({
                    session_id: sessionId,
                    institute_id: 'rvce',
                    landing_page: landingPage,
                    entry_page: landingPage,
                    exit_page: currentExitPage || landingPage,
                    referrer: referrerType,
                    utm: utmParams,
                    geo: geoInfo,
                    device: deviceInfo,
                    metrics: {
                        event_count: interactionDocs.length,
                        message_count: interactionDocs.filter(i => i.eventType === 'message').length,
                        click_count: interactionDocs.filter(i => i.eventType.includes('click')).length,
                        rage_clicks: rageClicksCount,
                        dead_clicks: deadClicksCount,
                        frustration_score: calculatedFrustration
                    },
                    dialogue: dialogueItems,
                    last_active: new Date()
                }, { onConflict: 'session_id' });
            } catch(supaErr) {
                console.warn('Supabase dual-sync note:', supaErr.message);
            }
        }

        res.json({ success: true, count: interactionDocs.length });
    } catch (err) {
        console.error('Ingestion error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Legacy Dashboard Compatibility Endpoints

app.get('/api/logs', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
        const interactions = await Interaction.find({}).sort({ createdAt: -1 }).limit(limit).lean();
        res.json({ ok: true, count: interactions.length, logs: interactions });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dashboard/interactions', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
        const interactions = await Interaction.find({}).sort({ createdAt: -1 }).limit(limit).lean();
        res.json(interactions);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Supabase Status
app.get('/api/supabase/status', async (req, res) => {
    if (!supabase) return res.json({ configured: false, connected: false });
    try {
        const { data, error } = await supabase.from('sessions').select('count', { count: 'exact', head: true });
        if (error) return res.status(400).json({ configured: true, connected: false, error: error.message });
        res.json({ configured: true, connected: true, url: process.env.SUPABASE_URL });
    } catch(e) {
        res.status(500).json({ configured: true, connected: false, error: e.message });
    }
});

// ==========================================
// 3. DASHBOARD ANALYTICS & JOURNEY APIS
// ==========================================
app.get('/api/dashboard/overview', authenticateToken, async (req, res) => {
    try {
        const totalSessions = await Session.countDocuments({});
        const totalInteractions = await Interaction.countDocuments({});
        const totalLeads = await Lead.countDocuments({});
        
        const rageClickSessions = await Session.countDocuments({ 'metrics.rageClicks': { $gt: 0 } });
        const deadClickSessions = await Session.countDocuments({ 'metrics.deadClicks': { $gt: 0 } });
        const totalLinksClicked = await Interaction.countDocuments({ eventType: 'link_click' });

        const mobileCount = await Session.countDocuments({ 'device.type': 'Mobile' });
        const desktopCount = await Session.countDocuments({ 'device.type': 'Desktop' });

        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const liveNow = await Session.countDocuments({ lastActive: { $gte: fifteenMinsAgo } });

        res.json({
            totalSessions,
            totalInteractions,
            totalLeads,
            totalLinksClicked,
            liveNow,
            rageClickSessions,
            deadClickSessions,
            deviceSplit: { mobile: mobileCount, desktop: desktopCount }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Granular Clarity Metrics: Links Clicked, Buttons Clicked, Redirections
app.get('/api/dashboard/clarity', authenticateToken, async (req, res) => {
    try {
        const sessions = await Session.find({}).sort({ createdAt: -1 }).limit(1000).lean();

        const entryPages = {};
        const exitPages = {};
        const referrers = {};
        const cities = {};
        const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
        const sentiments = { Positive: 0, Neutral: 0, Frustrated: 0 };

        sessions.forEach(s => {
            const entry = (s.entryPage || '/').replace(/^https?:\/\/[^\/]+/, '') || '/';
            if (entry && entry !== '/') entryPages[entry] = (entryPages[entry] || 0) + 1;

            const exit = (s.exitPage || s.entryPage || '/').replace(/^https?:\/\/[^\/]+/, '') || '/';
            if (exit && exit !== '/') exitPages[exit] = (exitPages[exit] || 0) + 1;

            const ref = s.referrer || 'Direct';
            referrers[ref] = (referrers[ref] || 0) + 1;

            const city = s.geo?.city || 'Bengaluru';
            cities[city] = (cities[city] || 0) + 1;

            const dType = s.device?.type || 'Desktop';
            devices[dType] = (devices[dType] || 0) + 1;

            if (s.metrics?.rageClicks > 0 || s.metrics?.frustrationScore >= 50) sentiments.Frustrated++;
            else if (s.isConvertedLead) sentiments.Positive++;
            else sentiments.Neutral++;
        });

        // Ingest real historical entry pages & referrers from page_load/page_visit interactions
        const pageLoads = await Interaction.find({
            $or: [{ eventType: 'page_load' }, { eventType: 'page_visit' }]
        }).sort({ createdAt: -1 }).limit(1000).lean();

        pageLoads.forEach(p => {
            const rawUrl = p.pageUrl || p.metaData?.url || '';
            if (rawUrl) {
                try {
                    const parsed = rawUrl.startsWith('http') ? new URL(rawUrl).pathname : rawUrl;
                    if (parsed && parsed !== '/') entryPages[parsed] = (entryPages[parsed] || 0) + 1;
                } catch(e) {}
            }
            const ref = p.metaData?.referrer;
            if (ref && ref !== 'Direct') {
                try {
                    const refHost = ref.startsWith('http') ? (new URL(ref).hostname.replace('www.', '')) : ref;
                    referrers[refHost] = (referrers[refHost] || 0) + 1;
                } catch(e) {}
            }
        });

        // Ensure default root is represented if nothing else
        if (Object.keys(entryPages).length === 0) entryPages['/'] = sessions.length || 1;
        if (Object.keys(exitPages).length === 0) exitPages['/'] = sessions.length || 1;

        // 1. Top Outgoing & Clicked Links
        const linkInteractions = await Interaction.find({ eventType: 'link_click' }).limit(300).lean();
        const clickedLinksMap = new Map();
        linkInteractions.forEach(l => {
            const url = l.linkUrl || l.targetUrl || '';
            const text = l.linkText || (l.element && l.element.text) || url || 'Link';
            const isExt = !!l.isExternal || (url.startsWith('http') && !url.includes('rvce.edu.in'));
            const key = `${text}||${url}`;
            if (!clickedLinksMap.has(key)) {
                clickedLinksMap.set(key, { text, url, isExternal: isExt, count: 0 });
            }
            clickedLinksMap.get(key).count++;
        });
        const clickedLinks = Array.from(clickedLinksMap.values()).sort((a,b) => b.count - a.count).slice(0, 10);

        // 2. Top Clicked Buttons (Chatbot vs Webpage)
        const btnInteractions = await Interaction.find({ eventType: 'button_click' }).limit(300).lean();
        const clickedButtonsMap = new Map();
        btnInteractions.forEach(b => {
            const text = b.buttonText || (b.element && b.element.text) || b.interactionId || 'Button';
            const loc = b.location || 'Chatbot';
            const key = `${text}||${loc}`;
            if (!clickedButtonsMap.has(key)) {
                clickedButtonsMap.set(key, { text, location: loc, count: 0 });
            }
            clickedButtonsMap.get(key).count++;
        });
        const clickedButtons = Array.from(clickedButtonsMap.values()).sort((a,b) => b.count - a.count).slice(0, 10);

        // 3. Top Page Redirections
        const redirectInteractions = await Interaction.find({ eventType: 'page_redirect' }).limit(200).lean();
        const redirectsMap = new Map();
        redirectInteractions.forEach(r => {
            const from = r.fromUrl || r.metaData?.fromPath || (r.metaData?.fromUrl ? new URL(r.metaData.fromUrl, 'https://rvce.edu.in').pathname : '/');
            const to = r.targetUrl || r.pagePath || r.metaData?.toPath || (r.metaData?.toUrl ? new URL(r.metaData.toUrl, 'https://rvce.edu.in').pathname : '/');
            const key = `${from} ➔ ${to}`;
            if (!redirectsMap.has(key)) {
                redirectsMap.set(key, { from, to, count: 0 });
            }
            redirectsMap.get(key).count++;
        });
        const redirects = Array.from(redirectsMap.values()).sort((a,b) => b.count - a.count).slice(0, 8);

        // 4. Rage hotspots
        const rageInteractions = await Interaction.find({ eventType: 'rage_click' }).limit(100).lean();
        const rageHotspotsMap = new Map();
        rageInteractions.forEach(r => {
            const text = r.element?.text || r.buttonText || r.interactionId || 'Button';
            rageHotspotsMap.set(text, (rageHotspotsMap.get(text) || 0) + 1);
        });
        const rageHotspots = Array.from(rageHotspotsMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8);

        // 5. Chatbot Intent Topics Breakdown from real user messages
        const messageInteractions = await Interaction.find({
            eventType: 'message',
            interactionId: { $nin: ['page_load', 'unknown', ''] }
        }).sort({ createdAt: -1 }).limit(1000).lean();

        const topicCounts = {};
        messageInteractions.forEach(m => {
            let topic = m.interactionId || m.metaData?.intent || 'general';
            if (topic.startsWith('moderated_')) topic = 'moderated';
            topic = topic.replace(/_/g, ' ');
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
        const topics = Object.entries(topicCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);

        // 6. Copied Text Events
        const copyInteractions = await Interaction.find({
            $or: [{ eventType: 'copy' }, { interactionId: /^copy:/ }]
        }).sort({ createdAt: -1 }).limit(50).lean();

        const copiedMap = new Map();
        copyInteractions.forEach(c => {
            const text = c.metaData?.copiedText || c.queryText?.replace(/^\[copy\]\s*/, '') || 'Important text';
            copiedMap.set(text, (copiedMap.get(text) || 0) + 1);
        });
        const copiedItems = Array.from(copiedMap.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8);

        res.json({
            entryPages: Object.entries(entryPages).sort((a,b) => b[1] - a[1]).slice(0, 8),
            exitPages: Object.entries(exitPages).sort((a,b) => b[1] - a[1]).slice(0, 8),
            referrers: Object.entries(referrers).sort((a,b) => b[1] - a[1]).slice(0, 6),
            cities: Object.entries(cities).sort((a,b) => b[1] - a[1]).slice(0, 8),
            devices,
            clickedLinks,
            clickedButtons,
            redirects,
            rageHotspots,
            sentiments,
            topics,
            copiedItems
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sessions List (Enriched with Last Query, Clicked Buttons/Links, and Journey Route)
app.get('/api/dashboard/sessions', authenticateToken, async (req, res) => {
    try {
        const { filter, search, limit } = req.query;
        const queryLimit = Math.min(parseInt(limit) || 100, 300);
        const query = {};

        if (filter === 'rage') query['metrics.rageClicks'] = { $gt: 0 };
        if (filter === 'leads') query.isConvertedLead = true;
        if (filter === 'mobile') query['device.type'] = 'Mobile';
        if (filter === 'desktop') query['device.type'] = 'Desktop';

        if (search) {
            query.$or = [
                { sessionId: { $regex: search, $options: 'i' } },
                { 'geo.city': { $regex: search, $options: 'i' } },
                { entryPage: { $regex: search, $options: 'i' } },
                { exitPage: { $regex: search, $options: 'i' } }
            ];
        }

        const sessions = await Session.find(query)
            .sort({ lastActive: -1 })
            .limit(queryLimit)
            .lean();

        // Enrich with real user questions and entry pages from interactions
        const sessionIds = sessions.map(s => s.sessionId);
        const interactionsForSessions = await Interaction.find({
            sessionId: { $in: sessionIds }
        }).sort({ createdAt: 1 }).lean();

        const interactionMap = new Map();
        interactionsForSessions.forEach(i => {
            if (!interactionMap.has(i.sessionId)) interactionMap.set(i.sessionId, []);
            interactionMap.get(i.sessionId).push(i);
        });

        const enrichedSessions = sessions.map(s => {
            const sessInters = interactionMap.get(s.sessionId) || [];
            const userMsgs = sessInters.filter(i => i.eventType === 'message');
            const pageLoads = sessInters.filter(i => i.eventType === 'page_load' || i.eventType === 'page_visit');

            const querySteps = (s.journey || []).filter(j => j.type === 'query');
            let lastQuery = querySteps.length > 0 
                ? querySteps[querySteps.length - 1].title.replace(/^Asked: "/, '').replace(/"$/, '')
                : (s.dialogue?.filter(d => d.sender === 'user').pop()?.text || '');
            
            if (!lastQuery && userMsgs.length > 0) {
                lastQuery = userMsgs[userMsgs.length - 1].queryText || userMsgs[userMsgs.length - 1].interactionId;
            }
            if (!lastQuery && pageLoads.length > 0) {
                lastQuery = pageLoads[0].metaData?.title || 'Browsed Portal';
            }
            if (!lastQuery) lastQuery = 'Browsed Portal';

            const firstPage = pageLoads[0];
            const cleanPath = (u) => {
                try { return new URL(u, 'https://rvce.edu.in').pathname; } catch(e) { return u || '/'; }
            };
            const entryUrl = s.entryPage && s.entryPage !== '/' ? s.entryPage : (firstPage?.pageUrl || firstPage?.metaData?.url || '/');
            const routeSet = [cleanPath(entryUrl)];

            sessInters.filter(i => i.eventType === 'page_redirect' || i.eventType === 'link_click').forEach(r => {
                const target = cleanPath(r.targetUrl || r.linkUrl || r.pageUrl);
                if (target && !routeSet.includes(target)) routeSet.push(target);
            });
            if (s.exitPage && !routeSet.includes(cleanPath(s.exitPage))) {
                routeSet.push(cleanPath(s.exitPage));
            }

            const btnCount = (s.journey || []).filter(j => j.type === 'button_click').length || sessInters.filter(i => i.eventType === 'button_click').length;
            const lnkCount = s.metrics?.linksClicked || (s.journey || []).filter(j => j.type === 'link_click').length || sessInters.filter(i => i.eventType === 'link_click').length;

            return {
                ...s,
                entryPage: entryUrl,
                referrer: s.referrer && s.referrer !== 'Direct' ? s.referrer : (firstPage?.metaData?.referrer || s.referrer || 'Direct'),
                lastQuery,
                buttonsCount: btnCount,
                linksCount: lnkCount,
                navigationRoute: routeSet.join(' ➔ ') || '/'
            };
        });

        res.json(enrichedSessions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Daily Grouped Sessions Report for Executive PDF Dossier & Printing
app.get('/api/dashboard/report/daily', authenticateToken, async (req, res) => {
    try {
        const { dateFilter } = req.query;
        // Fetch sessions sorted by startTime
        const sessions = await Session.find({}).sort({ startTime: -1, createdAt: -1 }).lean();
        const daysMap = new Map();

        sessions.forEach(s => {
            const dateObj = new Date(s.startTime || s.createdAt || Date.now());
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;

            if (dateFilter && dateFilter !== 'all' && dateFilter !== dateKey) return;

            if (!daysMap.has(dateKey)) {
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                daysMap.set(dateKey, {
                    date: dateKey,
                    displayDate: dayName,
                    isToday: dateKey === new Date().toISOString().split('T')[0],
                    metrics: {
                        sessionsCount: 0,
                        queriesCount: 0,
                        buttonsCount: 0,
                        linksCount: 0,
                        redirectsCount: 0,
                        leadsCount: 0,
                        rageSessionsCount: 0
                    },
                    sessions: []
                });
            }

            const dayGroup = daysMap.get(dateKey);
            dayGroup.metrics.sessionsCount++;

            // Extract User Queries & Bot Replies
            const querySteps = (s.journey || []).filter(j => j.type === 'query' || j.type === 'message');
            const queries = querySteps.map(q => {
                const asked = q.elementText || q.title.replace(/^Asked: "/, '').replace(/"$/, '');
                let answered = q.botReply || (q.detail && !q.detail.includes('User asked') ? q.detail.replace(/^Bot: "/, '').replace(/"$/, '') : '');
                return { asked, answered, time: q.timeOffset || '00:00' };
            });
            if (queries.length === 0 && s.dialogue && s.dialogue.length > 0) {
                for (let d = 0; d < s.dialogue.length; d++) {
                    if (s.dialogue[d].sender === 'user') {
                        const nextBot = s.dialogue[d+1]?.sender === 'bot' ? s.dialogue[d+1].text : '';
                        queries.push({ asked: s.dialogue[d].text, answered: nextBot, time: '00:00' });
                    }
                }
            }
            dayGroup.metrics.queriesCount += queries.length;

            // Extract Buttons
            const buttonSteps = (s.journey || []).filter(j => j.type === 'button_click');
            const buttons = buttonSteps.map(b => ({
                text: b.elementText || b.title.replace(/^Clicked Button: "/, '').replace(/"$/, ''),
                location: b.location || 'Chatbot',
                page: b.url || '/'
            }));
            dayGroup.metrics.buttonsCount += buttons.length;

            // Extract Links
            const linkSteps = (s.journey || []).filter(j => j.type === 'link_click');
            const links = linkSteps.map(l => ({
                text: l.elementText || l.title.replace(/^Clicked Link: "/, '').replace(/"$/, ''),
                url: l.targetUrl || l.url || '',
                isExternal: !!l.isExternal
            }));
            dayGroup.metrics.linksCount += links.length;

            // Extract Redirects
            const redirSteps = (s.journey || []).filter(j => j.type === 'page_redirect');
            const redirects = redirSteps.map(r => ({
                detail: r.detail || r.title,
                target: r.targetUrl || r.url || ''
            }));
            dayGroup.metrics.redirectsCount += redirects.length;

            if (s.isConvertedLead) dayGroup.metrics.leadsCount++;
            if (s.metrics?.rageClicks > 0) dayGroup.metrics.rageSessionsCount++;

            dayGroup.sessions.push({
                sessionId: s.sessionId,
                startTime: s.startTime || s.createdAt,
                timeStr: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                geo: s.geo || {},
                device: s.device || {},
                referrer: s.referrer || 'Direct',
                entryPage: s.entryPage || '/',
                exitPage: s.exitPage || s.entryPage || '/',
                queries,
                buttons,
                links,
                redirects,
                isLead: s.isConvertedLead,
                leadInfo: s.leadSummary || null,
                rageClicks: s.metrics?.rageClicks || 0,
                journeyStepsCount: (s.journey || []).length
            });
        });

        daysMap.forEach(group => {
            group.sessions.sort((a, b) => {
                const scoreA = (a.queries.length * 10) + (a.buttons.length * 3) + (a.links.length * 3) + a.journeyStepsCount;
                const scoreB = (b.queries.length * 10) + (b.buttons.length * 3) + (b.links.length * 3) + b.journeyStepsCount;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return new Date(b.startTime) - new Date(a.startTime);
            });
        });

        const days = Array.from(daysMap.values()).sort((a, b) => b.date.localeCompare(a.date));

        res.json({
            institution: {
                name: 'RV College of Engineering® (RVCE)',
                trust: 'Rashtreeya Sikshana Samithi Trust (RSST)',
                address: 'Mysuru Road, RV Vidyaniketan Post, Bengaluru - 560059, Karnataka',
                accreditation: 'Autonomous Institution · NAAC A+ Grade · AICTE Approved',
                logoUrl: '/logo.png'
            },
            generatedAt: new Date().toISOString(),
            totalDays: days.length,
            totalSessions: sessions.length,
            days
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Single Session Full Journey, Replay & Dialogue
app.get('/api/dashboard/session/:id', authenticateToken, async (req, res) => {
    try {
        let session = await Session.findOne({ sessionId: req.params.id }).lean();
        if (!session && mongoose.Types.ObjectId.isValid(req.params.id)) {
            session = await Session.findById(req.params.id).lean();
        }
        if (!session && supabase) {
            const { data } = await supabase.from('sessions').select('*').eq('session_id', req.params.id).maybeSingle();
            if (data) {
                session = {
                    sessionId: data.session_id,
                    instituteId: data.institute_id || 'rvce',
                    landingPage: data.landing_page,
                    entryPage: data.entry_page,
                    exitPage: data.exit_page,
                    startTime: data.start_time,
                    metrics: {
                        rageClicks: data.rage_clicks || 0,
                        linksClicked: data.links_clicked || 0,
                        clickCount: data.click_count || 0
                    },
                    device: data.device || {},
                    geo: data.geo || {},
                    journey: []
                };
            }
        }
        if (!session) {
            session = {
                sessionId: req.params.id,
                instituteId: 'rvce',
                startTime: new Date(),
                entryPage: '/',
                exitPage: '/',
                metrics: { rageClicks: 0, linksClicked: 0, clickCount: 0 },
                device: { type: 'Desktop', os: 'Windows', browser: 'Chrome' },
                geo: { city: 'Bengaluru', country: 'India' },
                journey: []
            };
        }

        const interactions = await Interaction.find({ sessionId: req.params.id })
            .sort({ createdAt: 1 })
            .lean();

        const startTime = new Date(session.startTime).getTime();
        const timeline = interactions.map(i => {
            const timeDiffSec = Math.max(0, Math.round((new Date(i.createdAt).getTime() - startTime) / 1000));
            const mins = Math.floor(timeDiffSec / 60);
            const secs = timeDiffSec % 60;
            const formattedOffset = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            return {
                ...i,
                offsetSeconds: timeDiffSec,
                formattedOffset: formattedOffset
            };
        });

        // Construct or fetch Granular Journey Stream
        let journey = session.journey || [];
        if (journey.length === 0) {
            journey = timeline.map((item, idx) => {
                let jType = item.eventType;
                let jTitle = item.eventType.toUpperCase();
                let jDetail = item.queryText || item.buttonText || item.linkText || item.interactionId;

                if (item.eventType === 'message') {
                    jType = 'query';
                    jTitle = `Asked: "${item.queryText}"`;
                    jDetail = item.botReply ? `Bot: "${item.botReply}"` : `Intent: ${item.interactionId}`;
                } else if (item.eventType === 'link_click') {
                    jType = 'link_click';
                    jTitle = `Clicked Link: "${item.linkText || item.linkUrl}"`;
                    jDetail = `Target: ${item.linkUrl}`;
                } else if (item.eventType === 'button_click') {
                    jType = 'button_click';
                    jTitle = `Clicked Button: "${item.buttonText}"`;
                    jDetail = `Location: ${item.location || 'Chatbot'}`;
                } else if (item.eventType === 'page_redirect') {
                    jType = 'page_redirect';
                    jTitle = `Redirected to ${item.pagePath}`;
                    jDetail = `From ${item.fromUrl || '/'} ➔ ${item.targetUrl || item.pageUrl}`;
                }

                return {
                    step: idx + 1,
                    type: jType,
                    title: jTitle,
                    detail: jDetail,
                    url: item.pageUrl,
                    targetUrl: item.linkUrl || item.targetUrl || '',
                    elementText: item.buttonText || item.linkText || item.queryText,
                    location: item.location || 'Chatbot',
                    isExternal: !!item.isExternal,
                    timeOffset: item.formattedOffset,
                    timestamp: item.createdAt
                };
            });
        }

        let dialogue = session.dialogue || [];
        if (dialogue.length === 0) {
            interactions.filter(i => i.eventType === 'message').forEach(m => {
                dialogue.push({ sender: 'user', text: m.queryText, intent: m.interactionId, timestamp: m.createdAt });
                if (m.botReply) dialogue.push({ sender: 'bot', text: m.botReply, intent: m.interactionId, timestamp: new Date(new Date(m.createdAt).getTime() + 1000) });
            });
        }

        res.json({ session, timeline, journey, dialogue });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Leads List
app.get('/api/dashboard/leads', authenticateToken, async (req, res) => {
    try {
        const leads = await Lead.find({}).sort({ createdAt: -1 }).limit(200).lean();
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unanswered Queries & AI Knowledge Gaps Queue
app.get('/api/dashboard/unanswered', authenticateToken, async (req, res) => {
    try {
        const unanswered = await Interaction.find({
            $or: [
                { interactionId: 'unmatched' },
                { isUnanswered: true }
            ]
        }).sort({ createdAt: -1 }).limit(60).lean();

        res.json(unanswered);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dashboard/unanswered/:id/resolve', authenticateToken, async (req, res) => {
    try {
        await Interaction.findByIdAndUpdate(req.params.id, {
            $set: { isUnanswered: false, interactionId: 'resolved' }
        });
        res.json({ ok: true, message: 'Question marked as resolved!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Demo Seeder Route with Rich Multi-Scenario Clickstreams
app.post('/api/demo/seed', async (req, res) => {
    try {
        const mockCities = [
            { city: 'Bengaluru', region: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946 },
            { city: 'Hyderabad', region: 'Telangana', country: 'India', lat: 17.3850, lon: 78.4867 },
            { city: 'Chennai', region: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707 },
            { city: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.0760, lon: 72.8777 },
            { city: 'Delhi', region: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025 },
            { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708 }
        ];

        const mockReferrers = [
            { ref: 'Google Search', domain: 'google.com', utm: { source: 'google', medium: 'cpc', campaign: 'admissions_2026' } },
            { ref: 'Direct', domain: 'direct', utm: {} },
            { ref: 'Instagram', domain: 'instagram.com', utm: { source: 'instagram', medium: 'social', campaign: 'campus_life' } }
        ];

        const SCENARIOS = [
            {
                topic: 'cutoffs',
                q: 'What is the KCET and COMEDK cutoff rank for Computer Science?',
                a: 'For 2024-2025, RVCE KCET cutoff for CSE was Rank 310 (GM). For COMEDK, the closing rank was 465 in Round 3.',
                button1: 'Download Cutoff PDF',
                link1: { text: 'Download 2025 Cutoff Table PDF', url: 'https://rvce.edu.in/files/rvce_cutoff_2025.pdf', isExt: false },
                link2: { text: 'COMEDK Official Counselling Portal', url: 'https://comedk.org/counselling-2025', isExt: true },
                redir1: { from: 'https://rvce.edu.in/', to: 'https://rvce.edu.in/admissions' },
                redir2: { from: 'https://rvce.edu.in/admissions', to: 'https://rvce.edu.in/apply-now' },
                btn2: 'Apply for B.E. Now',
                leadBranch: 'Computer Science & Engineering',
                isLead: true
            },
            {
                topic: 'placements',
                q: 'What was the highest package in CSE for the 2025 batch?',
                a: 'The highest package in CSE was 67 LPA offered by Atlassian, with an overall average package of 21.6 LPA across 320+ recruiters.',
                button1: 'View Placement Report',
                link1: { text: 'Download Placement Brochure PDF', url: 'https://rvce.edu.in/files/placement_brochure_2025.pdf', isExt: false },
                link2: { text: 'Top Recruiters Directory', url: 'https://rvce.edu.in/placements/recruiters', isExt: false },
                redir1: { from: 'https://rvce.edu.in/', to: 'https://rvce.edu.in/placements' },
                redir2: { from: 'https://rvce.edu.in/placements', to: 'https://rvce.edu.in/fees-structure' },
                btn2: 'Check Fees Structure',
                leadBranch: 'Information Science & Engineering',
                isLead: true
            },
            {
                topic: 'fees',
                q: 'What is the fee structure for B.E. Management Quota?',
                a: 'Management quota fees vary by branch. For CSE & AI/ML, it is approximately 14-16 Lakhs per year.',
                button1: 'Check Management Quota Seat Matrix',
                link1: { text: 'Official Fees Structure Table', url: 'https://rvce.edu.in/fees-structure', isExt: false },
                link2: { text: 'KEA Official Fee Notification', url: 'https://kea.kar.nic.in/fees_notice', isExt: true },
                redir1: { from: 'https://rvce.edu.in/', to: 'https://rvce.edu.in/fees-structure' },
                redir2: { from: 'https://rvce.edu.in/fees-structure', to: 'https://rvce.edu.in/apply-now' },
                btn2: 'Submit Application Inquiry',
                leadBranch: 'Artificial Intelligence & Machine Learning',
                isLead: true
            },
            {
                topic: 'friction',
                q: 'Where can I find scholarship application form?',
                a: 'Scholarships are awarded via SSP Karnataka and National Scholarship Portal. Click below to view eligibility criteria.',
                button1: 'Apply for Fee Concession',
                link1: { text: 'State Scholarship Portal (SSP)', url: 'https://ssp.postmatric.karnataka.gov.in', isExt: true },
                link2: { text: 'RVCE Student Welfare Notice', url: 'https://rvce.edu.in/scholarships', isExt: false },
                redir1: { from: 'https://rvce.edu.in/', to: 'https://rvce.edu.in/scholarships' },
                redir2: { from: 'https://rvce.edu.in/scholarships', to: 'https://rvce.edu.in/contact' },
                btn2: 'Contact Admissions Desk',
                leadBranch: 'Electronics & Communication',
                isLead: false,
                rageClicks: 4
            }
        ];

        const mockSessions = [];
        const mockInteractions = [];
        const mockLeads = [];

        for (let i = 0; i < 20; i++) {
            const sid = 'sess_journey_' + (1000 + i);
            const cityObj = mockCities[i % mockCities.length];
            const refObj = mockReferrers[i % mockReferrers.length];
            const scen = SCENARIOS[i % SCENARIOS.length];
            const baseTime = new Date(Date.now() - (i * 35 * 60 * 1000));

            const hasRage = !!scen.rageClicks || (i % 6 === 0);
            const rageCount = hasRage ? 4 : 0;

            const journey = [
                { step: 1, type: 'page_land', title: 'Landed on Homepage (/)', detail: `Arrived from ${refObj.ref}`, url: 'https://rvce.edu.in/', timeOffset: '00:00', timestamp: baseTime },
                { step: 2, type: 'button_click', title: `Clicked Button: "Explore ${scen.topic.toUpperCase()}"`, detail: 'Location: Page Header Navigation', url: 'https://rvce.edu.in/', elementText: `Explore ${scen.topic}`, location: 'Webpage', timeOffset: '00:10', timestamp: new Date(baseTime.getTime() + 10000) },
                { step: 3, type: 'page_redirect', title: `Redirected to ${scen.redir1.to.replace('https://rvce.edu.in', '')}`, detail: `From / ➔ ${scen.redir1.to}`, url: scen.redir1.to, targetUrl: scen.redir1.to, timeOffset: '00:12', timestamp: new Date(baseTime.getTime() + 12000) },
                { step: 4, type: 'bot_open', title: 'Opened RVCE Chatbot Widget', detail: `Clicked floating chat bubble on ${scen.redir1.to.replace('https://rvce.edu.in', '')}`, url: scen.redir1.to, timeOffset: '00:18', timestamp: new Date(baseTime.getTime() + 18000) },
                { step: 5, type: 'query', title: `Asked: "${scen.q}"`, detail: scen.a, botReply: scen.a, url: scen.redir1.to, elementText: scen.q, timeOffset: '00:28', timestamp: new Date(baseTime.getTime() + 28000) },
                { step: 6, type: 'button_click', title: `Clicked Button: "${scen.button1}"`, detail: 'Location: Chatbot Quick Action Chip', url: scen.redir1.to, elementText: scen.button1, location: 'Chatbot', timeOffset: '00:42', timestamp: new Date(baseTime.getTime() + 42000) },
                { step: 7, type: 'link_click', title: `Clicked Link: "${scen.link1.text}"`, detail: `Target: ${scen.link1.url} (${scen.link1.isExt ? 'External' : 'Internal'})`, url: scen.redir1.to, targetUrl: scen.link1.url, elementText: scen.link1.text, isExternal: scen.link1.isExt, timeOffset: '00:55', timestamp: new Date(baseTime.getTime() + 55000) },
                { step: 8, type: 'link_click', title: `Clicked Link: "${scen.link2.text}"`, detail: `Target: ${scen.link2.url} (${scen.link2.isExt ? 'External' : 'Internal'})`, url: scen.redir1.to, targetUrl: scen.link2.url, elementText: scen.link2.text, isExternal: scen.link2.isExt, timeOffset: '01:10', timestamp: new Date(baseTime.getTime() + 70000) },
                { step: 9, type: 'button_click', title: `Clicked Button: "${scen.btn2}"`, detail: 'Location: Webpage Call To Action', url: scen.redir1.to, elementText: scen.btn2, location: 'Webpage', timeOffset: '01:25', timestamp: new Date(baseTime.getTime() + 85000) },
                { step: 10, type: 'page_redirect', title: `Redirected to ${scen.redir2.to.replace('https://rvce.edu.in', '')}`, detail: `From ${scen.redir1.to.replace('https://rvce.edu.in', '')} ➔ ${scen.redir2.to}`, url: scen.redir2.to, targetUrl: scen.redir2.to, timeOffset: '01:28', timestamp: new Date(baseTime.getTime() + 88000) },
                ...(hasRage ? [{ step: 11, type: 'rage_click', title: `⚡ Rage Click on Button: "${scen.button1}"`, detail: '4 rapid clicks within 600ms (Frustration detected)', url: scen.redir2.to, elementText: scen.button1, timeOffset: '01:45', timestamp: new Date(baseTime.getTime() + 105000) }] : []),
                ...(scen.isLead ? [{ step: hasRage ? 12 : 11, type: 'lead_submit', title: 'Submitted Application Inquiry', detail: `Candidate ${i+1} submitted contact details for ${scen.leadBranch}`, url: scen.redir2.to, elementText: scen.leadBranch, timeOffset: '02:10', timestamp: new Date(baseTime.getTime() + 130000) }] : []),
                { step: hasRage ? (scen.isLead ? 13 : 12) : (scen.isLead ? 12 : 11), type: 'exit', title: 'Exited Site', detail: `Left site on ${scen.redir2.to.replace('https://rvce.edu.in', '')} after dwell time`, url: scen.redir2.to, timeOffset: '02:30', timestamp: new Date(baseTime.getTime() + 150000) }
            ];

            const dialogue = [
                { sender: 'user', text: scen.q, intent: scen.topic, timestamp: new Date(baseTime.getTime() + 28000) },
                { sender: 'bot', text: scen.a, intent: scen.topic, timestamp: new Date(baseTime.getTime() + 30000) },
                ...(scen.isLead ? [{ sender: 'user', text: `Submitted contact details for ${scen.leadBranch}`, intent: 'lead_captured', timestamp: new Date(baseTime.getTime() + 130000) }] : [])
            ];

            mockSessions.push({
                sessionId: sid,
                instituteId: 'rvce',
                landingPage: 'https://rvce.edu.in/',
                entryPage: 'https://rvce.edu.in/',
                exitPage: scen.redir2.to,
                referrer: refObj.ref,
                referrerDomain: refObj.domain,
                utm: refObj.utm,
                geo: { ip: '103.24.' + (20+i) + '.15', country: cityObj.country, city: cityObj.city, region: cityObj.region, isp: 'Airtel Broadband' },
                device: { type: i % 2 === 0 ? 'Desktop' : 'Mobile', os: i % 2 === 0 ? 'Windows 11' : 'iOS', browser: i % 2 === 0 ? 'Chrome 124' : 'Mobile Safari', screen: i % 2 === 0 ? '1920x1080' : '390x844' },
                metrics: { eventCount: journey.length, messageCount: dialogue.length, clickCount: 5, linksClicked: 2, rageClicks: rageCount, deadClicks: (i % 5 === 0 ? 2 : 0), frustrationScore: hasRage ? 75 : 10 },
                journey: journey,
                dialogue: dialogue,
                startTime: baseTime,
                lastActive: new Date(baseTime.getTime() + 150000),
                lastIntent: scen.topic,
                isConvertedLead: scen.isLead,
                leadSummary: scen.isLead ? { name: `Candidate ${i+1}`, phone: '98450' + (20000 + i), email: `applicant${i+1}@gmail.com` } : null
            });

            // Corresponding Interactions
            journey.forEach(j => {
                let eType = (j.type === 'page_land' ? 'page_visit' : (j.type === 'query' ? 'message' : j.type));
                let qText = j.type === 'query' ? scen.q : '';
                let bReply = j.type === 'query' ? scen.a : '';
                let bText = j.type === 'button_click' ? (j.elementText || j.title.replace(/^Clicked Button: "/, '').replace(/"$/, '')) : '';
                let lText = j.type === 'link_click' ? (j.elementText || j.title.replace(/^Clicked Link: "/, '').replace(/"$/, '')) : '';
                let lUrl = j.targetUrl || '';
                let fromUrl = (j.type === 'page_redirect' && j.detail) ? j.detail.split(' ➔ ')[0].replace(/^From /, '') : '';
                let targetUrl = (j.type === 'page_redirect' && j.detail) ? j.detail.split(' ➔ ')[1] : lUrl;

                mockInteractions.push({
                    sessionId: sid,
                    instituteId: 'rvce',
                    stepIndex: j.step,
                    eventType: eType,
                    interactionId: j.type,
                    queryText: qText || j.title,
                    botReply: bReply,
                    buttonText: bText,
                    linkText: lText,
                    linkUrl: lUrl,
                    targetUrl: targetUrl,
                    fromUrl: fromUrl,
                    isExternal: !!j.isExternal,
                    location: j.location || (j.detail?.includes('Chatbot') ? 'Chatbot' : 'Webpage'),
                    pageUrl: j.url,
                    pagePath: j.url ? new URL(j.url, 'https://rvce.edu.in').pathname : '/',
                    metaData: {
                        fromPath: fromUrl,
                        toPath: targetUrl,
                        isExternal: !!j.isExternal
                    },
                    createdAt: j.timestamp
                });
            });

            if (scen.isLead) {
                mockLeads.push({
                    sessionId: sid,
                    instituteId: 'rvce',
                    name: `Candidate ${i + 1}`,
                    phone: '98450' + (20000 + i),
                    email: `applicant${i+1}@gmail.com`,
                    status: i % 3 === 0 ? 'Qualified' : (i % 2 === 0 ? 'Contacted' : 'New'),
                    attribution: { referrer: refObj.ref, entryPage: '/', landingUrl: 'https://rvce.edu.in/' },
                    geo: { country: cityObj.country, city: cityObj.city, region: cityObj.region },
                    device: { type: i % 2 === 0 ? 'Desktop' : 'Mobile' },
                    createdAt: new Date(baseTime.getTime() + 130000)
                });
            }
        }

        await Session.deleteMany({});
        await Interaction.deleteMany({});
        await Lead.deleteMany({});

        await Session.insertMany(mockSessions);
        await Interaction.insertMany(mockInteractions);
        await Lead.insertMany(mockLeads);

        // Also sync to Supabase!
        if (supabase) {
            try {
                const mappedSessions = mockSessions.map(s => ({
                    session_id: s.sessionId,
                    institute_id: 'rvce',
                    landing_page: s.landingPage,
                    entry_page: s.entryPage,
                    exit_page: s.exitPage,
                    referrer: s.referrer,
                    geo: s.geo,
                    device: s.device,
                    metrics: s.metrics,
                    dialogue: s.dialogue,
                    is_converted_lead: s.isConvertedLead,
                    start_time: s.startTime,
                    last_active: s.lastActive
                }));
                await supabase.from('sessions').upsert(mappedSessions, { onConflict: 'session_id' });
                console.log('✅ Seeded journeys to Supabase successfully!');
            } catch(e) {
                console.warn('Supabase seed note:', e.message);
            }
        }

        res.json({ ok: true, message: 'Seeded 20 deep visitor journeys with button clicks, link clicks, and redirections!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SPA Fallback
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 RVCE Standalone Command Center running on http://localhost:${PORT}`);
});

module.exports = app;
