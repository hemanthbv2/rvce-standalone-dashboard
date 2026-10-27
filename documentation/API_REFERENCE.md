# RVCE Standalone Command Center — API Reference

## Authentication

All endpoints under `/api/dashboard/*` require a Bearer token in the `Authorization` header.

```http
Authorization: Bearer <jwt_token>
```

### 1. Admin Login
- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "username": "rvceadmin",
    "password": "your_password"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "role": "admin",
    "username": "rvceadmin",
    "institution": "RV College of Engineering (Autonomous)",
    "expiresIn": "7d"
  }
  ```

---

## Telemetry Ingestion

### 2. Ingest Logs / Telemetry
- **Endpoint**: `POST /api/logs`, `POST /api/logs/batch`, `POST /api/telemetry`
- **Body**: Array of events or object with `events`:
  ```json
  {
    "sessionId": "sess_1730000000_abc123",
    "events": [
      {
        "eventType": "page_visit",
        "pageUrl": "https://rvce.edu.in/admissions",
        "pagePath": "/admissions",
        "timestamp": 1730000000000,
        "data": {
          "referrer": "https://google.com",
          "landingPage": "https://rvce.edu.in/"
        }
      }
    ]
  }
  ```

---

## Dashboard Analytics

### 3. Overview Metrics
- **Endpoint**: `GET /api/dashboard/overview?segment=all`
- **Query Parameters**:
  - `segment`: `all`, `users`, `conversed`, `opened`, `bots`
- **Response**:
  - Total sessions, interactions, live visitor count, rage click sessions, dead clicks, frustration index, device breakdown.

### 4. Clarity Insights
- **Endpoint**: `GET /api/dashboard/clarity?segment=all`
- **Returns**: Top entry/exit pages, top clicked links, button clicks, redirect journeys, rage click hotspots, dead click hotspots, and typing hesitations.

### 5. Sessions Explorer
- **Endpoint**: `GET /api/dashboard/sessions`
- **Query Parameters**:
  - `segment`: `all`, `users`, `conversed`, `opened`, `bots`
  - `filter`: `rage`, `mobile`, `desktop`
  - `search`: String matching session ID, city, or page
  - `limit`: Integer (default 100, max 300)

### 6. Single Session Detail
- **Endpoint**: `GET /api/dashboard/sessions/:id`
- **Returns**: Complete chronological journey replay, dialogue messages, clickstream steps, and environmental fingerprint.

### 7. Real-Time SSE Stream
- **Endpoint**: `GET /api/dashboard/live/stream`
- **Protocol**: `text/event-stream`
- **Events**: `connected`, `ping`, `telemetry`, `lead_update`, `data_seeded`.
