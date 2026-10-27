const { UAParser } = require('ua-parser-js');

// In-memory cache for IP geo lookups to prevent rate limiting & speed up response times
const geoCache = new Map();

function extractClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const list = forwarded.split(',').map(s => s.trim());
        for (const ip of list) {
            if (!isPrivateIp(ip)) return ip;
        }
        return list[0];
    }
    return req.headers['cf-connecting-ip'] || 
           req.headers['x-real-ip'] || 
           req.socket?.remoteAddress || 
           req.connection?.remoteAddress || 
           '127.0.0.1';
}

function isPrivateIp(ip) {
    if (!ip) return true;
    const cleanIp = ip.replace(/^::ffff:/, '');
    return cleanIp === '127.0.0.1' || 
           cleanIp === '::1' || 
           cleanIp.startsWith('10.') || 
           cleanIp.startsWith('192.168.') || 
           cleanIp.startsWith('172.16.') || 
           cleanIp.startsWith('172.31.');
}

async function resolveGeoLocation(req, clientIp) {
    // 1. Check if running on Vercel (Native Edge Headers - Zero Latency)
    if (req.headers['x-vercel-ip-country']) {
        return {
            ip: clientIp,
            country: req.headers['x-vercel-ip-country'] === 'IN' ? 'India' : (req.headers['x-vercel-ip-country'] || 'India'),
            countryCode: req.headers['x-vercel-ip-country'] || 'IN',
            region: decodeURIComponent(req.headers['x-vercel-ip-country-region'] || 'Karnataka'),
            city: decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Bangalore'),
            lat: parseFloat(req.headers['x-vercel-ip-latitude']) || 12.9716,
            lon: parseFloat(req.headers['x-vercel-ip-longitude']) || 77.5946,
            isp: 'Vercel Edge Network',
            org: 'RVCE Visitor'
        };
    }

    // 2. If localhost / private IP, supply Bangalore (RVCE primary base)
    if (isPrivateIp(clientIp)) {
        return {
            ip: clientIp,
            country: 'India',
            countryCode: 'IN',
            region: 'Karnataka',
            city: 'Bengaluru',
            lat: 12.9249,
            lon: 77.4987,
            isp: 'RVCE Local Campus / Dev',
            org: 'RV College of Engineering'
        };
    }

    // 3. Check memory cache
    if (geoCache.has(clientIp)) {
        return geoCache.get(clientIp);
    }

    // 4. Fallback lookup via IP-API (free, accurate, fast)
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,regionName,city,lat,lon,isp,org`, {
            signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                const geo = {
                    ip: clientIp,
                    country: data.country || 'India',
                    countryCode: data.countryCode || 'IN',
                    region: data.regionName || 'Karnataka',
                    city: data.city || 'Bangalore',
                    lat: data.lat || 12.9716,
                    lon: data.lon || 77.5946,
                    isp: data.isp || '',
                    org: data.org || ''
                };
                geoCache.set(clientIp, geo);
                return geo;
            }
        }
    } catch (e) {
        // Silently fallback to defaults on network timeout
    }

    return {
        ip: clientIp,
        country: 'India',
        countryCode: 'IN',
        region: 'Karnataka',
        city: 'Bangalore',
        lat: 12.9716,
        lon: 77.5946,
        isp: 'Internet Provider',
        org: 'Visitor'
    };
}

const BOT_REGEX = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|semrushbot|ahrefsbot|bytespider|applebot|curl|wget|python|postman|insomnia|headlesschrome|phantomjs|lighthouse|mediapartners-google|facebookexternalhit|whatsapp|telegrambot|twitterbot|spider|crawl|bot)/i;

function detectBot(userAgentString = '', clientPayload = {}) {
    const ua = (userAgentString || '').trim();
    if (clientPayload.isBot === true) {
        return { isBot: true, botName: clientPayload.botName || 'Automated Bot', botCategory: 'Automated Bot' };
    }
    
    if (BOT_REGEX.test(ua)) {
        let name = 'Automated Bot';
        let category = 'Crawler / Scraper';

        if (/googlebot|mediapartners-google/i.test(ua)) { name = 'Googlebot'; category = 'Search Engine Indexer'; }
        else if (/bingbot/i.test(ua)) { name = 'Bingbot'; category = 'Search Engine Indexer'; }
        else if (/semrush/i.test(ua)) { name = 'SemrushBot'; category = 'SEO Crawler'; }
        else if (/ahrefs/i.test(ua)) { name = 'AhrefsBot'; category = 'SEO Crawler'; }
        else if (/bytespider/i.test(ua)) { name = 'ByteSpider'; category = 'Search Engine Indexer'; }
        else if (/python/i.test(ua)) { name = 'Python Script'; category = 'Scraper / Script'; }
        else if (/curl|wget/i.test(ua)) { name = 'cURL / CLI Request'; category = 'Scraper / Script'; }
        else if (/headlesschrome|puppeteer/i.test(ua)) { name = 'Headless Chrome / Puppeteer'; category = 'Headless Automation'; }
        else if (/postman|insomnia/i.test(ua)) { name = 'API Client'; category = 'API Client'; }
        else if (/facebookexternalhit|whatsapp|telegrambot|twitterbot/i.test(ua)) { name = 'Social Media Preview Bot'; category = 'Social Crawler'; }
        else if (/applebot/i.test(ua)) { name = 'Applebot'; category = 'Search Engine Indexer'; }
        else if (/duckduckbot/i.test(ua)) { name = 'DuckDuckBot'; category = 'Search Engine Indexer'; }
        else if (/yandex/i.test(ua)) { name = 'YandexBot'; category = 'Search Engine Indexer'; }

        return { isBot: true, botName: name, botCategory: category };
    }

    return { isBot: false, botName: 'Real User', botCategory: 'Human' };
}

function parseDeviceEnvironment(userAgentString, clientPayload = {}) {
    const parser = new UAParser(userAgentString || '');
    const result = parser.getResult();
    const botInfo = detectBot(userAgentString, clientPayload);

    let deviceType = botInfo.isBot ? 'Bot / Crawler' : 'Desktop';
    if (!botInfo.isBot) {
        if (result.device.type === 'mobile' || clientPayload.isMobile) {
            deviceType = 'Mobile';
        } else if (result.device.type === 'tablet' || clientPayload.isTablet) {
            deviceType = 'Tablet';
        } else if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgentString)) {
            deviceType = 'Mobile';
        }
    }

    return {
        type: deviceType,
        vendor: result.device.vendor || clientPayload.vendor || '',
        model: result.device.model || clientPayload.model || '',
        os: result.os.name || clientPayload.os || (botInfo.isBot ? 'Bot Server' : 'Unknown'),
        osVersion: result.os.version || '',
        browser: result.browser.name || clientPayload.browser || (botInfo.isBot ? botInfo.botName : 'Unknown Browser'),
        browserVersion: result.browser.version ? result.browser.version.split('.')[0] : '',
        screen: clientPayload.screen || '1920x1080',
        viewport: clientPayload.viewport || '1920x1080',
        devicePixelRatio: clientPayload.devicePixelRatio || 1,
        language: clientPayload.language || 'en-US',
        isBot: botInfo.isBot,
        botName: botInfo.botName,
        botCategory: botInfo.botCategory
    };
}

module.exports = {
    extractClientIp,
    resolveGeoLocation,
    detectBot,
    parseDeviceEnvironment
};

