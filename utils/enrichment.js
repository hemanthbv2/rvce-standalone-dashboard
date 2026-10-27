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

function parseDeviceEnvironment(userAgentString, clientPayload = {}) {
    const parser = new UAParser(userAgentString || '');
    const result = parser.getResult();

    let deviceType = 'Desktop';
    if (result.device.type === 'mobile' || clientPayload.isMobile) {
        deviceType = 'Mobile';
    } else if (result.device.type === 'tablet' || clientPayload.isTablet) {
        deviceType = 'Tablet';
    } else if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgentString)) {
        deviceType = 'Mobile';
    }

    return {
        type: deviceType,
        vendor: result.device.vendor || clientPayload.vendor || '',
        model: result.device.model || clientPayload.model || '',
        os: result.os.name || clientPayload.os || 'Unknown',
        osVersion: result.os.version || '',
        browser: result.browser.name || clientPayload.browser || 'Unknown Browser',
        browserVersion: result.browser.version ? result.browser.version.split('.')[0] : '',
        screen: clientPayload.screen || '1920x1080',
        viewport: clientPayload.viewport || '1920x1080',
        devicePixelRatio: clientPayload.devicePixelRatio || 1,
        language: clientPayload.language || 'en-US'
    };
}

module.exports = {
    extractClientIp,
    resolveGeoLocation,
    parseDeviceEnvironment
};
