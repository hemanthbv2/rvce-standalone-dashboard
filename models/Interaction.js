const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    instituteId: { type: String, default: 'rvce' },
    eventType: { type: String, required: true, index: true }, // message, click, button_click, link_click, page_redirect, rage_click, dead_click, page_visit, hover, copy, scroll, dwell
    interactionId: { type: String, default: '' }, // intent name or action tag
    stepIndex: { type: Number, default: 1 },
    queryText: { type: String, default: '' },
    botReply: { type: String, default: '' },
    
    // Page & Navigation Context
    pageUrl: { type: String, default: '' },
    pagePath: { type: String, default: '' },
    pageTitle: { type: String, default: '' },
    
    // Link & Redirection Details (Exact URL, Link text, Redirected to)
    linkUrl: { type: String, default: '' },
    linkText: { type: String, default: '' },
    targetUrl: { type: String, default: '' },
    fromUrl: { type: String, default: '' },
    isExternal: { type: Boolean, default: false },

    // Button Details
    buttonText: { type: String, default: '' },
    location: { type: String, default: 'Chatbot' }, // Chatbot, Webpage, Header, CTA
    
    // Element data for Clarity replay & clickmaps
    element: {
        tag: { type: String, default: '' },
        id: { type: String, default: '' },
        className: { type: String, default: '' },
        text: { type: String, default: '' },
        xpath: { type: String, default: '' },
        isDeadClick: { type: Boolean, default: false }
    },

    sentiment: { type: String, default: 'neutral' }, // positive, neutral, negative
    isUnanswered: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    
    metaData: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Interaction', interactionSchema);
