/**
 * RVCE Clarity-Grade Chatbot & Visitor Telemetry Tracker v3.5
 * Dual-Write Architecture (Standalone Command Center + WordPress REST API):
 * - Chat Lifecycle: Chat Start (bot_open), In-Chat Activity, Chat End (bot_close & dwell duration)
 * - Micro-Interactions: User Queries, Bot Replies, Chips, Links & Button Clicks
 * - Friction Diagnostics: Rage Clicks (<600ms), Dead Clicks, Typing Hesitations (>4.5s)
 * - 30-Minute Sliding Window Session Persistence Across Pages
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
    const isClientBot = !!navigator.webdriver || /HeadlessChrome|PhantomJS|bot|crawl|spider|slurp/i.test(navigator.userAgent);
    const deviceEnv = {
        screen: window.screen ? `${window.screen.width}x${window.screen.height}` : '1920x1080',
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio || 1,
        language: navigator.language || 'en-US',
        isMobile: /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent),
        connection: navigator.connection ? navigator.connection.effectiveType : 'unknown',
        isBot: isClientBot,
        botName: isClientBot ? 'Client Automated Agent' : ''
    };

    // Helper to retrieve endpoints
    function getEndpoints() {
        let centralBase = '';
        if (window.rvceChatbotSettings && window.rvceChatbotSettings.vercelUrl) {
            centralBase = window.rvceChatbotSettings.vercelUrl;
        } else if (window.RVCE_TELEMETRY_URL) {
            centralBase = window.RVCE_TELEMETRY_URL;
        } else if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
            centralBase = 'http://localhost:3001';
        } else {
            centralBase = window.location.origin;
        }

        const wpRestUrl = (window.rvceChatbotSettings && window.rvceChatbotSettings.restUrl)
            ? window.rvceChatbotSettings.restUrl.replace(/\/$/, '')
            : '';

        return {
            centralUrl: centralBase.replace(/\/+$/, ''),
            wpRestUrl: wpRestUrl
        };
    }

    const config = {
        instituteId: 'rvce',
        apiKey: 'rvce_key_12345',
        batchInterval: 3000,
        maxBatchSize: 10
    };

    let eventQueue = [];
    let flushTimer = null;
    let pageStartTime = Date.now();
    let botOpenTime = 0;
    let messageCountInSession = 0;
    let clickHistory = [];
    let activeInputHesitationTimer = null;
    let lastDraftText = '';

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
            location: details.location || (eventType.includes('bot') || eventType === 'message' ? 'Chatbot' : 'Webpage'),

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

        if (eventQueue.length >= config.maxBatchSize || eventType === 'message' || eventType === 'bot_open' || eventType === 'bot_close' || eventType === 'link_click') {
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

        const { centralUrl, wpRestUrl } = getEndpoints();
        const payloadObj = {
            instituteId: config.instituteId,
            institute_id: config.instituteId,
            apiKey: config.apiKey,
            api_key: config.apiKey,
            sessionId: sessionId,
            events: [...eventQueue]
        };
        const payloadStr = JSON.stringify(payloadObj);
        eventQueue = [];

        // 1. Send to Central Dashboard API (/api/logs)
        if (centralUrl) {
            const targetUrl = centralUrl + '/api/logs';
            if (isBeacon && navigator.sendBeacon) {
                try {
                    const blob = new Blob([payloadStr], { type: 'application/json' });
                    navigator.sendBeacon(targetUrl, blob);
                } catch (err) {}
            } else {
                fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payloadStr,
                    keepalive: true
                }).catch(() => {});
            }
        }

        // 2. Dual-Write to Local WordPress REST API (/wp-json/rvce/v1/logs)
        if (wpRestUrl) {
            fetch(wpRestUrl + '/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payloadStr,
                keepalive: true
            }).catch(() => {});
        }
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
        const inChat = !!target.closest('#rvce-chatbot-root, #chatWindow, .chat-window, #chatFab, .chat-fab');
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

        // B. BUTTON & CHIP CLICK DETECTION
        const btn = target.closest('button, [role="button"], .suggestion-chip, .quick-reply, .action-chip');
        if (btn && !link) {
            const btnText = (btn.innerText || btn.value || btn.title || 'Button').trim();
            const btnId = btn.id || btn.dataset.query || 'btn';
            trackEvent('button_click', `click:${btnId}`, `Clicked button: "${btnText}"`, {
                buttonText: btnText,
                buttonId: btnId,
                location: loc
            });
        }

        // C. RAGE CLICK DETECTION (>= 4 clicks in 600ms on the same element)
        clickHistory.push({ time: now, target: target });
        const recentClicks = clickHistory.filter(c => (now - c.time) < 600 && c.target === target);
        if (recentClicks.length >= 4) {
            const elemDesc = target.innerText ? target.innerText.substring(0, 30).trim() : (target.tagName.toLowerCase() + (target.className ? '.' + target.className : ''));
            trackEvent('rage_click', 'friction:rage', `Rage Click (${recentClicks.length} clicks in 600ms) on "${elemDesc}"`, {
                clickCount: recentClicks.length,
                elementTag: target.tagName,
                elementText: elemDesc,
                location: loc
            });
            clickHistory = [];
        }
        if (clickHistory.length > 20) clickHistory.shift();

        // D. DEAD CLICK DETECTION (Clicks on static text bubbles)
        const isDeadCandidate = target.closest('.chat-bubble, .msg, .message-bot, .response-bubble');
        if (isDeadCandidate && !target.closest('a') && !target.closest('button') && !target.closest('.suggestion-chip')) {
            const bubbleSnippet = (target.innerText || '').substring(0, 40).trim();
            if (bubbleSnippet) {
                trackEvent('dead_click', 'friction:dead', `Dead Click on static chat bubble: "${bubbleSnippet}"`, {
                    snippet: bubbleSnippet,
                    location: 'Chatbot'
                });
            }
        }
    });

    // 3. Typing Hesitation & Message Abandonment Watcher
    document.addEventListener('input', function(e) {
        const target = e.target;
        const isChatInput = target.closest('#rvce-chatbot-root, #chatWindow, .chat-window') || 
                            target.id === 'userInput' || target.id === 'chatInput' || target.classList.contains('chat-input');
        if (!isChatInput) return;

        const currentVal = target.value || '';
        if (currentVal.length > 6) {
            lastDraftText = currentVal;
            if (activeInputHesitationTimer) clearTimeout(activeInputHesitationTimer);
            activeInputHesitationTimer = setTimeout(() => {
                target.dataset.hesitationArmed = 'true';
            }, 4500);
        } else if (currentVal.length === 0 && target.dataset.hesitationArmed === 'true') {
            target.dataset.hesitationArmed = 'false';
            trackEvent('typing_hesitation', 'chat_hesitation', 'Student hesitated & deleted draft message without sending', {
                draftLength: lastDraftText.length,
                draftSnippet: lastDraftText.substring(0, 40) + '...',
                location: 'Chatbot'
            });
            flushQueue();
            lastDraftText = '';
        }
    });

    // 4. Page Exit / Unload Watcher
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

    // 5. Automatic Chatbot Window Observer (Tracks Start & End Lifecycle)
    function initChatObserver() {
        const chatW = document.getElementById('chatWindow') || document.querySelector('.chat-window');
        if (chatW) {
            const observer = new MutationObserver(() => {
                const isOpen = chatW.classList.contains('open');
                if (isOpen && !botOpenTime) {
                    botOpenTime = Date.now();
                    trackEvent('bot_open', 'open_chatbot', 'Visitor opened the RVCE Chatbot Widget', {
                        location: 'Chatbot',
                        pageUrl: window.location.href
                    });
                    flushQueue();
                } else if (!isOpen && botOpenTime) {
                    const dwellSec = Math.round((Date.now() - botOpenTime) / 1000);
                    const isBounce = dwellSec < 5 && messageCountInSession === 0;
                    trackEvent(isBounce ? 'bot_bounce' : 'bot_close', isBounce ? 'bot_bounce' : 'close_chatbot',
                        isBounce ? 'Visitor opened and instantly closed chatbot without asking (Bounce)' : 'Visitor closed the RVCE Chatbot Widget', {
                        location: 'Chatbot',
                        dwellSeconds: dwellSec,
                        openDurationSeconds: dwellSec,
                        isBounce: isBounce,
                        totalMessages: messageCountInSession
                    });
                    botOpenTime = 0;
                    flushQueue();
                }
            });
            observer.observe(chatW, { attributes: true, attributeFilter: ['class'] });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChatObserver);
    } else {
        initChatObserver();
    }

    // 6. Global Backward-Compatible Interface for script.js
    window.rvceTrackEvent = function(eventType, eventData = {}) {
        if (eventType === 'message') {
            messageCountInSession++;
            trackEvent('message', eventData.intent || 'chat_message', eventData.query || '', {
                botReply: eventData.botReply || '',
                location: 'Chatbot',
                ...eventData
            });
        } else if (eventType === 'click') {
            trackEvent('button_click', 'click:' + (eventData.elementId || 'action'), eventData.elementText || '', {
                buttonText: eventData.elementText || '',
                location: 'Chatbot',
                ...eventData
            });
        } else {
            trackEvent(eventType, eventType, eventData.query || eventData.label || eventType, eventData);
        }
    };

    // 7. Public Telemetry API for Direct Control
    window.RVCETelemetry = {
        trackBotOpen: (pageUrl) => {
            botOpenTime = Date.now();
            trackEvent('bot_open', 'open_chatbot', 'Visitor opened the RVCE Chatbot Widget', {
                location: 'Chatbot',
                pageUrl: pageUrl || window.location.href
            });
            flushQueue();
        },
        trackBotClose: () => {
            const dwellSec = botOpenTime > 0 ? Math.round((Date.now() - botOpenTime) / 1000) : 0;
            const isBounce = dwellSec < 5 && messageCountInSession === 0;
            trackEvent(isBounce ? 'bot_bounce' : 'bot_close', isBounce ? 'bot_bounce' : 'close_chatbot',
                isBounce ? 'Visitor opened and instantly closed chatbot without asking (Bounce)' : 'Visitor closed the RVCE Chatbot Widget', {
                location: 'Chatbot',
                dwellSeconds: dwellSec,
                openDurationSeconds: dwellSec,
                isBounce: isBounce,
                totalMessages: messageCountInSession
            });
            botOpenTime = 0;
            flushQueue();
        },
        trackMessage: (query, intent, botReply) => {
            messageCountInSession++;
            trackEvent('message', intent || 'chat_message', query, {
                botReply: botReply,
                location: 'Chatbot',
                messageTurn: messageCountInSession
            });
            flushQueue();
        },
        getSessionId: () => sessionId
    };

})(window);
