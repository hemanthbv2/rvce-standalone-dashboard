const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, index: true },
    instituteId: { type: String, default: 'rvce' },
    name: { type: String, default: 'Enquiry Visitor' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    leadData: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    // Status & CRM Management
    status: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Enrolled', 'Junk'], default: 'New' },
    notes: { type: String, default: '' },
    score: { type: Number, default: 80 },

    // Clarity visitor attribution
    attribution: {
        referrer: { type: String, default: 'Direct' },
        entryPage: { type: String, default: '/' },
        landingUrl: { type: String, default: '' },
        utmSource: { type: String, default: '' },
        utmMedium: { type: String, default: '' },
        utmCampaign: { type: String, default: '' }
    },
    
    // Visitor location
    geo: {
        country: { type: String, default: 'India' },
        city: { type: String, default: 'Bengaluru' },
        region: { type: String, default: 'Karnataka' }
    },
    
    // Visitor device
    device: {
        type: { type: String, default: 'Desktop' },
        os: { type: String, default: 'Windows' },
        browser: { type: String, default: 'Chrome' }
    },
    
    createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Lead', leadSchema);
