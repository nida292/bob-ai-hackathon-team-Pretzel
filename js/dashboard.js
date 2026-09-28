/* ============================================================
   ForensiTriage — Dashboard Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  injectShell([{ label: 'Dashboard' }]);
  loadDashboard();
  bindNewCaseButtons();
});

function loadDashboard() {
  const user     = Auth.currentUser();
  const cases    = CasesDB.all();
  const allEv    = EvidenceDB.all();
  const activeCases = cases.filter(c => c.status === 'Active');

  // Greeting
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greet}, ${user.name.split(' ')[0]}`;

  // Stats
  document.getElementById('stat-total-cases').textContent    = cases.length;
  document.getElementById('stat-cases-meta').textContent     = `${activeCases.length} active`;
  document.getElementById('stat-total-evidence').textContent = allEv.length;
  document.getElementById('stat-evidence-meta').textContent  =
    `across ${cases.length} case${cases.length !== 1 ? 's' : ''}`;
  document.getElementById('stat-critical').textContent   = allEv.filter(e => e.priority === 'Critical').length;
  document.getElementById('stat-unassigned').textContent = allEv.filter(e => !e.priority || e.priority === 'Unassigned').length;

  renderRecentCases(cases, allEv);
  renderCriticalPanel(allEv, cases);
  renderPriorityBars(allEv);
  renderActivityFeed();
}

/* ── Recent Cases Table ─────────────────────────────────────── */
function renderRecentCases(cases, allEv) {
  const tbody = document.getElementById('recent-cases-table');
  const sorted = [...cases].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:40px;text-align:center">
      <div class="empty-state" style="padding:0">
        <div class="empty-state-title">No cases yet</div>
        <div class="empty-state-text">Create your first case to get started.</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map(c => {
    const evCount = allEv.filter(e => e.caseId === c.id).length;
    const critCount = allEv.filter(e => e.caseId === c.id && e.priority === 'Critical').length;
    const crimeLabel = c.crimeType === 'Other' && c.crimeTypeCustom ? c.crimeTypeCustom : c.crimeType;
    return `
      <tr>
        <td>
          <a href="case-details.html?id=${escHtml(c.id)}" style="text-decoration:none">
            <div class="case-id-cell">${escHtml(c.caseNumber)}</div>
            <div class="case-name-cell">${escHtml(c.title)}</div>
          </a>
        </td>
        <td><span class="text-sm text-secondary">${escHtml(crimeLabel)}</span></td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <span class="evidence-count">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            ${evCount}
          </span>
          ${critCount > 0 ? `<span class="badge badge-critical ms-1" style="margin-left:4px">${critCount} critical</span>` : ''}
        </td>
        <td><span class="text-xs text-muted">${DateUtils.formatRelative(c.updatedAt)}</span></td>
        <td><a href="case-details.html?id=${escHtml(c.id)}" class="btn btn-ghost btn-sm">View →</a></td>
      </tr>`;
  }).join('');
}

/* ── Critical Evidence Panel ────────────────────────────────── */
function renderCriticalPanel(allEv, cases) {
  const panel = document.getElementById('critical-panel');
  const critical = allEv.filter(e => e.priority === 'Critical').slice(0, 6);

  if (critical.length === 0) {
    panel.innerHTML = `
      <div style="text-align:center;padding:16px 0;color:var(--text-muted);font-size:13px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24" style="margin:0 auto 8px;display:block;color:var(--success)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        No critical evidence at this time
      </div>`;
    return;
  }

  panel.innerHTML = critical.map(ev => {
    const c = cases.find(x => x.id === ev.caseId);
    return `
      <a href="evidence-details.html?id=${escHtml(ev.id)}" class="critical-item">
        <div class="critical-item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="critical-item-info">
          <div class="critical-item-name">${escHtml(ev.name)}</div>
          <div class="critical-item-case">${c ? escHtml(c.caseNumber) + ' · ' + escHtml(c.title) : 'Unknown case'}</div>
        </div>
      </a>`;
  }).join('');
}

/* ── Priority Bars ──────────────────────────────────────────── */
function renderPriorityBars(allEv) {
  const container = document.getElementById('priority-bars');
  if (allEv.length === 0) {
    container.innerHTML = `<div class="text-sm text-muted">No evidence yet.</div>`;
    return;
  }
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Unassigned: 0 };
  allEv.forEach(e => { counts[e.priority || 'Unassigned']++; });
  const max = Math.max(...Object.values(counts), 1);

  container.innerHTML = Object.entries(counts).map(([level, count]) => {
    const pct = Math.round((count / max) * 100);
    return `
      <div class="priority-bar-item">
        <div class="priority-bar-label">${level}</div>
        <div class="priority-bar-track">
          <div class="priority-bar-fill ${level.toLowerCase()}" style="width:${pct}%"></div>
        </div>
        <div class="priority-bar-count">${count}</div>
      </div>`;
  }).join('');
}

/* ── Activity Feed ──────────────────────────────────────────── */
function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  const log  = ActivityLog.get(10);

  if (log.length === 0) {
    feed.innerHTML = `<div class="text-sm text-muted" style="padding-top:16px">No activity yet.</div>`;
    return;
  }

  feed.innerHTML = log.map(entry => `
    <div class="activity-item">
      <div class="activity-dot ${ActivityLog.dotColor(entry.action)}"></div>
      <div class="activity-content">
        <div class="activity-text">${escHtml(entry.action)}: ${escHtml(entry.detail)}</div>
        <div class="activity-time">${escHtml(entry.user)} · ${DateUtils.formatRelative(entry.timestamp)}</div>
      </div>
    </div>`).join('');
}

/* ── New Case Modal ─────────────────────────────────────────── */
function bindNewCaseButtons() {
  document.querySelectorAll('[data-action="new-case"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showNewCaseModal();
    });
  });
}

function showNewCaseModal() {
  const crimeOptions = CRIME_TYPES.map(t =>
    `<option value="${escHtml(t)}">${escHtml(t)}</option>`
  ).join('');

  Modal.show({
    title: 'Create New Case',
    size: 'lg',
    confirmText: 'Create Case',
    confirmClass: 'btn-primary',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Case Title</label>
        <input type="text" id="nc-title" class="input" placeholder="e.g. Northgate Residential Burglary" maxlength="120" />
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label form-label-req">Crime Type</label>
          <select id="nc-crime" class="select">${crimeOptions}</select>
        </div>
        <div class="form-group" id="nc-custom-group" style="display:none">
          <label class="form-label form-label-req">Specify Crime Type</label>
          <input type="text" id="nc-crime-custom" class="input" placeholder="Describe the crime type" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="nc-desc" class="textarea" placeholder="Brief description of the incident…" rows="3"></textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Incident Location</label>
          <input type="text" id="nc-location" class="input" placeholder="Address or area" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Incident</label>
          <input type="date" id="nc-date" class="input" />
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Lead Investigator</label>
          <input type="text" id="nc-investigator" class="input" placeholder="Investigator name" />
        </div>
        <div class="form-group">
          <label class="form-label">Case Status</label>
          <select id="nc-status" class="select">
            ${CASE_STATUSES.map(s => `<option value="${s}"${s==='Active'?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="nc-error" class="alert alert-danger hidden" style="margin-top:8px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span id="nc-error-msg"></span>
      </div>
    `,
    onConfirm: () => submitNewCase(),
  });

  // Crime type → show custom
  setTimeout(() => {
    document.getElementById('nc-crime').addEventListener('change', function () {
      document.getElementById('nc-custom-group').style.display = this.value === 'Other' ? '' : 'none';
    });
  }, 50);
}

function submitNewCase() {
  const title  = document.getElementById('nc-title')?.value.trim();
  const crime  = document.getElementById('nc-crime')?.value;
  const custom = document.getElementById('nc-crime-custom')?.value.trim();
  const desc   = document.getElementById('nc-desc')?.value.trim();
  const loc    = document.getElementById('nc-location')?.value.trim();
  const date   = document.getElementById('nc-date')?.value;
  const inv    = document.getElementById('nc-investigator')?.value.trim();
  const status = document.getElementById('nc-status')?.value;
  const errEl  = document.getElementById('nc-error');
  const errMsg = document.getElementById('nc-error-msg');

  const showErr = (msg) => {
    if (errEl) { errEl.classList.remove('hidden'); errMsg.textContent = msg; }
  };

  if (!title) { showErr('Case title is required.'); return; }
  if (crime === 'Other' && !custom) { showErr('Please specify the crime type.'); return; }

  const user = Auth.currentUser();
  const newCase = CasesDB.create({
    title, crimeType: crime, crimeTypeCustom: custom,
    description: desc, location: loc, dateOfIncident: date,
    leadInvestigator: inv, status,
    createdBy: user.id,
  });

  Toast.success(`Case "${newCase.title}" created.`, 'Case Created');
  // Navigate to new case
  window.location.href = `case-details.html?id=${newCase.id}`;
}

/* ── Status Badge Helper ────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    'Active': 'badge-active',
    'Closed': 'badge-closed',
    'Pending': 'badge-pending',
    'Under Review': 'badge-review',
  };
  const cls = map[status] || 'badge-unassigned';
  return `<span class="badge ${cls} badge-dot">${escHtml(status)}</span>`;
}
