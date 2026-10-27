# RVCE Command Center & Telemetry Documentation

Welcome to the comprehensive documentation repository for the **RVCE Standalone Command Center & Microsoft Clarity-Grade Telemetry** system.

---

## 📁 Documentation Structure

- [ARCHITECTURE.md](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/ARCHITECTURE.md): System architecture, dual-storage design (Supabase + MongoDB + Resilient Memory Store), SSE streaming, and telemetry pipeline.
- [API_REFERENCE.md](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/API_REFERENCE.md): Complete REST & SSE API endpoints, payloads, query parameters, authentication, and responses.
- [DEPLOYMENT_GUIDE.md](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/DEPLOYMENT_GUIDE.md): Setup, environment variables, Supabase deployment, and client tracker embedding.
- [activity_log/](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/activity_log/): Sequential changelogs and audit records of all modifications, diagnoses, and enhancements.

---

## 🕒 Ongoing Activity Logs

| Date | Log File | Scope | Summary |
|---|---|---|---|
| 2026-10-28 | [2026-10-28_session_audit_and_supabase_readiness.md](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/activity_log/2026-10-28_session_audit_and_supabase_readiness.md) | Audit & Supabase Verification | Full codebase inspection, verified 3,149 Supabase sessions, diagnosed Mongo timeout fallback, structured documentation system. |
| 2026-10-28 | [2026-10-28_supabase_unified_resolver_and_latency_fix.md](file:///c:/Users/LENOVO/Downloads/rvce-standalone-dashboard-main/documentation/activity_log/2026-10-28_supabase_unified_resolver_and_latency_fix.md) | Performance & Unified Resolvers | Eliminated 30s Mongo connection timeout (login: 269ms), connected all dashboard endpoints to Supabase, added 15s in-memory caching, enabled full session journey replays. |

---

## 📌 Standard Operating Rule
Whenever updates, bug fixes, or enhancements are made to the codebase, a corresponding record is automatically logged in `documentation/activity_log/` with the timestamp, exact files modified, test results, and rationale.
