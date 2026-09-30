# Novinax - Production Incident Live Triage & War Room Dashboard

**Novinax** is a unified, real-time developer war room and incident triage dashboard. It aggregates the 5 critical dimensions of production incident debugging into a single real-time glassmorphic interface with bidirectional live updates and manual editing capabilities.

---

## 🌟 Key Features & Unified Views

### 1. 📜 Live Logs Stream & Explorer
- **Real-Time Streaming**: Live multi-service log ingestion (`payment-gateway`, `webhook-consumer`, `ingress-nginx`, `redis-cluster`, `order-db-proxy`).
- **Interactive Controls**: Auto-scroll toggle, keyword/regex filter, log level selector (`FATAL`, `ERROR`, `WARN`, `INFO`, `DEBUG`).
- **Manual Actions**:
  - **Pin to Timeline**: Pin key logs directly into the incident timeline.
  - **Inline Annotations**: Add developer hypotheses or notes directly onto any log line.
  - **Manual Ingestion**: Inject custom log lines during postmortems or reproduction drills.

### 2. 🔴 Error Messages & Stack Trace Analyzer
- **Exception Aggregation**: Real-time error rate counters, affected endpoints, and distributed Trace IDs.
- **Deep Call Stacks**: Expandable, syntax-formatted stack traces for fast root cause pinpointing.
- **Manual Actions**:
  - **Root Cause Candidate Flagging**: Mark primary root cause exceptions with a single click.
  - **Developer Hypotheses**: Attach notes and triage insights to individual exceptions.
  - **Manual Exception Reporting**: Add newly discovered errors or client-reported issues on the fly.

### 3. 🚀 Deployment Pipeline & CI/CD State
- **Release Tracking**: Active release tag (`v2.14.8-hotfix-3`) vs target rollback version (`v2.14.7-prod`), deployer info, and pipeline run IDs.
- **Infrastructure Health**: Real-time pod ready ratio, degraded counts, and CrashLoop restart counters.
- **Manual Actions**:
  - **1-Click Emergency Rollback**: One-click rollback simulation with automated cluster rollout execution, timeline logging, and zero-downtime traffic verification.
  - **Deployment Metadata Editor**: Edit target releases, deployment notes, and helm diffs.

### 4. 🔄 Recent Changes & Suspect Commit Correlation
- **Change Timeline**: Correlate Git commits, Pull Requests, Feature Flags, and Terraform/Kubernetes changes leading up to the incident.
- **Suspect Correlation Engine**: AI/heuristic match scores correlating commit timestamps to error spike onsets.
- **Code Diff Viewer**: Embedded inline diff viewer showing exact suspect configuration lines.
- **Manual Actions**:
  - Toggle suspect state ("Suspected Cause" / "Cleared").
  - Add new commits or config changes manually.

### 5. 📚 Previous Incidents & Interactive Runbooks
- **Historical Matching**: Automatic pattern matching against past postmortems with similarity scores, past resolution times, and remediations.
- **Executable Runbooks**: Step-by-step interactive mitigation playbooks (e.g., Redis pool expansion, Kafka consumer drain, heapdump capture).
- **Manual Actions**:
  - Link/unlink historical incidents.
  - Check off runbook step progress (`Pending` ➔ `In Progress` ➔ `Done`).
  - Copy automated CLI commands to clipboard.
  - Add custom playbook steps during live triage.

### 6. ✍️ Manual Editing & Postmortem Hub
- **Incident Metadata**: Edit title, severity (P1/P2/P3/P4), status (Investigating/Identified/Monitoring/Resolved), commander, and financial impact.
- **Live Scratchpad**: Collaborative markdown notes editor for active responders.
- **Timeline Logger**: Real-time manual and automated event logger.
- **Postmortem Report Generator**: 1-click generation of formatted Markdown reports ready for Jira, Confluence, GitHub, or Print/PDF export.
- **Live Simulation Engine**:
  - Pause / Resume live streaming telemetry.
  - "Simulate Spike" chaos test button to test team alerting response.
  - Active incident elapsed timer.

---

## 🚀 Running Locally

The project is zero-dependency and runs with standard web browsers:

```bash
# Start a local web server
python -m http.server 3000 --bind 127.0.0.1
```

Open your browser at:
`http://127.0.0.1:3000/index.html`

---

## 📁 File Structure

- [`index.html`](file:///e:/Novintix_task/index.html) - Unified War Room interface, responsive navigation tabs, live mini charts, and modal editors.
- [`styles.css`](file:///e:/Novintix_task/styles.css) - Cyber-ops dark glassmorphism theme, glowing severity badges, responsive layout.
- [`app.js`](file:///e:/Novintix_task/app.js) - Reactive state engine, Chart.js telemetry, live stream generator, and CRUD action handlers.
- [`data.js`](file:///e:/Novintix_task/data.js) - Realistic incident datasets (Payment Gateway timeout, Auth Service OOMKill, Redis pool exhaustion), log templates, and historical postmortems.
