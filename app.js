// SentinelOps Incident War Room Application Logic

class IncidentWarRoomApp {
  constructor() {
    this.incidents = this.loadIncidents();
    this.currentIncidentId = this.incidents[0]?.id || "INC-4821";
    this.isStreamActive = true;
    this.streamInterval = null;
    this.timerInterval = null;
    this.chart = null;
    this.chartData = {
      labels: [],
      errorRate: [],
      latency: []
    };

    this.init();
  }

  loadIncidents() {
    const saved = localStorage.getItem("sentinelops_incidents_v2");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved incidents from localStorage:", e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_INCIDENTS));
  }

  saveIncidents() {
    localStorage.setItem("sentinelops_incidents_v2", JSON.stringify(this.incidents));
  }

  getCurrentIncident() {
    return this.incidents.find(inc => inc.id === this.currentIncidentId) || this.incidents[0];
  }

  init() {
    this.setupNavigation();
    this.setupEventListeners();
    this.populateIncidentDropdown();
    this.renderAll();
    this.initChart();
    this.startStreamingSimulation();
    this.startIncidentTimer();

    // Re-render Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  setupNavigation() {
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const targetTabId = btn.getAttribute("data-tab");
        document.querySelectorAll(".view-section").forEach(sec => {
          sec.classList.remove("active-view");
        });

        const targetSection = document.getElementById(targetTabId);
        if (targetSection) {
          targetSection.classList.add("active-view");
        }

        if (window.lucide) window.lucide.createIcons();
      });
    });
  }

  setupEventListeners() {
    // Incident dropdown
    const selectEl = document.getElementById("incident-select");
    selectEl.addEventListener("change", (e) => {
      this.currentIncidentId = e.target.value;
      this.renderAll();
      this.showToast(`Switched to incident ${this.currentIncidentId}`, "info");
    });

    // New incident button
    document.getElementById("btn-new-incident").addEventListener("click", () => {
      this.openCreateIncidentModal();
    });

    // Stream toggle
    document.getElementById("btn-toggle-stream").addEventListener("click", () => {
      this.toggleStreaming();
    });

    // Spike simulator
    document.getElementById("btn-trigger-spike").addEventListener("click", () => {
      this.simulateSpike();
    });

    // Edit incident modal
    document.getElementById("btn-edit-incident").addEventListener("click", () => {
      this.openEditIncidentModal();
    });

    // Quick edit title
    document.getElementById("quick-edit-title-btn").addEventListener("click", () => {
      this.openEditIncidentModal();
    });

    // Edit summary button
    document.getElementById("btn-edit-summary").addEventListener("click", () => {
      this.openEditIncidentModal();
    });

    // Instant rollback buttons
    document.getElementById("btn-instant-rollback").addEventListener("click", () => {
      this.openRollbackModal();
    });

    // Export postmortem button
    document.getElementById("btn-export-postmortem").addEventListener("click", () => {
      this.openPostmortemModal();
    });

    // Search filters for logs
    document.getElementById("warroom-log-search")?.addEventListener("input", () => this.renderLogs());
    document.getElementById("warroom-log-level-filter")?.addEventListener("change", () => this.renderLogs());
    document.getElementById("detailed-log-search")?.addEventListener("input", () => this.renderLogs());
    document.getElementById("detailed-log-service-filter")?.addEventListener("change", () => this.renderLogs());
    document.getElementById("detailed-log-level-filter")?.addEventListener("change", () => this.renderLogs());
  }

  populateIncidentDropdown() {
    const selectEl = document.getElementById("incident-select");
    selectEl.innerHTML = "";
    this.incidents.forEach(inc => {
      const opt = document.createElement("option");
      opt.value = inc.id;
      opt.textContent = `${inc.id}: [${inc.severity}] ${inc.title.substring(0, 48)}...`;
      if (inc.id === this.currentIncidentId) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  // ==========================================
  // RENDER MASTER
  // ==========================================
  renderAll() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    this.renderBanner(inc);
    this.renderErrors(inc);
    this.renderLogs(inc);
    this.renderDeployment(inc);
    this.renderChanges(inc);
    this.renderHistory(inc);
    this.renderTimelineAndNotes(inc);
    this.updateTabCounters(inc);

    if (window.lucide) window.lucide.createIcons();
  }

  renderBanner(inc) {
    document.getElementById("incident-id-display").textContent = inc.id;
    document.getElementById("incident-title-display").textContent = inc.title;
    document.getElementById("incident-summary-text").textContent = inc.summary || "No summary provided.";
    document.getElementById("incident-commander").textContent = inc.commander || "Unassigned";

    // Severity badge
    const sevBadge = document.getElementById("badge-severity");
    sevBadge.className = `badge badge-${inc.severity.toLowerCase()}`;
    sevBadge.textContent = `${inc.severity} ${inc.severity === 'P1' ? 'CRITICAL' : inc.severity === 'P2' ? 'HIGH' : 'MEDIUM'}`;

    // Status badge
    const statusBadge = document.getElementById("badge-status");
    statusBadge.className = `badge badge-status ${inc.status === 'Resolved' ? 'resolved' : ''}`;
    statusBadge.textContent = inc.status.toUpperCase();

    // Banner metrics
    document.getElementById("metric-service").textContent = inc.service;
    document.getElementById("metric-env").textContent = inc.environment;
    document.getElementById("metric-users").textContent = (inc.impactedUsers || 0).toLocaleString();
    document.getElementById("metric-financial").textContent = inc.financialImpact || "$0";
    document.getElementById("metric-version").textContent = inc.deployment?.activeRelease || "v1.0.0";
  }

  updateTabCounters(inc) {
    document.getElementById("tab-count-errors").textContent = inc.errors?.length || 0;
    document.getElementById("tab-count-logs").textContent = inc.logs?.length || 0;
    document.getElementById("tab-count-changes").textContent = inc.recentChanges?.length || 0;
    document.getElementById("tab-count-history").textContent = inc.previousIncidents?.length || 0;
  }

  // ==========================================
  // 1. ERRORS & EXCEPTIONS RENDERING
  // ==========================================
  renderErrors(inc = this.getCurrentIncident()) {
    const warroomContainer = document.getElementById("warroom-errors-list");
    const detailedContainer = document.getElementById("detailed-errors-container");

    const html = (inc.errors || []).map(err => `
      <div class="error-card ${err.isRootCause ? 'is-root-cause' : ''}">
        <div class="error-header">
          <div>
            <div class="error-name">${this.escapeHtml(err.name)}</div>
            <div class="error-meta-tags">
              <span><strong>Service:</strong> ${this.escapeHtml(err.service)}</span> •
              <span><strong>Endpoint:</strong> <code>${this.escapeHtml(err.endpoint || 'N/A')}</code></span> •
              <span><strong>Occurrences:</strong> <span style="color:#f87171;font-weight:700;">${err.count.toLocaleString()}</span> (${err.rate})</span> •
              <span><strong>Trace ID:</strong> <code style="color:#38bdf8;">${this.escapeHtml(err.traceId || 'tr-auto')}</code></span>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="app.toggleRootCause('${err.id}')" title="Flag as root cause candidate">
              <i data-lucide="${err.isRootCause ? 'check-circle' : 'crosshair'}" style="width:12px;height:12px;color:${err.isRootCause ? '#34d399' : '#f87171'};"></i>
              ${err.isRootCause ? 'Root Cause' : 'Mark Root Cause'}
            </button>
          </div>
        </div>

        <div class="error-msg">${this.escapeHtml(err.message)}</div>

        ${err.developerNote ? `
          <div class="dev-note-box">
            <div><strong>Developer Hypothesis:</strong> ${this.escapeHtml(err.developerNote)}</div>
            <button class="btn btn-secondary btn-sm" style="padding:1px 6px;font-size:10px;" onclick="app.editErrorNote('${err.id}')">Edit Note</button>
          </div>
        ` : `
          <div style="margin-top:6px;">
            <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:2px 8px;" onclick="app.editErrorNote('${err.id}')">
              <i data-lucide="plus" style="width:11px;height:11px;"></i> Add Developer Note
            </button>
          </div>
        `}

        <div class="stack-trace-box">${this.escapeHtml(err.stackTrace || 'No stack trace provided.')}</div>
      </div>
    `).join("") || `<div style="color:var(--text-muted);font-size:13px;padding:12px;">No active exceptions detected for this incident.</div>`;

    if (warroomContainer) warroomContainer.innerHTML = html;
    if (detailedContainer) detailedContainer.innerHTML = html;
  }

  toggleRootCause(errId) {
    const inc = this.getCurrentIncident();
    const err = inc.errors?.find(e => e.id === errId);
    if (err) {
      err.isRootCause = !err.isRootCause;
      this.saveIncidents();
      this.renderErrors();
      this.showToast(err.isRootCause ? `Marked ${err.name} as primary root cause candidate` : `Removed root cause flag`, "info");
      if (window.lucide) window.lucide.createIcons();
    }
  }

  editErrorNote(errId) {
    const inc = this.getCurrentIncident();
    const err = inc.errors?.find(e => e.id === errId);
    if (!err) return;
    const newNote = prompt("Enter developer hypothesis / root cause annotation for this error:", err.developerNote || "");
    if (newNote !== null) {
      err.developerNote = newNote.trim();
      this.saveIncidents();
      this.renderErrors();
      this.showToast("Developer note saved", "success");
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // ==========================================
  // 2. LIVE LOGS STREAM RENDERING
  // ==========================================
  renderLogs(inc = this.getCurrentIncident()) {
    const warroomContainer = document.getElementById("warroom-logs-stream");
    const detailedContainer = document.getElementById("detailed-logs-stream");

    const searchFilter = (document.getElementById("warroom-log-search")?.value || document.getElementById("detailed-log-search")?.value || "").toLowerCase();
    const levelFilter = document.getElementById("detailed-log-level-filter")?.value || document.getElementById("warroom-log-level-filter")?.value || "ALL";
    const serviceFilter = document.getElementById("detailed-log-service-filter")?.value || "ALL";

    const filteredLogs = (inc.logs || []).filter(log => {
      const matchSearch = !searchFilter || 
        log.message.toLowerCase().includes(searchFilter) || 
        log.service.toLowerCase().includes(searchFilter) ||
        (log.comment && log.comment.toLowerCase().includes(searchFilter));
      
      const matchLevel = levelFilter === "ALL" || log.level === levelFilter;
      const matchService = serviceFilter === "ALL" || log.service === serviceFilter;

      return matchSearch && matchLevel && matchService;
    });

    const html = filteredLogs.map(log => `
      <div class="log-row ${log.pinned ? 'pinned-log' : ''}">
        <span class="log-time">${this.escapeHtml(log.timestamp)}</span>
        <span class="log-badge ${log.level}">${log.level}</span>
        <span class="log-service">${this.escapeHtml(log.service)}</span>
        <span class="log-msg-text">
          ${this.escapeHtml(log.message)}
          ${log.comment ? `<span style="color:#38bdf8;font-size:11px;display:block;margin-top:2px;">↳ Note: ${this.escapeHtml(log.comment)}</span>` : ''}
        </span>
        <div class="log-row-actions">
          <button class="btn btn-secondary btn-sm" style="padding:1px 6px;font-size:10px;" onclick="app.togglePinLog('${log.id}')" title="${log.pinned ? 'Unpin' : 'Pin to incident timeline'}">
            <i data-lucide="${log.pinned ? 'bookmark-check' : 'bookmark'}" style="width:11px;height:11px;color:${log.pinned ? '#f59e0b' : '#94a3b8'};"></i>
          </button>
          <button class="btn btn-secondary btn-sm" style="padding:1px 6px;font-size:10px;" onclick="app.addLogComment('${log.id}')" title="Annotate log">
            <i data-lucide="message-square" style="width:11px;height:11px;"></i>
          </button>
        </div>
      </div>
    `).join("") || `<div style="color:var(--text-muted);padding:14px;">No log lines match current filters.</div>`;

    if (warroomContainer) {
      warroomContainer.innerHTML = html;
      if (document.getElementById("chk-auto-scroll")?.checked) {
        warroomContainer.scrollTop = warroomContainer.scrollHeight;
      }
    }
    if (detailedContainer) {
      detailedContainer.innerHTML = html;
      if (document.getElementById("chk-auto-scroll")?.checked) {
        detailedContainer.scrollTop = detailedContainer.scrollHeight;
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  togglePinLog(logId) {
    const inc = this.getCurrentIncident();
    const log = inc.logs?.find(l => l.id === logId);
    if (log) {
      log.pinned = !log.pinned;
      this.saveIncidents();
      this.renderLogs();
      this.showToast(log.pinned ? "Log pinned to incident timeline" : "Log unpinned", "info");
    }
  }

  addLogComment(logId) {
    const inc = this.getCurrentIncident();
    const log = inc.logs?.find(l => l.id === logId);
    if (!log) return;
    const comment = prompt("Add developer note to this log entry:", log.comment || "");
    if (comment !== null) {
      log.comment = comment.trim();
      this.saveIncidents();
      this.renderLogs();
      this.showToast("Log annotation saved", "success");
    }
  }

  clearLogs() {
    const inc = this.getCurrentIncident();
    if (confirm("Clear live log buffer for this view?")) {
      inc.logs = [];
      this.saveIncidents();
      this.renderLogs();
      this.updateTabCounters(inc);
      this.showToast("Log buffer cleared", "info");
    }
  }

  // ==========================================
  // 3. DEPLOYMENT & CI/CD RENDERING
  // ==========================================
  renderDeployment(inc = this.getCurrentIncident()) {
    const dep = inc.deployment || {};
    const grid = document.getElementById("deployment-metrics-grid");
    const warroomDep = document.getElementById("warroom-deployment-box");
    
    const metricBoxesHtml = `
      <div class="dep-metric-box">
        <div class="dep-label">Active Release</div>
        <div class="dep-value" style="color:#c084fc;">${this.escapeHtml(dep.activeRelease || 'N/A')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Deployed ${this.escapeHtml(dep.deployedAt || 'Recently')}</div>
      </div>

      <div class="dep-metric-box">
        <div class="dep-label">Target Rollback Version</div>
        <div class="dep-value" style="color:#34d399;">${this.escapeHtml(dep.previousStableRelease || 'N/A')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Registry Image Ready</div>
      </div>

      <div class="dep-metric-box">
        <div class="dep-label">Deployer / Pipeline</div>
        <div class="dep-value" style="font-size:13px;color:var(--text-primary);">${this.escapeHtml(dep.deployedBy || 'ci-bot')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Pipeline ${this.escapeHtml(dep.pipelineId || '#RUN-00')}</div>
      </div>

      <div class="dep-metric-box">
        <div class="dep-label">Pod Health State</div>
        <div class="dep-value" style="color:${(dep.podStatus?.degraded > 0) ? '#f87171' : '#34d399'};">
          ${dep.podStatus?.healthy || 0} / ${dep.podStatus?.total || 0} Ready
        </div>
        <div style="font-size:11px;color:#f87171;margin-top:2px;">${dep.podStatus?.restartCount || 0} Crash Restarts</div>
      </div>
    `;

    if (grid) {
      grid.innerHTML = metricBoxesHtml;
    }

    if (warroomDep) {
      warroomDep.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:8px 10px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Active Release</div>
            <div style="font-size:13px;font-weight:700;color:#7e22ce;font-family:var(--font-mono);">${this.escapeHtml(dep.activeRelease || 'N/A')}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--radius-sm);padding:8px 10px;">
            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Rollback Ready</div>
            <div style="font-size:13px;font-weight:700;color:#15803d;font-family:var(--font-mono);">${this.escapeHtml(dep.previousStableRelease || 'N/A')}</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);background:#f3e8ff;border:1px solid #e9d5ff;border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:10px;">
          <strong style="color:#6b21a8;">Suspect Config:</strong> ${this.escapeHtml(dep.configDiffSummary || 'No config changes')}
        </div>
        <button class="btn btn-danger btn-sm" style="width:100%;" onclick="app.openRollbackModal()">
          <i data-lucide="rotate-ccw" style="width:12px;height:12px;"></i> Trigger 1-Click Rollback to ${this.escapeHtml(dep.previousStableRelease || 'Stable')}
        </button>
      `;
    }

    // Rollback banner labels
    const rbTarget = document.getElementById("rollback-target-label");
    if (rbTarget) rbTarget.textContent = dep.previousStableRelease || "v2.14.7-prod";

    // Config Diff
    const diffContainer = document.getElementById("deployment-config-diff");
    if (diffContainer) {
      diffContainer.innerHTML = this.formatDiffText(dep.configDiffSummary || "No config changes detected in active release.");
    }
  }

  // ==========================================
  // 4. RECENT CHANGES & SUSPECT CORRELATION
  // ==========================================
  renderChanges(inc = this.getCurrentIncident()) {
    const warroomContainer = document.getElementById("warroom-changes-list");
    const detailedContainer = document.getElementById("detailed-changes-timeline");

    const html = (inc.recentChanges || []).map(chg => `
      <div class="change-item ${chg.isSuspectedCause ? 'suspected' : ''}">
        <div class="change-dot"></div>
        <div class="change-header">
          <div>
            <span style="font-weight:700;font-size:13px;color:var(--text-primary);">${this.escapeHtml(chg.title)}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:6px;">(${chg.type} • ${chg.timestamp})</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="suspect-badge">${chg.suspectScore}% Suspect Match</span>
            <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:2px 8px;" onclick="app.toggleChangeSuspect('${chg.id}')">
              ${chg.isSuspectedCause ? 'Clear Suspect' : 'Flag as Suspect'}
            </button>
          </div>
        </div>

        <div style="font-size:12px;color:var(--text-secondary);display:flex;gap:12px;margin-bottom:6px;">
          <span><strong>Author:</strong> ${this.escapeHtml(chg.author)}</span>
          <span><strong>Commit SHA:</strong> <code>${this.escapeHtml(chg.sha)}</code></span>
          <span><strong>PR:</strong> <code>${this.escapeHtml(chg.prNumber)}</code></span>
        </div>

        ${chg.diff ? `
          <div class="code-diff-preview">${this.formatDiffText(chg.diff)}</div>
        ` : ''}
      </div>
    `).join("") || `<div style="color:var(--text-muted);padding:10px;">No recent changes or deployments recorded in the last 4 hours.</div>`;

    if (warroomContainer) warroomContainer.innerHTML = html;
    if (detailedContainer) detailedContainer.innerHTML = html;
  }

  toggleChangeSuspect(chgId) {
    const inc = this.getCurrentIncident();
    const chg = inc.recentChanges?.find(c => c.id === chgId);
    if (chg) {
      chg.isSuspectedCause = !chg.isSuspectedCause;
      this.saveIncidents();
      this.renderChanges();
      this.showToast(`Updated suspect correlation for ${chg.title}`, "info");
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // ==========================================
  // 5. PREVIOUS INCIDENTS & RUNBOOK EXECUTION
  // ==========================================
  renderHistory(inc = this.getCurrentIncident()) {
    // History Cards
    const warroomHistory = document.getElementById("warroom-history-list");
    const detailedHistory = document.getElementById("detailed-history-cards");

    const historyHtml = (inc.previousIncidents || []).map(past => `
      <div class="history-card">
        <div class="history-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="incident-id-tag" style="font-size:12px;padding:2px 6px;">${this.escapeHtml(past.id)}</span>
            <span style="font-weight:700;font-size:13px;color:var(--text-primary);">${this.escapeHtml(past.title)}</span>
          </div>
          <span class="similarity-badge">${this.escapeHtml(past.similarity)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">
          <span><strong>Occurred:</strong> ${this.escapeHtml(past.occurredAt)}</span> •
          <span><strong>Resolution Time:</strong> ${this.escapeHtml(past.resolutionDuration)}</span>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px 10px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:6px;">
          <div style="color:#be123c;font-weight:600;margin-bottom:2px;">Root Cause:</div>
          <div style="color:var(--text-secondary);">${this.escapeHtml(past.rootCause)}</div>
        </div>
        <div class="remediation-line" style="font-size:12px;color:#3a7650;background:rgba(16,185,129,0.08);padding:6px 10px;border-radius:var(--radius-sm);border:1px solid rgba(16,185,129,0.2);">
          <strong style="color:#3a7650;">Remediation:</strong> ${this.escapeHtml(past.keyRemediation)}
        </div>
      </div>
    `).join("") || `<div style="color:var(--text-muted);font-size:13px;">No past similar incidents linked.</div>`;

    if (warroomHistory) warroomHistory.innerHTML = historyHtml;
    if (detailedHistory) detailedHistory.innerHTML = historyHtml;

    // Runbook Steps
    const warroomRunbook = document.getElementById("warroom-runbook-container");
    const detailedRunbook = document.getElementById("detailed-runbook-steps");
    const activeRunbook = inc.runbooks?.[0] || { name: "Default Triage", steps: [] };

    const runbookHtml = (activeRunbook.steps || []).map(step => `
      <div class="runbook-step-item">
        <div class="step-left">
          <div class="step-num">${step.step}</div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${this.escapeHtml(step.title)}</div>
            ${step.command ? `<div class="step-cmd-tag" style="margin-top:4px;">$ ${this.escapeHtml(step.command)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="app.cycleRunbookStatus(${step.step})" style="font-size:11px;padding:3px 8px;">
            ${step.status === 'completed' ? '<span style="color:#34d399;">✓ Done</span>' : step.status === 'in_progress' ? '<span style="color:#fbbf24;">⚡ In Progress</span>' : '<span style="color:var(--text-muted);">○ Pending</span>'}
          </button>
          ${step.command ? `
            <button class="btn btn-secondary btn-sm" onclick="app.copyCommand('${this.escapeQuotes(step.command)}')" title="Copy Command">
              <i data-lucide="copy" style="width:12px;height:12px;"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `).join("") || `<div style="color:var(--text-muted);font-size:13px;">No executable runbook steps defined.</div>`;

    if (warroomRunbook) warroomRunbook.innerHTML = runbookHtml;
    if (detailedRunbook) detailedRunbook.innerHTML = runbookHtml;
  }

  cycleRunbookStatus(stepNum) {
    const inc = this.getCurrentIncident();
    const runbook = inc.runbooks?.[0];
    if (!runbook) return;
    const step = runbook.steps.find(s => s.step === stepNum);
    if (step) {
      if (step.status === 'pending') step.status = 'in_progress';
      else if (step.status === 'in_progress') step.status = 'completed';
      else step.status = 'pending';

      this.saveIncidents();
      this.renderHistory();
      this.showToast(`Runbook step ${stepNum} set to ${step.status}`, "info");
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // ==========================================
  // 6. SCRATCHPAD & TIMELINE
  // ==========================================
  renderTimelineAndNotes(inc = this.getCurrentIncident()) {
    const scratchpad = document.getElementById("scratchpad-input");
    if (scratchpad) {
      scratchpad.value = inc.scratchpad || "";
    }

    const timelineContainer = document.getElementById("timeline-events-container");
    if (timelineContainer) {
      timelineContainer.innerHTML = (inc.timeline || []).map(tl => `
        <div class="timeline-node">
          <div class="timeline-dot ${tl.type}"></div>
          <div class="timeline-meta">
            <span style="color:#38bdf8;font-weight:700;">${this.escapeHtml(tl.time)}</span> •
            <span>${this.escapeHtml(tl.author)}</span>
          </div>
          <div style="color:var(--text-primary);font-size:13px;">${this.escapeHtml(tl.text)}</div>
        </div>
      `).join("") || `<div style="color:var(--text-muted);">No timeline logs recorded yet.</div>`;
    }
  }

  saveScratchpad() {
    const inc = this.getCurrentIncident();
    const scratchpad = document.getElementById("scratchpad-input");
    if (scratchpad && inc) {
      inc.scratchpad = scratchpad.value;
      this.saveIncidents();
      this.showToast("War room scratchpad saved", "success");
    }
  }

  // ==========================================
  // TELEMETRY CHART (Chart.js)
  // ==========================================
  initChart() {
    const canvas = document.getElementById("liveMiniChart");
    if (!canvas) return;

    // Generate 12 initial baseline points
    const labels = [];
    const errorPoints = [];
    for (let i = 12; i >= 0; i--) {
      labels.push(`${i}m ago`);
      errorPoints.push((Math.random() * 4 + 14).toFixed(2));
    }

    this.chartData.labels = labels;
    this.chartData.errorRate = errorPoints;

    const ctx = canvas.getContext("2d");
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: this.chartData.labels,
        datasets: [{
          label: "HTTP 5xx Error %",
          data: this.chartData.errorRate,
          borderColor: "#e11d48",
          backgroundColor: "rgba(254, 205, 211, 0.5)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            bodyColor: '#e11d48',
            borderColor: '#fecdd3',
            borderWidth: 1
          }
        },
        scales: {
          x: { display: false },
          y: {
            display: false,
            min: 0,
            max: 35
          }
        }
      }
    });
  }

  updateChartTick(newRate) {
    if (!this.chart) return;
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    this.chartData.labels.shift();
    this.chartData.labels.push(timeLabel);
    
    this.chartData.errorRate.shift();
    this.chartData.errorRate.push(newRate);

    this.chart.update("none");

    const rateLabel = document.getElementById("chart-error-rate-label");
    if (rateLabel) {
      rateLabel.textContent = `${newRate}% (Threshold: 1.0%)`;
    }
  }

  // ==========================================
  // REAL-TIME STREAM SIMULATION
  // ==========================================
  startStreamingSimulation() {
    this.streamInterval = setInterval(() => {
      if (!this.isStreamActive) return;
      this.streamTick();
    }, 3200);
  }

  streamTick() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    // Pick random log template
    const tmpl = LOG_GENERATOR_TEMPLATES[Math.floor(Math.random() * LOG_GENERATOR_TEMPLATES.length)];
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${Math.floor(Math.random() * 900 + 100)}`;
    
    let msg = tmpl.msg
      .replace('{RANDOM}', Math.floor(Math.random() * 89999 + 10000))
      .replace('{RAND_IP}', `${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`)
      .replace('{LATENCY}', Math.floor(Math.random() * 250 + 350))
      .replace('{QUEUE}', Math.floor(Math.random() * 60 + 55))
      .replace('{CLIENTS}', Math.floor(Math.random() * 800 + 8200));

    const newLog = {
      id: `LOG-${Date.now()}`,
      timestamp,
      level: tmpl.level,
      service: tmpl.service,
      containerId: `pod-${tmpl.service.substring(0, 4)}-${Math.random().toString(36).substring(2, 6)}`,
      message: msg,
      pinned: false,
      comment: ""
    };

    if (!inc.logs) inc.logs = [];
    inc.logs.push(newLog);
    if (inc.logs.length > 50) inc.logs.shift(); // Keep last 50

    // Jitter latency & error rate
    const simulatedErrorRate = (Math.random() * 4 + (inc.status === 'Resolved' ? 0.04 : 16.5)).toFixed(2);
    this.updateChartTick(simulatedErrorRate);

    // Increment impacted users slightly if investigating
    if (inc.status === 'Investigating' && Math.random() > 0.4) {
      inc.impactedUsers = (inc.impactedUsers || 0) + Math.floor(Math.random() * 8 + 2);
      const userMetric = document.getElementById("metric-users");
      if (userMetric) userMetric.textContent = inc.impactedUsers.toLocaleString();
    }

    this.renderLogs(inc);
  }

  toggleStreaming() {
    this.isStreamActive = !this.isStreamActive;
    const badge = document.getElementById("live-status-pill");
    const text = document.getElementById("live-status-text");
    const toggleLabel = document.getElementById("stream-toggle-label");
    const icon = document.getElementById("stream-toggle-icon");

    if (this.isStreamActive) {
      badge.classList.remove("paused");
      text.textContent = "LIVE STREAMING";
      toggleLabel.textContent = "Pause";
      this.showToast("Resumed live telemetry stream", "info");
    } else {
      badge.classList.add("paused");
      text.textContent = "STREAM PAUSED";
      toggleLabel.textContent = "Resume";
      this.showToast("Paused live telemetry stream", "info");
    }
  }

  simulateSpike() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    this.updateChartTick((31.85).toFixed(2));
    
    // Inject sudden fatal alert log
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.999`;
    
    inc.logs.push({
      id: `LOG-SPIKE-${Date.now()}`,
      timestamp,
      level: "FATAL",
      service: "payment-gateway",
      containerId: "ingress-nginx-lb-01",
      message: "ALARM SPIKE: HTTP 504 Gateway Timeout rate exceeded 30% across 500 downstream clients!",
      pinned: true,
      comment: "Injected during live chaos drill"
    });

    this.renderLogs(inc);
    this.showToast("Simulated sudden traffic & error rate surge!", "error");
  }

  startIncidentTimer() {
    this.timerInterval = setInterval(() => {
      const inc = this.getCurrentIncident();
      if (!inc || !inc.startTime) return;
      const start = new Date(inc.startTime).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));

      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
      const secs = String(diffSec % 60).padStart(2, '0');

      const timerEl = document.getElementById("incident-timer");
      if (timerEl) {
        timerEl.textContent = `${hrs}:${mins}:${secs}`;
      }
    }, 1000);
  }

  // ==========================================
  // MODAL & MANUAL EDITING HANDLERS
  // ==========================================
  closeModals() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
  }

  openEditIncidentModal() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    document.getElementById("edit-inc-title").value = inc.title;
    document.getElementById("edit-inc-severity").value = inc.severity;
    document.getElementById("edit-inc-status").value = inc.status;
    document.getElementById("edit-inc-commander").value = inc.commander;
    document.getElementById("edit-inc-service").value = inc.service;
    document.getElementById("edit-inc-summary").value = inc.summary || "";
    document.getElementById("edit-inc-users").value = inc.impactedUsers || 0;
    document.getElementById("edit-inc-financial").value = inc.financialImpact || "";

    document.getElementById("modal-edit-incident").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  saveIncidentMetadata() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    inc.title = document.getElementById("edit-inc-title").value;
    inc.severity = document.getElementById("edit-inc-severity").value;
    inc.status = document.getElementById("edit-inc-status").value;
    inc.commander = document.getElementById("edit-inc-commander").value;
    inc.service = document.getElementById("edit-inc-service").value;
    inc.summary = document.getElementById("edit-inc-summary").value;
    inc.impactedUsers = parseInt(document.getElementById("edit-inc-users").value, 10) || 0;
    inc.financialImpact = document.getElementById("edit-inc-financial").value;

    this.saveIncidents();
    this.populateIncidentDropdown();
    this.renderAll();
    this.closeModals();
    this.showToast("Incident metadata updated successfully", "success");
  }

  openCreateIncidentModal() {
    document.getElementById("new-inc-id").value = `INC-${Math.floor(Math.random() * 800 + 4825)}`;
    document.getElementById("modal-create-incident").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  createIncidentSubmit() {
    const id = document.getElementById("new-inc-id").value.trim();
    const title = document.getElementById("new-inc-title").value.trim();
    const severity = document.getElementById("new-inc-severity").value;
    const service = document.getElementById("new-inc-service").value.trim();
    const commander = document.getElementById("new-inc-commander").value.trim();
    const summary = document.getElementById("new-inc-summary").value.trim();

    if (!id || !title) {
      alert("Please fill in incident ID and Title.");
      return;
    }

    const newInc = {
      id,
      title,
      status: "Investigating",
      severity,
      service,
      environment: "production-us-east-1",
      startTime: new Date().toISOString(),
      resolvedTime: null,
      commander,
      scribe: "Alex Rivera",
      impactedUsers: 120,
      financialImpact: "$2,500 / hr",
      summary,
      errors: [],
      logs: [],
      deployment: {
        activeRelease: "v1.0.0",
        previousStableRelease: "v0.9.9",
        deployedAt: "Just now",
        deployedBy: commander,
        podStatus: { total: 4, healthy: 4, degraded: 0, restartCount: 0 }
      },
      recentChanges: [],
      previousIncidents: [],
      runbooks: [
        {
          id: "RB-GENERIC",
          name: "Standard Incident Triage",
          steps: [
            { step: 1, title: "Check application health logs", status: "in_progress", command: "kubectl logs -l app=" + service },
            { step: 2, title: "Notify stakeholders on Slack #prod-alerts", status: "pending", command: "" }
          ]
        }
      ],
      timeline: [
        { id: `TL-${Date.now()}`, time: "Just now", text: `Incident declared as ${severity} by ${commander}`, author: commander, type: "manual" }
      ],
      scratchpad: `## Initial Findings\n- Incident declared for ${service}.\n- Investigating root cause.`
    };

    this.incidents.unshift(newInc);
    this.currentIncidentId = newInc.id;
    this.saveIncidents();
    this.populateIncidentDropdown();
    this.renderAll();
    this.closeModals();
    this.showToast(`Declared new incident ${newInc.id}`, "success");
  }

  // Rollback Modal
  openRollbackModal() {
    const inc = this.getCurrentIncident();
    const dep = inc.deployment || {};
    document.getElementById("modal-rb-current-ver").textContent = dep.activeRelease || "Current";
    document.getElementById("modal-rb-target-ver").textContent = dep.previousStableRelease || "Previous";
    document.getElementById("modal-rollback").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  executeRollbackConfirmed() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    const oldRelease = inc.deployment.activeRelease;
    const targetRelease = inc.deployment.previousStableRelease;

    inc.deployment.activeRelease = targetRelease;
    inc.deployment.previousStableRelease = oldRelease;
    inc.deployment.deployedAt = "Just now (Rollback)";
    inc.deployment.rollbackStatus = "Rolled back successfully";
    inc.deployment.podStatus = { total: 12, healthy: 12, degraded: 0, restartCount: 0 };
    inc.deployment.metricsDelta = { latencyP99: "62ms (Normal)", errorRate: "0.01% (Normal)", cpuUsage: "28%" };

    // Add to timeline
    inc.timeline.push({
      id: `TL-${Date.now()}`,
      time: "Just now",
      text: `EMERGENCY ROLLBACK EXECUTED: Rolled back ${inc.service} to ${targetRelease}`,
      author: inc.commander,
      type: "alert"
    });

    // Add log
    inc.logs.push({
      id: `LOG-RB-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: "INFO",
      service: "k8s-rollout",
      containerId: "cluster-orchestrator",
      message: `deployment.apps/${inc.service} rolled back to revision [${targetRelease}] successfully. 12/12 replicas ready.`,
      pinned: true,
      comment: "Rollback completed. 5xx errors eliminated."
    });

    // Update status to Monitoring
    inc.status = "Monitoring";

    this.saveIncidents();
    this.renderAll();
    this.closeModals();
    this.showToast(`Rollback to ${targetRelease} completed successfully!`, "success");
  }

  // Add Error Modal
  openNewErrorModal() {
    document.getElementById("modal-add-error").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  addErrorSubmit() {
    const inc = this.getCurrentIncident();
    const name = document.getElementById("new-err-name").value.trim();
    const message = document.getElementById("new-err-msg").value.trim();
    const service = document.getElementById("new-err-service").value.trim();
    const endpoint = document.getElementById("new-err-endpoint").value.trim();
    const stackTrace = document.getElementById("new-err-stack").value.trim();
    const developerNote = document.getElementById("new-err-note").value.trim();

    if (!name || !message) {
      alert("Please provide exception name and error message.");
      return;
    }

    if (!inc.errors) inc.errors = [];
    inc.errors.unshift({
      id: `ERR-${Date.now()}`,
      name,
      message,
      count: 1,
      rate: "1.0 req/s",
      firstSeen: "Just now",
      lastSeen: "Just now",
      service,
      endpoint,
      traceId: `tr-${Math.random().toString(36).substring(2, 8)}`,
      isRootCause: false,
      isSilenced: false,
      developerNote,
      stackTrace
    });

    this.saveIncidents();
    this.renderErrors();
    this.updateTabCounters(inc);
    this.closeModals();
    this.showToast("Manual exception recorded", "success");
  }

  // Add Log Modal
  openAddLogModal() {
    document.getElementById("modal-add-log").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  addLogSubmit() {
    const inc = this.getCurrentIncident();
    const level = document.getElementById("new-log-level").value;
    const service = document.getElementById("new-log-service").value.trim();
    const message = document.getElementById("new-log-msg").value.trim();
    const comment = document.getElementById("new-log-comment").value.trim();

    if (!message) {
      alert("Log message cannot be empty.");
      return;
    }

    if (!inc.logs) inc.logs = [];
    inc.logs.push({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      service,
      containerId: `manual-entry`,
      message,
      pinned: !!comment,
      comment
    });

    this.saveIncidents();
    this.renderLogs();
    this.updateTabCounters(inc);
    this.closeModals();
    this.showToast("Manual log entry injected", "success");
  }

  // Add Timeline Modal
  openNewTimelineModal() {
    document.getElementById("modal-add-timeline").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  addTimelineSubmit() {
    const inc = this.getCurrentIncident();
    const text = document.getElementById("new-timeline-text").value.trim();
    const author = document.getElementById("new-timeline-author").value.trim();
    const type = document.getElementById("new-timeline-type").value;

    if (!text) {
      alert("Event text is required.");
      return;
    }

    if (!inc.timeline) inc.timeline = [];
    inc.timeline.push({
      id: `TL-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      text,
      author,
      type
    });

    this.saveIncidents();
    this.renderTimelineAndNotes();
    this.closeModals();
    this.showToast("Timeline event added", "success");
  }

  // Postmortem Modal
  openPostmortemModal() {
    const inc = this.getCurrentIncident();
    if (!inc) return;

    const markdown = `# Postmortem Report: ${inc.id} - ${inc.title}

**Severity:** ${inc.severity}  
**Status:** ${inc.status}  
**Primary Service:** ${inc.service}  
**Environment:** ${inc.environment}  
**Incident Commander:** ${inc.commander}  
**Impacted Users:** ${(inc.impactedUsers || 0).toLocaleString()}  
**Estimated Financial Impact:** ${inc.financialImpact || '$0'}  
**Incident Start Time:** ${inc.startTime}  

---

## 1. Executive Summary
${inc.summary || 'Summary pending postmortem sign-off.'}

## 2. Root Cause Analysis
${inc.errors?.find(e => e.isRootCause)?.developerNote || 'Root cause under active investigation.'}

**Primary Suspect Exception:**
\`\`\`
${inc.errors?.[0]?.message || 'None reported'}
\`\`\`

## 3. Incident Timeline
${(inc.timeline || []).map(t => `- **${t.time}** (${t.author}): ${t.text}`).join('\n')}

## 4. Mitigation & Actions Taken
- Deployment Status: Active release was \`${inc.deployment?.activeRelease}\` (Rolled back to \`${inc.deployment?.previousStableRelease}\`).
- Runbook steps executed:
${(inc.runbooks?.[0]?.steps || []).map(s => `  - [${s.status === 'completed' ? 'x' : ' '}] Step ${s.step}: ${s.title}`).join('\n')}

## 5. Responders & Collaborators Scratchpad
\`\`\`
${inc.scratchpad || 'No notes'}
\`\`\`
`;

    document.getElementById("postmortem-preview-text").value = markdown;
    document.getElementById("modal-postmortem").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  copyPostmortemToClipboard() {
    const text = document.getElementById("postmortem-preview-text").value;
    navigator.clipboard.writeText(text).then(() => {
      this.showToast("Postmortem markdown copied to clipboard!", "success");
    }).catch(() => {
      this.showToast("Failed to copy automatically", "error");
    });
  }

  copyCommand(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
      this.showToast(`Copied command: ${cmd}`, "info");
    });
  }

  // Recent Change Handlers
  openNewChangeModal() {
    document.getElementById("modal-add-change").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  addChangeSubmit() {
    const inc = this.getCurrentIncident();
    const title = document.getElementById("new-chg-title").value.trim();
    const type = document.getElementById("new-chg-type").value;
    const author = document.getElementById("new-chg-author").value.trim();
    const sha = document.getElementById("new-chg-sha").value.trim() || Math.random().toString(36).substring(2, 10);
    const score = parseInt(document.getElementById("new-chg-score").value, 10) || 50;
    const diff = document.getElementById("new-chg-diff").value.trim();

    if (!title) {
      alert("Change title is required.");
      return;
    }

    if (!inc.recentChanges) inc.recentChanges = [];
    inc.recentChanges.unshift({
      id: `CHG-${Date.now()}`,
      type,
      title,
      author,
      timestamp: "Just now",
      sha,
      prNumber: `#${Math.floor(Math.random() * 500 + 1800)}`,
      suspectScore: score,
      isSuspectedCause: score >= 80,
      diff
    });

    this.saveIncidents();
    this.renderChanges();
    this.updateTabCounters(inc);
    this.closeModals();
    this.showToast("Recorded new change entry", "success");
  }

  // Link Past Incident Handlers
  openLinkIncidentModal() {
    document.getElementById("modal-link-incident").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  linkIncidentSubmit() {
    const inc = this.getCurrentIncident();
    const id = document.getElementById("new-past-id").value.trim();
    const title = document.getElementById("new-past-title").value.trim();
    const similarity = document.getElementById("new-past-similarity").value.trim();
    const duration = document.getElementById("new-past-duration").value.trim();
    const rootCause = document.getElementById("new-past-cause").value.trim();
    const keyRemediation = document.getElementById("new-past-remediation").value.trim();

    if (!id || !title) {
      alert("Incident ID and title are required.");
      return;
    }

    if (!inc.previousIncidents) inc.previousIncidents = [];
    inc.previousIncidents.unshift({
      id,
      title,
      similarity,
      occurredAt: "Linked manually",
      resolutionDuration: duration,
      rootCause,
      keyRemediation,
      postmortemUrl: "#",
      runbookSuggested: "RB-CUSTOM"
    });

    this.saveIncidents();
    this.renderHistory();
    this.updateTabCounters(inc);
    this.closeModals();
    this.showToast(`Linked historical incident ${id}`, "success");
  }

  // Runbook Step Handlers
  openAddRunbookStepModal() {
    document.getElementById("modal-add-runbook-step").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  addRunbookStepSubmit() {
    const inc = this.getCurrentIncident();
    const title = document.getElementById("new-step-title").value.trim();
    const command = document.getElementById("new-step-cmd").value.trim();

    if (!title) {
      alert("Step title is required.");
      return;
    }

    if (!inc.runbooks) {
      inc.runbooks = [{ id: "RB-01", name: "Incident Remediation", steps: [] }];
    }
    const rb = inc.runbooks[0];
    const nextStepNum = (rb.steps?.length || 0) + 1;

    rb.steps.push({
      step: nextStepNum,
      title,
      status: "pending",
      command
    });

    this.saveIncidents();
    this.renderHistory();
    this.closeModals();
    this.showToast(`Added Step ${nextStepNum} to active playbook`, "success");
  }

  // Deployment Edit Handlers
  openEditDeploymentModal() {
    const inc = this.getCurrentIncident();
    const dep = inc.deployment || {};

    document.getElementById("edit-dep-active").value = dep.activeRelease || "";
    document.getElementById("edit-dep-rollback").value = dep.previousStableRelease || "";
    document.getElementById("edit-dep-by").value = dep.deployedBy || "";
    document.getElementById("edit-dep-pipe").value = dep.pipelineId || "";
    document.getElementById("edit-dep-diff").value = dep.configDiffSummary || "";

    document.getElementById("modal-edit-deployment").classList.add("open");
    if (window.lucide) window.lucide.createIcons();
  }

  saveDeploymentSubmit() {
    const inc = this.getCurrentIncident();
    if (!inc.deployment) inc.deployment = {};

    inc.deployment.activeRelease = document.getElementById("edit-dep-active").value.trim();
    inc.deployment.previousStableRelease = document.getElementById("edit-dep-rollback").value.trim();
    inc.deployment.deployedBy = document.getElementById("edit-dep-by").value.trim();
    inc.deployment.pipelineId = document.getElementById("edit-dep-pipe").value.trim();
    inc.deployment.configDiffSummary = document.getElementById("edit-dep-diff").value.trim();

    this.saveIncidents();
    this.renderDeployment();
    this.renderBanner(inc);
    this.closeModals();
    this.showToast("Deployment metadata updated", "success");
  }

  // Toast Helpers
  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex:1;">${this.escapeHtml(message)}</div>
      <i data-lucide="x" style="width:14px;height:14px;cursor:pointer;" onclick="this.parentElement.remove()"></i>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Format Code Diffs with colored spans
  formatDiffText(diffStr) {
    if (!diffStr) return "";
    return diffStr.split("\n").map(line => {
      if (line.startsWith("+")) {
        return `<div class="diff-add">${this.escapeHtml(line)}</div>`;
      } else if (line.startsWith("-")) {
        return `<div class="diff-del">${this.escapeHtml(line)}</div>`;
      } else if (line.startsWith("@@")) {
        return `<div class="diff-hunk">${this.escapeHtml(line)}</div>`;
      }
      return `<div>${this.escapeHtml(line)}</div>`;
    }).join("");
  }

  escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  escapeQuotes(str) {
    return (str || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
  }
}

// Global instance initialization
let app;
window.addEventListener("DOMContentLoaded", () => {
  app = new IncidentWarRoomApp();
  window.app = app;
});
