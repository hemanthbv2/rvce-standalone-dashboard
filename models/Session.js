const mongoose = require('mongoose');

const journeyStepSchema = new mongoose.Schema({
    step: Number,
    type: String, // 'page_land', 'bot_open', 'query', 'bot_reply', 'button_click', 'link_click', 'page_redirect', 'copy', 'rage_click', 'lead_submit', 'exit'
    title: String,
    detail: String,
    url: String,
    targetUrl: String,
    elementText: String,
    elementId: String,
    location: String,
    botReply: String,
    isExternal: Boolean,
    timestamp: { type: Date, default: Date.now },
    timeOffset: String
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    instituteId: { type: String, default: 'rvce' },
    
    // Clarity Journey Tracking (Entry, Exit & Breadcrumbs)
    landingPage: { type: String, default: '/' },
    entryPage: { type: String, default: '/' },
    exitPage: { type: String, default: '/' },
    pageHistory: [{
        url: String,
        path: String,
        title: String,
        timestamp: { type: Date, default: Date.now },
        timeSpentSeconds: { type: Number, default: 0 }
    }],

    // Complete Step-by-Step Clickstream & Redirection Journey Flow
    journey: [journeyStepSchema],
    
    // Traffic Source & Attribution
    referrer: { type: String, default: 'Direct' },
    referrerDomain: { type: String, default: 'direct' },
    utm: {
        source: { type: String, default: '' },
        medium: { type: String, default: '' },
        campaign: { type: String, default: '' },
        term: { type: String, default: '' },
        content: { type: String, default: '' }
    },
    
    // Geographic Location
    geo: {
        ip: { type: String, default: '' },
        country: { type: String, default: 'India' },
        countryCode: { type: String, default: 'IN' },
        region: { type: String, default: 'Karnataka' },
        city: { type: String, default: 'Bengaluru' },
        isp: { type: String, default: '' },
        org: { type: String, default: '' },
        lat: { type: Number, default: 12.9716 },
        lon: { type: Number, default: 77.5946 }
    },
    
    // Device & Environment Fingerprint
    device: {
        type: { type: String, default: 'Desktop' }, // Desktop, Mobile, Tablet
        vendor: { type: String, default: '' },
        model: { type: String, default: '' },
        os: { type: String, default: 'Unknown' },
        osVersion: { type: String, default: '' },
        browser: { type: String, default: 'Unknown' },
        browserVersion: { type: String, default: '' },
        screen: { type: String, default: '1920x1080' },
        viewport: { type: String, default: '1920x1080' },
        devicePixelRatio: { type: Number, default: 1 },
        language: { type: String, default: 'en-US' }
    },
    
    // Clarity Behavioral Signals
    metrics: {
        eventCount: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        clickCount: { type: Number, default: 0 },
        linksClicked: { type: Number, default: 0 },
        rageClicks: { type: Number, default: 0 },
        deadClicks: { type: Number, default: 0 },
        maxScrollDepth: { type: Number, default: 0 },
        dwellSeconds: { type: Number, default: 0 },
        frustrationScore: { type: Number, default: 0 } // 0 to 100
    },

    // Visual Chat Replay Dialogue Stream
    dialogue: [{
        sender: { type: String, enum: ['user', 'bot', 'system'], default: 'user' },
        text: String,
        intent: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    sentiment: { type: String, default: 'Neutral' }, // Positive, Neutral, Frustrated
    lastIntent: { type: String, default: '' },
    isConvertedLead: { type: Boolean, default: false },
    leadSummary: {
        name: String,
        phone: String,
        email: String,
        branch: String
    },

    // Session Life Cycle
    startTime: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
