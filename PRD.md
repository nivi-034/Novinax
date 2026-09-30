# Product Requirements Document (PRD)

## Project Name: Novinax — Production Incident Live Triage & War Room Dashboard
**Document Version:** 1.0.0  
**Author:** Nivetha (Staff SRE / Product Owner)  
**Status:** Approved / Live  
**Repository:** [https://github.com/nivi-034/Novinax](https://github.com/nivi-034/Novinax)  

---

## 1. Executive Summary

During critical production outages, engineering and SRE teams face severe cognitive overload due to fragmented tooling. Responders typically juggle 5–8 disparate browser tabs (Datadog/Grafana for metrics, Elasticsearch/CloudWatch for logs, Sentry for exception traces, ArgoCD/GitHub Actions for deployment states, GitHub PRs for recent code diffs, and Confluence/Jira for past postmortems).

**Novinax** solves this by delivering a **Unified Real-Time Incident War Room & Live Triage Dashboard** that consolidates all 5 incident diagnostic pillars into a single reactive pane of glass with bi-directional manual editing capabilities, live telemetry streaming, and an eye-tracking friendly light pastel visual hierarchy.

---

## 2. Problem Statement & Pain Points

| Current Pain Point | Impact on Engineering Teams | How Novinax Solves It |
| :--- | :--- | :--- |
| **Tool Sprawl & Context Switching** | Responders waste 15–30 minutes navigating between disconnected observability and CI/CD tools. | Consolidates Logs, Errors, Deployments, Git Diffs, and Past Postmortems in a single unified view. |
| **High Mean Time to Detect (MTTD) & Resolve (MTTR)** | Root cause hypotheses are scattered across Slack threads and terminal tabs. | Automated commit-to-error correlation and 1-click **"Mark Root Cause Candidate"** tagging. |
| **Slow, High-Risk Rollback Execution** | Manually writing `kubectl` rollout commands or finding rollback commit SHAs causes delays. | **1-Click Emergency Rollback** button with pre-cached image verification and automated audit logging. |
| **Responder Eye Strain & Visual Fatigue** | Harsh high-contrast dark terminals or blinding pure-white dashboards cause fatigue during long on-call war rooms. | **Ergonomic Light Pastel Theme** (`#f4f6fb`) designed for long shifts and effortless eye tracking. |
| **Post-Incident Documentation Overhead** | Engineers spend hours reconstructing timelines from memory and chat logs. | Built-in live timeline logger and **1-Click Postmortem Markdown Exporter**. |

---

## 3. Target Audience & Personas

- **Primary Persona 1: On-Call Software Engineer (SWE)**
  - *Goal:* Quickly correlate a recent PR deployment with current 5xx error spikes and inspect exception stack traces.
- **Primary Persona 2: Incident Commander (Staff SRE)**
  - *Goal:* Maintain high-level operational situational awareness, assign responders, track financial burn rates, and execute emergency mitigations.
- **Primary Persona 3: Engineering Manager / VP of Engineering**
  - *Goal:* Monitor real-time user impact, customer degradation radius, and export structured postmortem reports for stakeholders.

---

## 4. Key Goals & Success Metrics (KPIs)

- **MTTR Reduction:** Reduce Mean Time to Resolution by **40%** through unified diagnostics.
- **Context Switching:** Reduce the number of tools accessed during an active P1/P2 outage from **6+ tools to 1 unified dashboard**.
- **Rollback Speed:** Execute zero-downtime rollback in **< 60 seconds**.
- **Postmortem Turnaround:** Generate initial postmortem draft in **< 5 minutes** post-incident resolution.

---

## 5. Functional Requirements: The 5 Core Incident Pillars

### Domain 1: Error Signatures & Exception Analyzer (Pastel Coral / Rose `#ffe4e6`)
- **FR-1.1:** Real-time aggregation of active error exceptions with occurrence rate counters (`req/s`) and distributed Trace IDs.
- **FR-1.2:** Expandable syntax-formatted stack traces showing exact file names and line numbers.
- **FR-1.3 (Manual Action):** 1-Click **"Mark Root Cause Candidate"** toggle to highlight primary suspect errors.
- **FR-1.4 (Manual Action):** Ability to attach and edit inline developer hypotheses.
- **FR-1.5 (Manual Action):** Modal form to report/inject manual exceptions reported by clients.

### Domain 2: Live Ingestion Logs Stream Explorer (Pastel Powder Sky `#e0f2fe`)
- **FR-2.1:** Streaming multi-service log ingestion (`payment-gateway`, `webhook-consumer`, `ingress-nginx`, `redis-cluster`, `order-db-proxy`).
- **FR-2.2:** Real-time query bar supporting keyword and regex search.
- **FR-2.3:** Log level filtering dropdown (`FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`).
- **FR-2.4:** Auto-scroll toggle and buffer management (latest 50 logs).
- **FR-2.5 (Manual Action):** Pin critical log lines to the official incident timeline.
- **FR-2.6 (Manual Action):** Add developer annotations directly onto log rows.

### Domain 3: Deployment State & Emergency Rollback (Pastel Lavender `#f3e8ff`)
- **FR-3.1:** Display active release version (`v2.14.8-hotfix-3`) vs target rollback version (`v2.14.7-prod`).
- **FR-3.2:** Real-time cluster pod health metrics (ready pods, degraded pods, CrashLoop restart count).
- **FR-3.3:** Helm / ConfigMap values diff inspector.
- **FR-3.4 (Manual Action):** **1-Click Emergency Rollback** execution with audit logging, rolling restart policy, and status transition to `Monitoring`.
- **FR-3.5 (Manual Action):** Edit deployment version metadata and deployment notes.

### Domain 4: Recent Changes & Suspect Correlation (Pastel Peach `#fef3c7`)
- **FR-4.1:** Chronological feed of recent Git commits, Pull Requests, Feature Flags, and Terraform infra modifications within the last 4 hours.
- **FR-4.2:** Automated **Suspect Correlation Score (%)** based on commit merge time relative to error spike onset.
- **FR-4.3:** Embedded inline code diff viewer highlighting modified configuration lines.
- **FR-4.4 (Manual Action):** Toggle suspect probability state (`Suspected Cause` vs `Cleared`).
- **FR-4.5 (Manual Action):** Record custom commit or config changes manually.

### Domain 5: Historical Incidents & Playbook Execution (Pastel Mint `#dcfce7`)
- **FR-5.1:** Match current symptoms against historical incident database with similarity match scoring (`92% Match`).
- **FR-5.2:** Display past root cause summaries and remediation steps highlighted in distinct forest green (`#3a7650`).
- **FR-5.3:** Interactive executable runbook checklist (`Pending` ➔ `In Progress` ➔ `Done`).
- **FR-5.4 (Manual Action):** Copy pre-filled CLI / kubectl commands to clipboard with 1-click.
- **FR-5.5 (Manual Action):** Link historical incidents or add new runbook steps on the fly.

---

## 6. Incident Commander & Collaborative Hub

- **FR-6.1 (Incident Switcher):** Dropdown selector to switch between active incidents or declare a new incident.
- **FR-6.2 (Live Elapsed Timer):** Live ticking incident duration timer (`HH:MM:SS`).
- **FR-6.3 (Telemetry Chart):** Real-time mini sparkline chart tracking HTTP 5xx error rates with custom sampling intervals.
- **FR-6.4 (Chaos Simulation):** **"Simulate Spike"** button to inject sudden error surges for chaos drills.
- **FR-6.5 (Live Stream Toggle):** Pause / Resume live streaming telemetry.
- **FR-6.6 (Collaborative Scratchpad):** Real-time Markdown notes editor for hypotheses and responder handoffs.
- **FR-6.7 (Postmortem Generator):** 1-Click Markdown postmortem exporter compatible with Jira, Confluence, and GitHub Discussions, plus Print/PDF export.

---

## 7. UI/UX Design System & Ergonomic Pastel Palette

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   NOVINAX THEME TOKENS                                  │
├───────────────────────┬──────────────────────┬────────────────────┬─────────────────────┤
│ UI Element            │ Background Color     │ Border Color       │ Text / Accent Color │
├───────────────────────┼──────────────────────┼────────────────────┼─────────────────────┤
│ Background Canvas     │ #f4f6fb (Anti-glare) │ —                  │ #0f172a (Slate)     │
│ Panel Cards           │ #ffffff (Clean White)│ #e2e8f0            │ #334155 (Body)      │
│ Domain 1: Errors      │ #ffe4e6 (Coral)      │ #fecdd3            │ #9f1239 / #e11d48   │
│ Domain 2: Logs        │ #e0f2fe (Sky Blue)   │ #bae6fd            │ #0369a1 / #0284c7   │
│ Domain 3: Deploy      │ #f3e8ff (Lavender)   │ #e9d5ff            │ #6b21a8 / #9333ea   │
│ Domain 4: Changes     │ #fef3c7 (Peach)      │ #fde68a            │ #92400e / #d97706   │
│ Domain 5: History     │ #dcfce7 (Mint)       │ #bbf7d0            │ #166534 / #16a34a   │
│ Remediation Line      │ rgba(16,185,129,0.08)│ rgba(16,185,129,0.2│ #3a7650 (Forest)    │
└───────────────────────┴──────────────────────┴────────────────────┴─────────────────────┘
```

---

## 8. Non-Functional Requirements (NFRs)

- **Performance & Latency:** Zero-build client-side architecture loads in **< 400ms** with zero server roundtrips for state updates.
- **Data Persistence:** Automatic local persistence using browser `localStorage` to preserve user edits across page reloads.
- **Browser Compatibility:** Google Chrome, Mozilla Firefox, Microsoft Edge, and Apple Safari (modern ECMAScript 6+).
- **Responsive Layout:** Adaptive CSS Grid layout supporting desktop war room monitors (1920x1080+) down to laptop viewports (1280x800).

---

## 9. Future Roadmap

- [ ] **v1.1:** Webhook integration for bidirectional Slack & PagerDuty notifications.
- [ ] **v1.2:** Direct Prometheus / Datadog APM API ingestion adapter.
- [ ] **v1.3:** Kubernetes Operator for native in-cluster deployment and automatic CRD synchronization.
- [ ] **v1.4:** AI-assisted Root Cause Synthesis correlating log stack traces directly with Git PR code diffs.
