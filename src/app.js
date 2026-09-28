/**
 * app.js — Main application controller for ForensiTriage
 *
 * IMPORTANT: No automatic priority calculation. No numerical scores.
 * All evidence priorities are set manually by investigators.
 */

const App = (() => {
  let currentView  = 'dashboard';
  let activeCaseId = null;  // the case currently open in Case Details

  const PAGE_TITLES = {
    dashboard:     'Overview',
    cases:         'Case Management',
    'case-detail': 'Case Details',
    schedule:      'FSL Schedule',
    report:        'Reports',
  };

  // Priority display helpers
  const PRIORITY_CSS = {
    Critical:   'critical',
    High:       'high',
    Medium:     'medium',
    Low:        'low',
    Unassigned: 'unassigned',
  };

  // ── Utilities ────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  }

  /** Render a priority badge — text label + colour, no numbers */
  function priorityBadge(priority) {
    const p   = priority || 'Unassigned';
    const css = PRIORITY_CSS[p] || 'unassigned';
    return `<span class="priority-badge ${css}">${escapeHtml(p)}</span>`;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 350);
    }, 3500);
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function openModal(contentHtml, onClose) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = contentHtml;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    const first = overlay.querySelector('input, select, textarea, button:not(.modal-close)');
    if (first) first.focus();
    overlay._onClose = onClose || null;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.hidden = true;
    document.body.style.overflow = '';
    document.getElementById('modal-content').innerHTML = '';
    if (overlay._onClose) { overlay._onClose(); overlay._onClose = null; }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.querySelectorAll('.nav-item[data-view]').forEach(b => {
      b.classList.remove('active');
      b.removeAttribute('aria-current');
    });

    const view = document.getElementById(`view-${viewName}`);
    if (view) { view.hidden = false; view.removeAttribute('hidden'); }

    // Sidebar active state: case-detail uses 'cases' highlight
    const sidebarTarget = viewName === 'case-detail' ? 'cases' : viewName;
    const btn = document.querySelector(`.nav-item[data-view="${sidebarTarget}"]`);
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }

    currentView = viewName;

    const pageTitle = document.getElementById('topbar-page-title');
    if (pageTitle) pageTitle.textContent = PAGE_TITLES[viewName] || viewName;

    if (viewName === 'dashboard')    renderDashboard();
    if (viewName === 'cases')        renderCasesList();
    if (viewName === 'case-detail')  renderCaseDetail();
    if (viewName === 'schedule')     renderSchedule();
    if (viewName === 'report')       renderReport();
  }

  function updateNavState() {
    // Schedule and Report require an active case
    ['nav-schedule', 'nav-report'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !activeCaseId;
    });

    // Topbar case chip
    const badge     = document.getElementById('active-case-badge');
    const sep       = document.getElementById('topbar-sep');
    const titleChip = document.getElementById('active-case-title-badge');
    if (activeCaseId) {
      const c = Storage.getCaseById(activeCaseId);
      badge.hidden = false;
      if (sep) sep.hidden = false;
      titleChip.textContent = c ? c.title : activeCaseId;
    } else {
      badge.hidden = true;
      if (sep) sep.hidden = true;
    }

    // Quick-action buttons
    ['qa-add-evidence', 'qa-report', 'qa-view-case'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !activeCaseId;
    });

    updateProfileDisplay();
  }

  function updateProfileDisplay() {
    const nameEl     = document.getElementById('profile-name');
    const initialsEl = document.getElementById('profile-initials');
    let name = 'Investigator';
    if (activeCaseId) {
      const c = Storage.getCaseById(activeCaseId);
      if (c && c.investigator) name = c.investigator;
    }
    if (nameEl) nameEl.textContent = name.length > 18 ? name.slice(0, 17) + '…' : name;
    if (initialsEl) {
      const parts = name.split(' ');
      initialsEl.textContent = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
  }

  function setActiveCase(caseId) {
    activeCaseId = caseId;
    updateNavState();
    // Update schedule-case-label
    const el = document.getElementById('schedule-case-label');
    if (el && caseId) {
      const c = Storage.getCaseById(caseId);
      if (c) el.textContent = `${c.id} — ${c.title}`;
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  function renderDashboard() {
    const stats = Storage.getStats();

    document.getElementById('stat-total-cases').textContent    = stats.totalCases;
    document.getElementById('stat-total-evidence').textContent  = stats.totalEvidence;
    document.getElementById('stat-critical').textContent        = stats.priorityCounts.Critical;
    document.getElementById('stat-unassigned').textContent      = stats.priorityCounts.Unassigned;

    // Priority distribution chart — 5 bars, no numbers, no percentages
    const total = stats.totalEvidence;
    document.getElementById('dist-total-badge').textContent = `${total} item${total !== 1 ? 's' : ''}`;

    const levels = [
      { key: 'Critical',   barId: 'dist-bar-critical',   countId: 'dist-count-critical' },
      { key: 'High',       barId: 'dist-bar-high',        countId: 'dist-count-high' },
      { key: 'Medium',     barId: 'dist-bar-medium',      countId: 'dist-count-medium' },
      { key: 'Low',        barId: 'dist-bar-low',         countId: 'dist-count-low' },
      { key: 'Unassigned', barId: 'dist-bar-unassigned',  countId: 'dist-count-unassigned' },
    ];
    levels.forEach(({ key, barId, countId }) => {
      const count = stats.priorityCounts[key] || 0;
      const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
      const bar   = document.getElementById(barId);
      const cnt   = document.getElementById(countId);
      if (bar) bar.style.width = `${pct}%`;
      if (cnt) cnt.textContent  = count;
    });

    // Cases list (with optional status filter)
    renderDashboardCases();

    // Demo reset button
    const resetBtn = document.getElementById('qa-reset-demo');
    if (resetBtn) resetBtn.hidden = !Storage.getDemoCaseId();
  }

  function renderDashboardCases() {
    const statusFilter = document.getElementById('dash-filter-status')?.value || '';
    let cases = Storage.getCases();
    if (statusFilter) cases = cases.filter(c => c.status === statusFilter);

    const listEl = document.getElementById('recent-cases-list');
    if (!listEl) return;

    if (cases.length === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
        <h3>No cases</h3>
        <p>${statusFilter ? 'No cases match the selected status filter.' : 'No cases yet. Create your first investigation case.'}</p>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary btn-sm" data-action="new-case">Create Case</button>
          <button class="btn btn-secondary btn-sm" data-action="load-demo">Load Demo</button>
        </div>
      </div>`;
      return;
    }

    listEl.innerHTML = cases.map(c => {
      const ev    = Storage.getEvidence(c.id);
      const cStats= Storage.getStatsByCaseId(c.id);
      const statusCss = `status-${(c.status || 'active').toLowerCase()}`;
      return `<div class="recent-case-row" data-caseid="${escapeHtml(c.id)}" role="button" tabindex="0" aria-label="Open case ${escapeHtml(c.title)}">
        <div class="recent-case-info">
          <div class="recent-case-title">${escapeHtml(c.title)}${c.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}</div>
          <div class="recent-case-meta">
            ${escapeHtml(c.id)} · ${escapeHtml(c.crimeType || '—')} ·
            ${ev.length} evidence item${ev.length !== 1 ? 's' : ''}
            ${cStats.priorityCounts.Critical > 0 ? `· <span style="color:var(--critical);font-weight:600">${cStats.priorityCounts.Critical} critical</span>` : ''}
            ${cStats.priorityCounts.Unassigned > 0 ? `· <span style="color:var(--text-muted)">${cStats.priorityCounts.Unassigned} unassigned</span>` : ''}
          </div>
        </div>
        <span class="case-status-badge ${statusCss}">${escapeHtml(c.status || 'Active')}</span>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.recent-case-row').forEach(row => {
      row.addEventListener('click',   () => openCaseDetail(row.dataset.caseid));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openCaseDetail(row.dataset.caseid); });
    });
  }

  // ── Cases List ────────────────────────────────────────────────────────────

  function renderCasesList() {
    const cases = Storage.getCases();
    const container = document.getElementById('cases-list-container');
    if (!container) return;

    if (cases.length === 0) {
      container.innerHTML = `<div class="card"><div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg></div>
        <h3>No cases yet</h3>
        <p>Create your first investigation case to begin evidence intake.</p>
        <button class="btn btn-primary" data-action="new-case">Create First Case</button>
      </div></div>`;
      return;
    }

    container.innerHTML = `<div class="cases-table-wrap">
      <table class="cases-table">
        <thead><tr>
          <th>Case ID</th><th>Title</th><th>Crime Type</th><th>Status</th>
          <th>Evidence</th><th>Critical</th><th>Unassigned</th><th>Incident Date</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${cases.map(c => {
            const cStats    = Storage.getStatsByCaseId(c.id);
            const statusCss = `status-${(c.status || 'active').toLowerCase()}`;
            return `<tr>
              <td class="evidence-id-cell">${escapeHtml(c.id)}</td>
              <td><button class="case-select-btn" data-caseid="${escapeHtml(c.id)}">${escapeHtml(c.title)}${c.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}</button></td>
              <td>${escapeHtml(c.crimeType || '—')}</td>
              <td><span class="case-status-badge ${statusCss}">${escapeHtml(c.status || 'Active')}</span></td>
              <td><strong>${cStats.totalEvidence}</strong></td>
              <td>${cStats.priorityCounts.Critical > 0 ? `<span style="color:var(--critical);font-weight:700">${cStats.priorityCounts.Critical}</span>` : '0'}</td>
              <td>${cStats.priorityCounts.Unassigned > 0 ? `<span style="color:var(--text-muted)">${cStats.priorityCounts.Unassigned}</span>` : '0'}</td>
              <td style="color:var(--text-muted)">${formatDate(c.incidentDate)}</td>
              <td>
                <div class="table-actions">
                  <button class="icon-btn" data-action="open-case" data-caseid="${escapeHtml(c.id)}" title="Open case">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  </button>
                  <button class="icon-btn" data-action="edit-case" data-caseid="${escapeHtml(c.id)}" title="Edit case">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="icon-btn danger" data-action="delete-case" data-caseid="${escapeHtml(c.id)}" title="Delete case">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ── Case Details ──────────────────────────────────────────────────────────

  function openCaseDetail(caseId) {
    setActiveCase(caseId);
    showView('case-detail');
  }

  function renderCaseDetail() {
    if (!activeCaseId) { showView('cases'); return; }

    const c = Storage.getCaseById(activeCaseId);
    if (!c) { toast('Case not found.', 'error'); showView('cases'); return; }

    // Update page header
    const heading  = document.getElementById('case-detail-heading');
    const subtitle = document.getElementById('case-detail-subtitle');
    if (heading)  heading.textContent  = c.title;
    if (subtitle) subtitle.textContent = `${c.id} · ${c.crimeType || '—'}`;

    const container = document.getElementById('case-detail-container');
    const evidence  = Storage.getEvidence(activeCaseId);
    const cStats    = Storage.getStatsByCaseId(activeCaseId);
    const sorted    = Prioritization.sortByPriority(evidence);

    // Build evidence filter state
    const filterSearch   = '';
    const filterPriority = '';

    container.innerHTML = `
      <!-- Case Info Card -->
      <div class="card" style="margin-bottom:1rem">
        <div class="card-header">
          <div class="card-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <span class="card-title">Case Information</span>
          </div>
          <span class="case-status-badge status-${(c.status || 'active').toLowerCase()}">${escapeHtml(c.status || 'Active')}</span>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-row"><span class="info-label">Case ID</span><span class="info-value monospace">${escapeHtml(c.id)}</span></div>
            <div class="info-row"><span class="info-label">Crime Type</span><span class="info-value">${escapeHtml(c.crimeType || '—')}</span></div>
            <div class="info-row"><span class="info-label">Incident Date</span><span class="info-value">${formatDate(c.incidentDate)}</span></div>
            <div class="info-row"><span class="info-label">Location</span><span class="info-value">${escapeHtml(c.location || '—')}</span></div>
            <div class="info-row"><span class="info-label">Investigator</span><span class="info-value">${escapeHtml(c.investigator || '—')}</span></div>
            <div class="info-row"><span class="info-label">Status</span><span class="info-value">${escapeHtml(c.status || '—')}</span></div>
            <div class="info-row"><span class="info-label">Created</span><span class="info-value">${formatDateTime(c.createdAt)}</span></div>
            <div class="info-row"><span class="info-label">Last Updated</span><span class="info-value">${formatDateTime(c.updatedAt)}</span></div>
            ${c.description ? `<div class="info-row full-width"><span class="info-label">Description</span><span class="info-value">${escapeHtml(c.description)}</span></div>` : ''}
          </div>
        </div>
      </div>

      <!-- Priority Summary -->
      <div class="stats-grid" style="margin-bottom:1rem">
        ${['Critical','High','Medium','Low','Unassigned'].map(p => {
          const count = cStats.priorityCounts[p] || 0;
          const css   = PRIORITY_CSS[p];
          const cardCss = p === 'Critical' ? 'critical' : p === 'High' ? 'warning' : p === 'Low' ? 'success' : '';
          return `<div class="stat-card ${cardCss}">
            <div class="stat-body">
              <div class="stat-value">${count}</div>
              <div class="stat-label">${p}</div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Evidence Inventory -->
      <div class="card">
        <div class="card-header">
          <div class="card-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>
            <span class="card-title">Evidence Inventory</span>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center">
            <span class="card-badge">${evidence.length} item${evidence.length !== 1 ? 's' : ''}</span>
            <button class="btn btn-primary btn-sm" data-action="add-evidence">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Evidence
            </button>
          </div>
        </div>

        <!-- Filters toolbar -->
        <div style="padding:0.75rem 1.25rem;border-bottom:1px solid var(--border-light);display:flex;gap:0.6rem;flex-wrap:wrap">
          <div class="topbar-search" style="flex:1;max-width:280px;height:30px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="ev-search" placeholder="Search evidence…" aria-label="Search evidence" style="font-size:0.78rem" />
          </div>
          <select id="ev-filter-category" class="filter-select" aria-label="Filter by category" style="min-width:160px">
            <option value="">All Categories</option>
            ${Storage.EVIDENCE_CATEGORIES.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
          </select>
          <select id="ev-filter-priority" class="filter-select" aria-label="Filter by priority" style="min-width:150px">
            <option value="">All Priorities</option>
            ${Storage.PRIORITY_LEVELS.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
          </select>
          <select id="ev-sort" class="filter-select" aria-label="Sort" style="min-width:160px">
            <option value="priority">Sort: Priority</option>
            <option value="date-desc">Sort: Newest First</option>
            <option value="date-asc">Sort: Oldest First</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>

        <div id="evidence-table-body">
          ${renderEvidenceTable(sorted, activeCaseId)}
        </div>
      </div>
    `;

    // Bind live filter/search
    ['ev-search', 'ev-filter-category', 'ev-filter-priority', 'ev-sort'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', refreshEvidenceTable);
    });
  }

  function refreshEvidenceTable() {
    if (!activeCaseId) return;
    const search   = (document.getElementById('ev-search')?.value || '').toLowerCase().trim();
    const catFilt  = document.getElementById('ev-filter-category')?.value || '';
    const priofilt = document.getElementById('ev-filter-priority')?.value || '';
    const sortBy   = document.getElementById('ev-sort')?.value || 'priority';

    let evidence = Storage.getEvidence(activeCaseId);

    if (search)   evidence = evidence.filter(ev =>
      (ev.name || '').toLowerCase().includes(search) ||
      (ev.id   || '').toLowerCase().includes(search) ||
      (ev.category || '').toLowerCase().includes(search) ||
      (ev.description || '').toLowerCase().includes(search)
    );
    if (catFilt)  evidence = evidence.filter(ev => (ev.category || '') === catFilt);
    if (priofilt) evidence = evidence.filter(ev => (ev.priority  || 'Unassigned') === priofilt);

    if (sortBy === 'priority')  evidence = Prioritization.sortByPriority(evidence);
    else if (sortBy === 'date-desc') evidence = [...evidence].sort((a,b) => new Date(b.createdAt||0)-new Date(a.createdAt||0));
    else if (sortBy === 'date-asc')  evidence = [...evidence].sort((a,b) => new Date(a.createdAt||0)-new Date(b.createdAt||0));
    else if (sortBy === 'name')      evidence = [...evidence].sort((a,b) => (a.name||'').localeCompare(b.name||''));

    const body = document.getElementById('evidence-table-body');
    if (body) body.innerHTML = renderEvidenceTable(evidence, activeCaseId);
  }

  function renderEvidenceTable(evidence, caseId) {
    if (evidence.length === 0) {
      return `<div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg></div>
        <h3>No evidence items</h3>
        <p>No evidence added to this case yet, or no items match the current filter.</p>
        <button class="btn btn-primary btn-sm" data-action="add-evidence">Add First Evidence Item</button>
      </div>`;
    }

    return `<div class="evidence-table-wrap" style="border:none;border-radius:0">
      <table class="evidence-table">
        <thead><tr>
          <th>Evidence ID</th>
          <th>Name</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Collection Date</th>
          <th>Created At</th>
          <th>Updated At</th>
          <th>Actions</th>
        </tr></thead>
        <tbody>
          ${evidence.map(ev => {
            const priority = ev.priority || 'Unassigned';
            const priCss   = PRIORITY_CSS[priority] || 'unassigned';
            const status   = ev.status || 'Received';
            return `<tr>
              <td class="evidence-id-cell">${escapeHtml(ev.id)}</td>
              <td class="evidence-name-cell" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(ev.name)}">${escapeHtml(ev.name)}</td>
              <td><span class="evidence-type-chip">${escapeHtml(ev.category || '—')}</span></td>
              <td>
                <span class="priority-badge ${priCss}">${escapeHtml(priority)}</span>
              </td>
              <td><span class="status-chip pending">${escapeHtml(status)}</span></td>
              <td style="color:var(--text-muted)">${formatDate(ev.collectionDate)}</td>
              <td style="color:var(--text-muted)">${formatDate(ev.createdAt)}</td>
              <td style="color:var(--text-muted)">${formatDate(ev.updatedAt)}</td>
              <td>
                <div class="table-actions">
                  <button class="icon-btn" data-action="view-evidence" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(caseId)}" title="View detail">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button class="icon-btn" data-action="edit-evidence" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(caseId)}" title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="icon-btn" data-action="change-priority" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(caseId)}" title="Change priority">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </button>
                  <button class="icon-btn danger" data-action="delete-evidence" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(caseId)}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ── Schedule View ─────────────────────────────────────────────────────────

  function renderSchedule() {
    const container = document.getElementById('schedule-container');
    if (!activeCaseId) {
      container.innerHTML = `<div class="card"><div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <h3>No case selected</h3>
        <p>Open a case to view its FSL examination schedule.</p>
        <button class="btn btn-secondary" data-action="back-to-cases">Go to Cases</button>
      </div></div>`;
      return;
    }

    const evidence = Storage.getEvidence(activeCaseId);
    if (evidence.length === 0) {
      container.innerHTML = `<div class="card"><div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <h3>No evidence to schedule</h3>
        <p>Add evidence to this case, then assign priorities to generate an examination schedule.</p>
      </div></div>`;
      return;
    }

    const sorted    = Prioritization.sortByPriority(evidence);
    const scheduled = Prioritization.generateSchedule(sorted);

    container.innerHTML = `<div class="schedule-table-wrap">
      <table class="schedule-table">
        <thead><tr>
          <th>Order</th>
          <th>Evidence ID</th>
          <th>Name</th>
          <th>Category</th>
          <th>Priority</th>
          <th>Suggested Examinations</th>
          <th>Rationale</th>
        </tr></thead>
        <tbody>
          ${scheduled.map(ev => {
            const priority = ev.priority || 'Unassigned';
            const priCss   = PRIORITY_CSS[priority] || 'unassigned';
            const sugg     = Prioritization.getSuggestions(ev.category);
            return `<tr>
              <td>
                <div class="order-cell">
                  <div class="order-num order-${priCss}">${ev._scheduleOrder}</div>
                </div>
              </td>
              <td class="evidence-id-cell">${escapeHtml(ev.id)}</td>
              <td style="font-weight:600">${escapeHtml(ev.name)}</td>
              <td><span class="evidence-type-chip">${escapeHtml(ev.category || '—')}</span></td>
              <td>${priorityBadge(priority)}</td>
              <td style="font-size:0.75rem;color:var(--text-secondary)">${sugg.slice(0, 2).map(r => `• ${escapeHtml(r)}`).join('<br>')}</td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(ev._scheduleRationale || '')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ── Report View ───────────────────────────────────────────────────────────

  function renderReport() {
    const container = document.getElementById('report-container');
    if (!activeCaseId) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <h3>No case selected</h3><p>Open a case to generate its report.</p>
      </div>`;
      return;
    }
    const caseObj = Storage.getCaseById(activeCaseId);
    const evidence = Storage.getEvidence(activeCaseId);
    if (evidence.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/></svg></div>
        <h3>No evidence to report</h3><p>Add evidence to this case first.</p>
      </div>`;
      return;
    }
    const sorted    = Prioritization.sortByPriority(evidence);
    const scheduled = Prioritization.generateSchedule(sorted);
    container.innerHTML = Reports.generateReport(caseObj, scheduled);
  }

  // ── Evidence Detail Modal ─────────────────────────────────────────────────

  function showEvidenceDetail(evId, caseId) {
    const targetCase = caseId || activeCaseId;
    const ev = Storage.getEvidenceById(evId, targetCase);
    if (!ev) { toast('Evidence not found.', 'error'); return; }

    const priority = ev.priority || 'Unassigned';
    const sugg     = Prioritization.getSuggestions(ev.category);

    // Record last viewed
    const updatedEv = { ...ev, lastViewedAt: new Date().toISOString() };
    Storage.saveEvidence(updatedEv);

    openModal(`
      <div class="modal-title">Evidence — ${escapeHtml(ev.id)}</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Evidence ID</span><span class="info-value monospace">${escapeHtml(ev.id)}</span></div>
        <div class="info-row"><span class="info-label">Case</span><span class="info-value monospace">${escapeHtml(ev.caseId)}</span></div>
        <div class="info-row full-width"><span class="info-label">Name</span><span class="info-value">${escapeHtml(ev.name)}</span></div>
        <div class="info-row"><span class="info-label">Category</span><span class="info-value"><span class="evidence-type-chip">${escapeHtml(ev.category || '—')}</span></span></div>
        <div class="info-row"><span class="info-label">Manual Priority</span><span class="info-value">${priorityBadge(priority)}</span></div>
        <div class="info-row"><span class="info-label">Status</span><span class="info-value">${escapeHtml(ev.status || 'Received')}</span></div>
        <div class="info-row"><span class="info-label">Collection Location</span><span class="info-value">${escapeHtml(ev.collectionLocation || '—')}</span></div>
        <div class="info-row"><span class="info-label">Collection Date</span><span class="info-value">${formatDate(ev.collectionDate)}</span></div>
        <div class="info-row full-width"><span class="info-label">Description</span><span class="info-value">${escapeHtml(ev.description || '—')}</span></div>
        <div class="info-row full-width"><span class="info-label">Preservation Notes</span><span class="info-value">${escapeHtml(ev.preservationNotes || '—')}</span></div>
        <div class="info-row full-width"><span class="info-label">Attachments / Reference</span><span class="info-value">${escapeHtml(ev.attachments || '—')}</span></div>
        <div class="info-row"><span class="info-label">Created At</span><span class="info-value">${formatDateTime(ev.createdAt)}</span></div>
        <div class="info-row"><span class="info-label">Updated At</span><span class="info-value">${formatDateTime(ev.updatedAt)}</span></div>
        <div class="info-row"><span class="info-label">Last Viewed</span><span class="info-value">${formatDateTime(updatedEv.lastViewedAt)}</span></div>
      </div>

      ${ev.priorityHistory && ev.priorityHistory.length > 0 ? `
      <hr class="divider">
      <div class="info-label" style="margin-bottom:0.5rem">Priority Change History</div>
      <div style="font-size:0.78rem">
        ${ev.priorityHistory.slice().reverse().map(h => `
        <div style="display:flex;gap:0.5rem;align-items:center;padding:0.3rem 0;border-bottom:1px solid var(--border-light)">
          <span style="color:var(--text-muted)">${formatDateTime(h.timestamp)}</span>
          <span>${priorityBadge(h.previousPriority)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <span>${priorityBadge(h.newPriority)}</span>
          <span style="color:var(--text-secondary)">${escapeHtml(h.investigator)}</span>
          ${h.reason ? `<span style="color:var(--text-muted);font-style:italic">— ${escapeHtml(h.reason)}</span>` : ''}
        </div>`).join('')}
      </div>` : ''}

      <hr class="divider">
      <div class="info-label" style="margin-bottom:0.4rem">Suggested Examination Types <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted)">(informational only — does not determine priority)</span></div>
      <ul style="margin-left:1.1rem;font-size:0.8rem;color:var(--text-secondary)">
        ${sugg.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>

      <div class="form-actions">
        <button class="btn btn-secondary" data-action="close-modal">Close</button>
        <button class="btn btn-ghost" data-action="change-priority" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(ev.caseId)}">Change Priority</button>
        <button class="btn btn-primary" data-action="edit-evidence" data-evid="${escapeHtml(ev.id)}" data-caseid="${escapeHtml(ev.caseId)}">Edit</button>
      </div>
    `);
  }

  // ── Change Priority Modal ─────────────────────────────────────────────────

  function showChangePriorityModal(evId, caseId) {
    const targetCase = caseId || activeCaseId;
    const ev = Storage.getEvidenceById(evId, targetCase);
    if (!ev) { toast('Evidence not found.', 'error'); return; }

    const currentPriority = ev.priority || 'Unassigned';
    const caseObj = Storage.getCaseById(targetCase);

    openModal(`
      <div class="modal-title">Change Priority — ${escapeHtml(ev.id)}</div>
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:1.25rem">
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.35rem">Evidence</div>
        <div style="font-weight:600">${escapeHtml(ev.name)}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.25rem">
          Current priority: ${priorityBadge(currentPriority)}
        </div>
      </div>
      <form id="priority-form" novalidate>
        <div class="form-group" style="margin-bottom:1rem">
          <label>New Priority <span class="required">*</span></label>
          <select name="newPriority" required>
            <option value="">Select priority…</option>
            ${Storage.PRIORITY_LEVELS.map(p =>
              `<option value="${escapeHtml(p)}" ${p === currentPriority ? 'selected' : ''}>${escapeHtml(p)}</option>`
            ).join('')}
          </select>
          <span class="field-error" id="err-priority"></span>
        </div>
        <div class="form-group" style="margin-bottom:1.25rem">
          <label>Reason for Change <span style="font-weight:400;text-transform:none;font-size:0.72rem;letter-spacing:0;color:var(--text-muted)">(recommended)</span></label>
          <input type="text" name="reason" placeholder="e.g., Biological evidence shows signs of degradation — elevating to Critical" maxlength="300" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Apply Priority Change</button>
        </div>
      </form>
    `);

    document.getElementById('priority-form').addEventListener('submit', e => {
      e.preventDefault();
      const form        = e.target;
      const newPriority = form.elements.newPriority.value;
      const reason      = form.elements.reason.value.trim();

      if (!newPriority) {
        document.getElementById('err-priority').textContent = 'Please select a priority level.';
        return;
      }

      Storage.recordPriorityChange(evId, targetCase, {
        newPriority,
        investigator: caseObj ? caseObj.investigator : 'Investigator',
        reason,
      });

      closeModal();
      toast(`Priority of ${evId} changed to ${newPriority}.`, 'success');

      // Refresh whichever view is active
      if (currentView === 'case-detail') renderCaseDetail();
      if (currentView === 'dashboard')   renderDashboard();
      if (currentView === 'schedule')    renderSchedule();
    });
  }

  // ── Case Form ─────────────────────────────────────────────────────────────

  function showCaseForm(existingCase) {
    const isEdit = !!existingCase;
    const c  = existingCase || {};
    const id = isEdit ? c.id : Storage.generateCaseId();

    // Determine if crime type is a standard one or custom
    const isCustomCrime = c.crimeType && !Storage.CRIME_TYPES.includes(c.crimeType);

    openModal(`
      <div class="modal-title">${isEdit ? 'Edit Case' : 'New Investigation Case'}</div>
      <form id="case-form" novalidate>
        <div class="form-grid">
          <div class="form-group">
            <label>Case ID</label>
            <input type="text" value="${escapeHtml(id)}" readonly style="opacity:0.55;cursor:not-allowed;background:var(--surface-alt)" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="Active"   ${(!c.status || c.status === 'Active')   ? 'selected' : ''}>Active</option>
              <option value="Pending"  ${c.status === 'Pending'  ? 'selected' : ''}>Pending</option>
              <option value="Closed"   ${c.status === 'Closed'   ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Case Title <span class="required">*</span></label>
            <input type="text" name="title" value="${escapeHtml(c.title || '')}" placeholder="e.g., Riverside Park Incident" maxlength="120" required />
            <span class="field-error" id="err-title"></span>
          </div>
          <div class="form-group">
            <label>Crime Type <span class="required">*</span></label>
            <select name="crimeType" id="crime-type-select" required>
              <option value="">Select crime type…</option>
              ${Storage.CRIME_TYPES.map(t => `<option value="${escapeHtml(t)}" ${(!isCustomCrime && c.crimeType === t) ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
              ${isCustomCrime ? `<option value="Other" selected>Other</option>` : ''}
            </select>
            <span class="field-error" id="err-crimeType"></span>
          </div>
          <div class="form-group" id="crime-other-group" ${(!isCustomCrime) ? 'hidden' : ''}>
            <label>Custom Crime Type <span class="required">*</span></label>
            <input type="text" name="crimeTypeCustom" value="${isCustomCrime ? escapeHtml(c.crimeType) : ''}" placeholder="Describe the crime type…" maxlength="100" />
            <span class="field-error" id="err-crimeTypeCustom"></span>
          </div>
          <div class="form-group">
            <label>Incident Date</label>
            <input type="date" name="incidentDate" value="${escapeHtml(c.incidentDate || '')}" max="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" name="location" value="${escapeHtml(c.location || '')}" placeholder="e.g., 45 Elm Street, Block A" maxlength="200" />
          </div>
          <div class="form-group">
            <label>Investigator <span class="required">*</span></label>
            <input type="text" name="investigator" value="${escapeHtml(c.investigator || '')}" placeholder="Officer / detective name" maxlength="100" required />
            <span class="field-error" id="err-investigator"></span>
          </div>
          <div class="form-group full-width">
            <label>Case Description</label>
            <textarea name="description" rows="3" placeholder="Brief case summary…" maxlength="1000">${escapeHtml(c.description || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Case'}</button>
        </div>
      </form>
    `);

    // Show/hide custom crime type input
    document.getElementById('crime-type-select').addEventListener('change', function() {
      const grp = document.getElementById('crime-other-group');
      if (grp) grp.hidden = (this.value !== 'Other');
    });

    document.getElementById('case-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      let valid  = true;

      // Clear errors
      ['title', 'crimeType', 'crimeTypeCustom', 'investigator'].forEach(f => {
        const el = document.getElementById(`err-${f}`);
        if (el) el.textContent = '';
      });

      const title        = form.elements.title.value.trim();
      const crimeTypeSel = form.elements.crimeType.value;
      const crimeTypeCustom = form.elements.crimeTypeCustom ? form.elements.crimeTypeCustom.value.trim() : '';
      const investigator = form.elements.investigator.value.trim();

      if (!title)        { document.getElementById('err-title').textContent = 'Case title is required.'; valid = false; }
      if (!crimeTypeSel) { document.getElementById('err-crimeType').textContent = 'Please select a crime type.'; valid = false; }
      if (crimeTypeSel === 'Other' && !crimeTypeCustom) {
        document.getElementById('err-crimeTypeCustom').textContent = 'Please describe the custom crime type.';
        valid = false;
      }
      if (!investigator) { document.getElementById('err-investigator').textContent = 'Investigator name is required.'; valid = false; }
      if (!valid) return;

      const finalCrimeType = (crimeTypeSel === 'Other') ? crimeTypeCustom : crimeTypeSel;
      const incidentDate   = form.elements.incidentDate.value;
      if (incidentDate && new Date(incidentDate) > new Date()) {
        toast('Incident date cannot be in the future.', 'warning'); return;
      }

      const caseObj = {
        id:           id,
        title,
        crimeType:    finalCrimeType,
        incidentDate,
        location:     form.elements.location.value.trim(),
        investigator,
        description:  form.elements.description.value.trim(),
        status:       form.elements.status.value,
        isDemo:       c.isDemo || false,
      };

      Storage.saveCase(caseObj);
      closeModal();
      toast(isEdit ? 'Case updated.' : `Case ${id} created.`, 'success');

      if (!isEdit) {
        setActiveCase(id);
        showView('case-detail');
      } else {
        if (currentView === 'cases')       renderCasesList();
        else if (currentView === 'case-detail') renderCaseDetail();
        else renderDashboard();
        updateNavState();
      }
    });
  }

  // ── Evidence Form ─────────────────────────────────────────────────────────

  function showEvidenceForm(existingEvidence, forceCaseId) {
    const targetCaseId = forceCaseId || activeCaseId;
    if (!targetCaseId) { toast('No case selected.', 'warning'); return; }

    const isEdit = !!existingEvidence;
    const ev  = existingEvidence || {};
    const id  = isEdit ? ev.id : Storage.generateEvidenceId(targetCaseId);

    const isCustomCat = ev.category && !Storage.EVIDENCE_CATEGORIES.includes(ev.category);

    // Build case options for case selector
    const allCases   = Storage.getCases();
    const caseOptions = allCases.map(cc =>
      `<option value="${escapeHtml(cc.id)}" ${cc.id === (ev.caseId || targetCaseId) ? 'selected' : ''}>${escapeHtml(cc.id)} — ${escapeHtml(cc.title)}</option>`
    ).join('');

    openModal(`
      <div class="modal-title">${isEdit ? 'Edit Evidence Item' : 'Add Evidence Item'}</div>
      <form id="evidence-form" novalidate>
        <div class="form-grid">
          <!-- Case Association -->
          <div class="form-group full-width">
            <label>Case Association <span class="required">*</span></label>
            <select name="caseId" id="ev-case-select" required ${isEdit ? 'disabled' : ''}>
              <option value="">Select case…</option>
              ${caseOptions}
            </select>
            <span class="field-error" id="err-ev-case"></span>
          </div>

          <div class="form-group">
            <label>Evidence ID</label>
            <input type="text" name="id" value="${escapeHtml(id)}" ${isEdit ? 'readonly style="opacity:0.55;cursor:not-allowed;background:var(--surface-alt)"' : ''} maxlength="30" />
            <span class="field-error" id="err-ev-id"></span>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="Received"    ${(!ev.status || ev.status === 'Received')    ? 'selected' : ''}>Received</option>
              <option value="In Analysis" ${ev.status === 'In Analysis' ? 'selected' : ''}>In Analysis</option>
              <option value="Completed"   ${ev.status === 'Completed'   ? 'selected' : ''}>Completed</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label>Name / Description <span class="required">*</span></label>
            <input type="text" name="name" value="${escapeHtml(ev.name || '')}" placeholder="e.g., Blood-stained shirt recovered near doorway" maxlength="150" required />
            <span class="field-error" id="err-ev-name"></span>
          </div>

          <!-- Category -->
          <div class="form-group">
            <label>Category <span class="required">*</span></label>
            <select name="category" id="ev-cat-select" required>
              <option value="">Select category…</option>
              ${Storage.EVIDENCE_CATEGORIES.map(cat => `<option value="${escapeHtml(cat)}" ${(!isCustomCat && ev.category === cat) ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
              ${isCustomCat ? `<option value="Other" selected>Other</option>` : ''}
            </select>
            <span class="field-error" id="err-ev-category"></span>
          </div>
          <div class="form-group" id="ev-cat-other-group" ${!isCustomCat ? 'hidden' : ''}>
            <label>Custom Category <span class="required">*</span></label>
            <input type="text" name="categoryCustom" value="${isCustomCat ? escapeHtml(ev.category) : ''}" placeholder="Describe the evidence category…" maxlength="100" />
            <span class="field-error" id="err-ev-categoryCustom"></span>
          </div>

          <!-- Manual Priority -->
          <div class="form-group">
            <label>Priority <span style="font-weight:400;text-transform:none;font-size:0.72rem;letter-spacing:0;color:var(--text-muted)">(set manually by investigator)</span></label>
            <select name="priority">
              ${Storage.PRIORITY_LEVELS.map(p =>
                `<option value="${escapeHtml(p)}" ${(ev.priority === p || (!ev.priority && p === 'Unassigned')) ? 'selected' : ''}>${escapeHtml(p)}</option>`
              ).join('')}
            </select>
          </div>

          <div class="form-group full-width">
            <label>Detailed Description</label>
            <textarea name="description" rows="2" maxlength="500" placeholder="Optional additional details…">${escapeHtml(ev.description || '')}</textarea>
          </div>

          <div class="form-group">
            <label>Collection Location</label>
            <input type="text" name="collectionLocation" value="${escapeHtml(ev.collectionLocation || '')}" placeholder="e.g., Living room floor, near window" maxlength="150" />
          </div>
          <div class="form-group">
            <label>Collection Date</label>
            <input type="date" name="collectionDate" value="${escapeHtml(ev.collectionDate || '')}" max="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label>Collected By</label>
            <input type="text" name="collectedBy" value="${escapeHtml(ev.collectedBy || '')}" placeholder="Officer / SOCO name" maxlength="100" />
          </div>
          <div class="form-group">
            <label>Requested Examination</label>
            <input type="text" name="requestedExam" value="${escapeHtml(ev.requestedExam || '')}" placeholder="e.g., DNA profiling" maxlength="200" />
          </div>
          <div class="form-group full-width">
            <label>Preservation Notes</label>
            <textarea name="preservationNotes" rows="2" maxlength="400" placeholder="Storage conditions, time-sensitive information, handling concerns…">${escapeHtml(ev.preservationNotes || '')}</textarea>
          </div>
          <div class="form-group full-width">
            <label>Attachments / Reference</label>
            <input type="text" name="attachments" value="${escapeHtml(ev.attachments || '')}" placeholder="Photo IDs, case ref numbers, lab ticket numbers…" maxlength="300" />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Evidence'}</button>
        </div>
      </form>
    `);

    // Show/hide custom category input
    document.getElementById('ev-cat-select').addEventListener('change', function() {
      const grp = document.getElementById('ev-cat-other-group');
      if (grp) grp.hidden = (this.value !== 'Other');
    });

    document.getElementById('evidence-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      let valid  = true;

      ['ev-case', 'ev-id', 'ev-name', 'ev-category', 'ev-categoryCustom'].forEach(f => {
        const el = document.getElementById(`err-${f}`);
        if (el) el.textContent = '';
      });

      const selectedCaseId = isEdit ? (ev.caseId || targetCaseId) : form.elements.caseId.value;
      const evidenceId     = (form.elements.id.value || '').trim();
      const name           = (form.elements.name.value || '').trim();
      const categorySel    = form.elements.category.value;
      const categoryCustom = form.elements.categoryCustom ? form.elements.categoryCustom.value.trim() : '';

      if (!selectedCaseId) { document.getElementById('err-ev-case').textContent = 'A case must be selected.'; valid = false; }
      if (!evidenceId)     { document.getElementById('err-ev-id').textContent   = 'Evidence ID is required.'; valid = false; }
      if (!isEdit && selectedCaseId && Storage.evidenceIdExists(evidenceId, selectedCaseId)) {
        document.getElementById('err-ev-id').textContent = `ID "${evidenceId}" already exists in this case.`; valid = false;
      }
      if (!name)           { document.getElementById('err-ev-name').textContent = 'Evidence name is required.'; valid = false; }
      if (!categorySel)    { document.getElementById('err-ev-category').textContent = 'Please select a category.'; valid = false; }
      if (categorySel === 'Other' && !categoryCustom) {
        document.getElementById('err-ev-categoryCustom').textContent = 'Please describe the custom category.'; valid = false;
      }
      if (!valid) return;

      const finalCategory = (categorySel === 'Other') ? categoryCustom : categorySel;
      const newPriority   = form.elements.priority.value;

      // If priority changed from existing, record in history
      const previousPriority = ev.priority || 'Unassigned';
      const priorityHistory  = ev.priorityHistory || [];
      if (isEdit && newPriority !== previousPriority) {
        const caseObj = Storage.getCaseById(selectedCaseId);
        priorityHistory.push({
          previousPriority,
          newPriority,
          investigator: caseObj ? caseObj.investigator : 'Investigator',
          reason:       '(Updated via edit form)',
          timestamp:    new Date().toISOString(),
        });
      }

      const evObj = {
        id:                evidenceId,
        caseId:            selectedCaseId,
        category:          finalCategory,
        name,
        priority:          newPriority,
        priorityHistory,
        status:            form.elements.status.value,
        description:       form.elements.description.value.trim(),
        collectionLocation:form.elements.collectionLocation.value.trim(),
        collectionDate:    form.elements.collectionDate.value,
        collectedBy:       form.elements.collectedBy.value.trim(),
        requestedExam:     form.elements.requestedExam.value.trim(),
        preservationNotes: form.elements.preservationNotes.value.trim(),
        attachments:       form.elements.attachments.value.trim(),
        lastViewedAt:      ev.lastViewedAt || null,
      };

      Storage.saveEvidence(evObj);
      closeModal();
      toast(isEdit ? 'Evidence updated.' : `Evidence ${evidenceId} added.`, 'success');

      if (currentView === 'case-detail') renderCaseDetail();
      if (currentView === 'dashboard')   renderDashboard();
      if (currentView === 'schedule')    renderSchedule();
    });
  }

  // ── Delete Confirmation ───────────────────────────────────────────────────

  function confirmDelete(title, message, onConfirm) {
    openModal(`
      <div class="confirm-dialog">
        <div class="confirm-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button class="btn btn-danger" id="confirm-delete-btn">Delete</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-delete-btn').addEventListener('click', () => { closeModal(); onConfirm(); });
  }

  // ── Demo Case ─────────────────────────────────────────────────────────────

  function loadDemoCase() {
    const existingDemoId = Storage.getDemoCaseId();
    if (existingDemoId && Storage.getCaseById(existingDemoId)) {
      toast('Demo case already loaded.', 'info');
      openCaseDetail(existingDemoId);
      return;
    }

    const demoId = `CASE-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    Storage.saveCase({
      id: demoId, title: 'Riverside Apartment Homicide — DEMO',
      crimeType: 'Murder', incidentDate: '2025-06-15',
      location: '12B Riverside Court, Apartment 4, Block East',
      investigator: 'Det. Sgt. J. Sharma',
      description: 'FICTIONAL DEMO DATA. Victim found in residential apartment. Multiple evidence items collected at scene.',
      status: 'Active', isDemo: true,
    });
    Storage.setDemoCaseId(demoId);

    const demoEv = [
      { id: 'EV-001', caseId: demoId, category: 'Biological', name: 'Blood-stained clothing (shirt)', priority: 'Critical',
        description: 'White shirt, significant bloodstaining on chest and left sleeve.',
        collectionLocation: 'Hallway entrance', collectionDate: '2025-06-15',
        preservationNotes: 'Item disturbed by first responders. Refrigerated. Biological degradation risk — examine promptly.',
        collectedBy: 'SOCO Officer R. Patel', requestedExam: 'DNA profiling, serology', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'Critical', investigator: 'Det. Sgt. J. Sharma', reason: 'Biological evidence with contamination risk — requires immediate examination', timestamp: new Date().toISOString() }],
      },
      { id: 'EV-002', caseId: demoId, category: 'Digital', name: 'Victim mobile phone (Samsung Galaxy)', priority: 'High',
        description: 'Locked Android smartphone, screen cracked, found under couch cushion.',
        collectionLocation: 'Living room sofa', collectionDate: '2025-06-15',
        preservationNotes: 'Placed in Faraday bag immediately on recovery. Risk of remote wipe if connectivity restored.',
        collectedBy: 'SOCO Officer R. Patel', requestedExam: 'Forensic imaging, call/message recovery', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'High', investigator: 'Det. Sgt. J. Sharma', reason: 'Digital evidence — remote wipe risk', timestamp: new Date().toISOString() }],
      },
      { id: 'EV-003', caseId: demoId, category: 'Fingerprint / Impression', name: 'Latent fingerprint on wine glass', priority: 'Medium',
        description: 'Clear partial latent print on exterior of wine glass from kitchen counter.',
        collectionLocation: 'Kitchen counter, near sink', collectionDate: '2025-06-15',
        preservationNotes: 'Glass secured in evidence bag. Print photographed in situ before lifting.',
        collectedBy: 'SOCO Officer R. Patel', requestedExam: 'AFIS comparison', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'Medium', investigator: 'Det. Sgt. J. Sharma', reason: 'Stable fingerprint — no degradation risk, examine after critical items', timestamp: new Date().toISOString() }],
      },
      { id: 'EV-004', caseId: demoId, category: 'Digital', name: 'CCTV footage — building entrance', priority: 'Medium',
        description: 'USB drive with 6-hour footage from building entrance camera (18:00–24:00).',
        collectionLocation: 'Building manager office', collectionDate: '2025-06-16',
        preservationNotes: 'Original USB sealed. Duplicate created for analysis.',
        collectedBy: 'DC A. Okonkwo', requestedExam: 'Video analysis, timestamp verification', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'Medium', investigator: 'Det. Sgt. J. Sharma', reason: 'Digital footage — stable, no degradation. Medium priority pending other findings.', timestamp: new Date().toISOString() }],
      },
      { id: 'EV-005', caseId: demoId, category: 'Physical', name: 'Kitchen knife with possible bloodstaining', priority: 'Critical',
        description: 'Chef knife, 20 cm blade, found in kitchen sink. Residue on blade consistent with blood.',
        collectionLocation: 'Kitchen sink', collectionDate: '2025-06-15',
        preservationNotes: 'Knife was submerged in water — evidence integrity compromised. Evidence recovery urgent.',
        collectedBy: 'SOCO Officer R. Patel', requestedExam: 'DNA from blade residue, fingerprint development on handle', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'Critical', investigator: 'Det. Sgt. J. Sharma', reason: 'Potential murder weapon, submerged in water — evidence integrity at immediate risk', timestamp: new Date().toISOString() }],
      },
      { id: 'EV-006', caseId: demoId, category: 'Trace', name: 'Hair sample — unidentified origin', priority: 'Low',
        description: 'Single hair with root attached found on victim\'s clothing.',
        collectionLocation: 'Victim shirt (EV-001)', collectionDate: '2025-06-15',
        preservationNotes: 'Stored dry in paper envelope. Stable — no degradation risk noted.',
        collectedBy: 'SOCO Officer R. Patel', requestedExam: 'mtDNA analysis, microscopic comparison', status: 'Received',
        priorityHistory: [{ previousPriority: 'Unassigned', newPriority: 'Low', investigator: 'Det. Sgt. J. Sharma', reason: 'Stable trace evidence, stable storage. Schedule after higher-priority biological items.', timestamp: new Date().toISOString() }],
      },
    ];

    demoEv.forEach(ev => Storage.saveEvidence(ev));
    Storage.setDemoCaseId(demoId);

    toast('Demo case loaded with 6 evidence items. All data is fictional.', 'success');
    openCaseDetail(demoId);
    renderDashboard();
    const resetBtn = document.getElementById('qa-reset-demo');
    if (resetBtn) resetBtn.hidden = false;
  }

  function resetDemoCase() {
    confirmDelete(
      'Reset Demo Case',
      'This will delete the demo case and all its evidence. Your own cases will not be affected.',
      () => {
        const demoId = Storage.getDemoCaseId();
        Storage.resetDemoCase();
        if (activeCaseId === demoId) { setActiveCase(null); showView('dashboard'); }
        renderDashboard();
        toast('Demo case reset.', 'info');
      }
    );
  }

  // ── Global Event Delegation ───────────────────────────────────────────────

  function handleGlobalAction(target) {
    const action = target.dataset.action;
    const caseId = target.dataset.caseid;
    const evId   = target.dataset.evid;

    if (!action) return false;

    switch (action) {
      case 'new-case':           showCaseForm(null);                    return true;
      case 'close-modal':        closeModal();                          return true;
      case 'load-demo':          loadDemoCase();                        return true;
      case 'reset-demo':         resetDemoCase();                       return true;
      case 'back-to-cases':      showView('cases');                     return true;

      case 'open-case':
        if (caseId) openCaseDetail(caseId);                            return true;
      case 'view-active-case':
        if (activeCaseId) openCaseDetail(activeCaseId);
        else { toast('No active case.', 'warning'); showView('cases'); }
                                                                        return true;
      case 'edit-current-case': {
        const c = activeCaseId ? Storage.getCaseById(activeCaseId) : null;
        if (c) showCaseForm(c);
                                                                        return true;
      }
      case 'edit-case': {
        const c = Storage.getCaseById(caseId);
        if (c) showCaseForm(c);
                                                                        return true;
      }
      case 'delete-case':
        if (!caseId) return true;
        confirmDelete(
          'Delete Case',
          `Delete case "${Storage.getCaseById(caseId)?.title || caseId}" and all its evidence? This cannot be undone.`,
          () => {
            if (activeCaseId === caseId) setActiveCase(null);
            Storage.deleteCase(caseId);
            if (currentView === 'case-detail') showView('cases');
            else renderCasesList();
            renderDashboard();
            toast('Case deleted.', 'info');
          }
        );
                                                                        return true;

      case 'add-evidence':
        if (!activeCaseId) { toast('Open a case first.', 'warning'); showView('cases'); return true; }
        showEvidenceForm(null, activeCaseId);                           return true;

      case 'view-evidence':
        if (evId) showEvidenceDetail(evId, caseId || activeCaseId);    return true;

      case 'edit-evidence': {
        closeModal();
        const targetCase = caseId || activeCaseId;
        const ev = evId ? Storage.getEvidenceById(evId, targetCase) : null;
        if (ev) { if (ev.caseId !== activeCaseId) setActiveCase(ev.caseId); showEvidenceForm(ev, ev.caseId); }
                                                                        return true;
      }
      case 'change-priority':
        if (evId) showChangePriorityModal(evId, caseId || activeCaseId); return true;

      case 'delete-evidence':
        if (!evId) return true;
        confirmDelete(
          'Delete Evidence',
          `Delete evidence "${Storage.getEvidenceById(evId, caseId || activeCaseId)?.name || evId}"? This cannot be undone.`,
          () => {
            Storage.deleteEvidence(evId, caseId || activeCaseId);
            if (currentView === 'case-detail') renderCaseDetail();
            renderDashboard();
            toast('Evidence deleted.', 'info');
          }
        );
                                                                        return true;

      case 'generate-report':
        if (!activeCaseId) { toast('Open a case first.', 'warning'); return true; }
        showView('report');                                             return true;
    }
    return false;
  }

  // ── Sidebar Collapse ──────────────────────────────────────────────────────

  function initSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const appBody   = document.getElementById('app-body');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      appBody.classList.toggle('sidebar-collapsed');
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    initSidebar();

    // Sidebar nav
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => { if (!btn.disabled) showView(btn.dataset.view); });
    });

    // Global click delegation
    document.addEventListener('click', e => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) { handleGlobalAction(actionEl); return; }

      const caseBtn = e.target.closest('.case-select-btn');
      if (caseBtn && caseBtn.dataset.caseid) { openCaseDetail(caseBtn.dataset.caseid); return; }
    });

    // Modal close
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('modal-overlay').hidden) closeModal();
    });

    // Dashboard status filter
    const dashFilter = document.getElementById('dash-filter-status');
    if (dashFilter) dashFilter.addEventListener('change', renderDashboardCases);

    updateNavState();
    renderDashboard();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { showView, toast, loadDemoCase, openCaseDetail };
})();
