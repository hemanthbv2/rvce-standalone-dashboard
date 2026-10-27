/**
 * RVCE Clarity-Grade Chatbot & Visitor Telemetry Tracker v3.0
 * Comprehensive Clickstream & Journey Tracker:
 * - What query user gives
 * - What button user clicks (with exact text and location)
 * - Which link user clicked (with destination URL and target)
 * - Which page user was redirected to
 * - Rage Clicks & Dead Clicks
 * - Exit Page & Full Chronological Journey
 */
(function(window) {
    'use strict';

    // 1. Sliding Window Session Identification (30-Minute Continuity Across Pages & Tabs)
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const now = Date.now();
    let storedSessionId = localStorage.getItem('rvce_chat_session_id') || sessionStorage.getItem('rvce_chat_session_id');
    let lastActive = parseInt(localStorage.getItem('rvce_session_last_active') || '0', 10);
    let isNewSession = false;

    if (!storedSessionId || (now - lastActive > SESSION_TIMEOUT_MS)) {
        storedSessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        isNewSession = true;
    }
    localStorage.setItem('rvce_chat_session_id', storedSessionId);
    sessionStorage.setItem('rvce_chat_session_id', storedSessionId);
    localStorage.setItem('rvce_session_last_active', now.toString());
    let sessionId = storedSessionId;

    // Step Counter
    let currentStep = parseInt(sessionStorage.getItem('rvce_step_count') || '0', 10);
    function nextStep() {
        currentStep++;
        sessionStorage.setItem('rvce_step_count', currentStep.toString());
        return currentStep;
    }

    // 2. Landing Page & Referrer
    let landingPage = sessionStorage.getItem('rvce_landing_page');
    if (!landingPage) {
        landingPage = window.location.href;
        sessionStorage.setItem('rvce_landing_page', landingPage);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const utm = {
        source: urlParams.get('utm_source') || '',
        medium: urlParams.get('utm_medium') || '',
        campaign: urlParams.get('utm_campaign') || '',
        term: urlParams.get('utm_term') || '',
        content: urlParams.get('utm_content') || ''
    };

    let rawReferrer = document.referrer || '';
    let referrerType = 'Direct';
    if (rawReferrer) {
        if (/google\./i.test(rawReferrer)) referrerType = 'Google Search';
        else if (/bing\./i.test(rawReferrer)) referrerType = 'Bing Search';
        else if (/instagram\./i.test(rawReferrer)) referrerType = 'Instagram';
        else if (/facebook\./i.test(rawReferrer)) referrerType = 'Facebook';
        else if (/linkedin\./i.test(rawReferrer)) referrerType = 'LinkedIn';
        else if (/youtube\./i.test(rawReferrer)) referrerType = 'YouTube';
        else if (/twitter|x\.com/i.test(rawReferrer)) referrerType = 'X (Twitter)';
        else {
            try { referrerType = new URL(rawReferrer).hostname; } catch(e) { referrerType = rawReferrer; }
        }
    }

    // 3. Device & Screen Environment
    const deviceEnv = {
        screen: window.screen ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        language: navigator.language || 'en-US',
        isMobile: /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent),
        connection: navigator.connection ? navigator.connection.effectiveType : 'unknown'
    };

    const config = {
        backendUrl: window.RVCE_TELEMETRY_URL || window.location.origin,
        instituteId: 'rvce',
        apiKey: 'rvce_key_12345',
        batchInterval: 3000,
        maxBatchSize: 10
    };

    let eventQueue = [];
    let flushTimer = null;
    let pageStartTime = Date.now();
    let scrollDepthsLogged = new Set();
    let clickHistory = [];
    let previousUrl = window.location.href;

    // --- Core Event Dispatcher ---
    function trackEvent(eventType, interactionId, queryText, details = {}) {
        const stepNum = nextStep();
        const event = {
            sessionId: sessionId,
            instituteId: config.instituteId,
            stepIndex: stepNum,
            eventType: eventType,
            interactionId: interactionId || eventType,
            queryText: queryText || '',
            botReply: details.botReply || '',
            pageUrl: window.location.href,
            pagePath: window.location.pathname,
            pageTitle: document.title,
            
            // Link & Redirection Data
            linkUrl: details.linkUrl || '',
            linkText: details.linkText || '',
            targetUrl: details.targetUrl || details.toUrl || '',
            fromUrl: details.fromUrl || '',
            isExternal: !!details.isExternal,
            buttonText: details.buttonText || '',
            location: details.location || 'Webpage',

            timestamp: new Date().toISOString(),
            metaData: {
                ...details,
                stepNumber: stepNum,
                referrer: rawReferrer,
                referrerType: referrerType,
                landingPage: landingPage,
                utm: utm,
                device: deviceEnv,
                timeOnPage: Math.round((Date.now() - pageStartTime) / 1000)
            }
        };

        eventQueue.push(event);

        if (eventQueue.length >= config.maxBatchSize || eventType === 'form_submit' || eventType === 'link_click' || eventType === 'page_redirect') {
            flushQueue();
        } else if (!flushTimer) {
            flushTimer = setTimeout(flushQueue, config.batchInterval);
        }
    }

    function flushQueue(isBeacon = false) {
        if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }

        if (eventQueue.length === 0) return;

        const payload = {
            instituteId: config.instituteId,
            apiKey: config.apiKey,
            sessionId: sessionId,
            events: [...eventQueue]
        };

        const targetUrl = config.backendUrl + '/api/logs';
        eventQueue = [];

        if (isBeacon && navigator.sendBeacon) {
            try {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(targetUrl, blob);
                return;
            } catch (err) {}
        }

        fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }

    // --- Automatic Micro-Interaction Listeners ---

    // 1. Initial Page Landing
    trackEvent('page_visit', 'page_load', `Landed on ${document.title || 'RVCE'}`, {
        isNewSession: isNewSession,
        landingPage: landingPage
    });

    // 2. Global Click Capture (Links, Buttons, Rage Clicks, Dead Clicks)
    document.addEventListener('click', function(e) {
        const now = Date.now();
        const target = e.target;
        const inChat = !!target.closest('#rvce-chat-modal, .chatbot-container, #rvce-widget-bubble');
        const loc = inChat ? 'Chatbot' : 'Webpage';

        // A. LINK CLICK DETECTION (Captures Exact Destination URL & Link Text)
        const link = target.closest('a');
        if (link && link.href) {
            const href = link.href;
            const linkText = (link.innerText || link.title || href).trim();
            const isExternal = link.hostname !== window.location.hostname;
            const redirectTarget = link.target || '_self';

            trackEvent('link_click', 'click:link', `Clicked link: "${linkText}" ➔ ${href}`, {
                linkUrl: href,
                linkText: linkText,
                targetUrl: href,
                isExternal: isExternal,
                redirectTarget: redirectTarget,
                location: loc,
                fromUrl: window.location.href
            });
        }

        // B. BUTTON CLICK DETECTION (Captures Exact Button Text & ID)
        const btn = target.closest('button, [role="button"], .chip, .act-btn, .test-btn');
        if (btn && !link) {
            const btnText = (btn.innerText || btn.value || btn.title || 'Button').trim();
            const btnId = btn.id || btn.className;

            trackEvent('button_click', `click:${btnId || 'btn'}`, `Clicked button: "${btnText}"`, {
                buttonText: btnText,
                buttonId: btnId,
                location: loc,
                elementTag: btn.tagName
            });
        }

        // C. DEAD CLICK DETECTION (Clicking non-clickable static element expecting response)
        const isClickable = target.closest('a, button, input, textarea, select, [role="button"], [onclick], .clickable, .chip');
        if (!isClickable && ['P', 'H1', 'H2', 'H3', 'DIV', 'SPAN', 'IMG'].includes(target.tagName)) {
            trackEvent('dead_click', `dead:${target.tagName.toLowerCase()}`, `Dead click on <${target.tagName.toLowerCase()}>`, {
                elementTag: target.tagName,
                elementText: (target.innerText || '').substring(0, 45),
                location: loc
            });
        }

        // D. RAGE CLICK DETECTION (3+ rapid clicks within 800ms)
        const targetDesc = target.id ? `#${target.id}` : (target.className ? `.${target.className.toString().split(' ')[0]}` : target.tagName.toLowerCase());
        clickHistory.push({ time: now, x: e.clientX, y: e.clientY, target: targetDesc });
        clickHistory = clickHistory.filter(c => now - c.time <= 800);

        if (clickHistory.length >= 3) {
            const first = clickHistory[0];
            const last = clickHistory[clickHistory.length - 1];
            const dist = Math.hypot(last.x - first.x, last.y - first.y);

            if (dist < 45) {
                trackEvent('rage_click', `rage:${targetDesc}`, `Rage click (rapid clicks) on ${targetDesc}`, {
                    clickCount: clickHistory.length,
                    elementText: (target.innerText || '').substring(0, 50),
                    elementTag: target.tagName,
                    location: loc
                });
                clickHistory = [];
            }
        }
    }, true);

    // 3. SPA & Redirection Tracking (Intercepts history.pushState, popstate, URL change)
    function checkUrlChange() {
        const currentUrl = window.location.href;
        if (currentUrl !== previousUrl) {
            trackEvent('page_redirect', 'nav_redirect', `Redirected from ${new URL(previousUrl).pathname} to ${window.location.pathname}`, {
                fromUrl: previousUrl,
                toUrl: currentUrl,
                fromPath: new URL(previousUrl).pathname,
                toPath: window.location.pathname
            });
            previousUrl = currentUrl;
        }
    }

    const origPush = history.pushState;
    if (origPush) {
        history.pushState = function() {
            const ret = origPush.apply(this, arguments);
            checkUrlChange();
            return ret;
        };
    }
    window.addEventListener('popstate', checkUrlChange);

    // 4. Scroll Depth Tracking
    function checkScrollDepth() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;

        const percent = Math.round((scrollTop / docHeight) * 100);
        [25, 50, 75, 100].forEach(milestone => {
            if (percent >= milestone && !scrollDepthsLogged.has(milestone)) {
                scrollDepthsLogged.add(milestone);
                trackEvent('scroll', `scroll_${milestone}`, `Scrolled ${milestone}% of page`, { depth: milestone });
            }
        });
    }
    window.addEventListener('scroll', checkScrollDepth, { passive: true });

    // 5. Copy Text Detection
    document.addEventListener('copy', function() {
        const selection = window.getSelection().toString().trim();
        if (selection && selection.length > 2) {
            trackEvent('copy', 'text_copy', `Copied text: "${selection.substring(0, 60)}"`, {
                copiedText: selection.substring(0, 160),
                length: selection.length
            });
        }
    });

    // 6. Page Exit / Drop-off Tracking
    function onPageLeave() {
        const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
        trackEvent('page_leave', 'exit_page', `Exited on ${window.location.pathname}`, {
            exitPage: window.location.href,
            exitPath: window.location.pathname,
            totalTimeOnPageSeconds: timeSpent
        });
        flushQueue(true);
    }

    window.addEventListener('beforeunload', onPageLeave);
    window.addEventListener('pagehide', onPageLeave);

    // 7. Public Telemetry API for RVCE Chatbot Widget
    window.RVCETelemetry = {
        trackBotOpen: (pageUrl) => {
            trackEvent('bot_open', 'open_chatbot', 'Visitor opened the RVCE Chatbot Widget', {
                location: 'Chatbot'
            });
            flushQueue();
        },
        trackMessage: (query, intent, botReply, linkContained = '') => {
            trackEvent('message', intent || 'chat_message', query, {
                botReply: botReply,
                linkContained: linkContained,
                location: 'Chatbot'
            });
            flushQueue();
        },
        trackButtonClick: (btnText, btnId = '', location = 'Chatbot') => {
            trackEvent('button_click', `click:${btnId || 'btn'}`, `Clicked button: "${btnText}"`, {
                buttonText: btnText,
                buttonId: btnId,
                location: location
            });
            flushQueue();
        },
        trackLinkClick: (url, linkText, target = '_blank') => {
            trackEvent('link_click', 'click:link', `Clicked link: "${linkText}" ➔ ${url}`, {
                linkUrl: url,
                linkText: linkText,
                targetUrl: url,
                redirectTarget: target,
                location: 'Chatbot'
            });
            flushQueue();
        },
        trackLead: (leadData) => {
            trackEvent('form_submit', 'lead_captured', 'Candidate submitted contact details', {
                leadData: leadData,
                location: 'Chatbot'
            });
            flushQueue();
        },
        trackRedirect: (fromPath, toPath) => {
            trackEvent('page_redirect', 'nav_redirect', `Redirected from ${fromPath} to ${toPath}`, {
                fromPath: fromPath,
                toPath: toPath
            });
            flushQueue();
        },
        trackInteraction: (eventType, desc, meta = {}) => {
            trackEvent(eventType, eventType, desc || eventType, meta);
            flushQueue();
        },
        getSessionId: () => sessionId
    };

})(window);
