# RVCE Standalone Command Center — Architecture & Technical Specifications

## 1. System Overview

The **RVCE Standalone Command Center** is an autonomous, high-availability monitoring, analytics, and telemetry system specifically built for RV College of Engineering's chatbot and admissions portal.

```
                      +---------------------------------------+
                      |       Visitor Browser / Website       |
                      |  (RVCE Website, Admissions, Chatbot)  |
                      +---------------------------------------+
                                          |
                                          | clarity-telemetry.js
                                          | (batch POST /api/logs)
                                          v
                      +---------------------------------------+
                      |         Node.js / Express Server      |
                      |              (port 3001)              |
                      +---------------------------------------+
                               /          |          \
                              /           |           \
                    Dual-Write           Read       Real-Time SSE
                            /             |             \
                           v              v              v
                  +------------+    +-----------+   +---------------+
                  |  Supabase  |    |  MongoDB  |   | Admin Browser |
                  | PostgreSQL |    |   Atlas   |   |   Dashboard   |
                  +------------+    +-----------+   +---------------+
                           \              /
                            v            v
                   +-------------------------------+
                   | High-Availability MemStore    |
                   |       (Instant Fallback)      |
                   +-------------------------------+
```

---

## 2. Storage Strategy: Tri-Tier High Availability

To ensure zero downtime, the system employs three storage tiers:

1. **Supabase (PostgreSQL Cloud)**:
   - Primary cloud relational database.
   - Fast JSONB indexing for analytics queries.
   - Handles large-scale session history (3,100+ active records).

2. **MongoDB Atlas**:
   - Secondary document store.
   - Flexible document structure for rapid schema iteration.

3. **In-Memory Store (`memStore`)**:
   - Resilient memory cache with fallback seeds.
   - If both databases are unreachable or slow, the server guarantees 100% uptime with sub-millisecond responses.

---

## 3. Microsoft Clarity Telemetry Features

The tracking layer (`clarity-telemetry.js`) records:
- **Navigation Flow**: Entry Page, Exit Page, full path history.
- **Micro-Interactions**: Rage clicks (3+ clicks within 700ms on same element), Dead clicks (clicks on un-clickable elements).
- **Engagement**: Scroll depth thresholds (25%, 50%, 75%, 100%), text selection/copy events (e.g. fees, cutoffs, phone numbers).
- **Hesitation Tracking**: Typing pause duration before erasing input or sending.
- **Traffic Attribution**: Referrer categorization (Google Search, Direct, Socials, UTM Campaign tags).
- **Bot Detection**: Automated identification of search engine bots, scrapers, and headless crawlers.

---

## 4. Real-Time Streaming (SSE)

- Route: `/api/dashboard/live/stream`
- Protocol: Server-Sent Events (SSE)
- Pings live dashboard clients with instant updates when:
  - New visitor arrives
  - Rage click occurs
  - Lead form is submitted
  - Dialogue is initiated
