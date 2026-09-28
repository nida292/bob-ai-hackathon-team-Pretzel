/**
 * app.js — Main application controller for ForensiTriage
 * Handles navigation, UI rendering, modals, forms, and wires all modules together.
 */

// ── App state ────────────────────────────────────────────────────────────────
const App = (() => {
  let currentView = 'dashboard';
  let activeCaseId = null;
  let lastPrioritized = []; // cached prioritization results

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

  // ── Toast notifications ───────────────────────────────────────────────────

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;
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
    // Focus first focusable element
    const first = overlay.querySelector('input, select, textarea, button:not(.modal-close)');
    if (first) first.focus();
    overlay._onClose = onClose || null;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.hidden = true;
    document.body.style.overflow = '';
    const content = document.getElementById('modal-content');
    content.innerHTML = '';
    if (overlay._onClose) { overlay._onClose(); overlay._onClose = null; }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(`view-${viewName}`);
    if (view) { view.hidden = false; view.removeAttribute('hidden'); }
    const btn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }
    currentView = viewName;

    // Populate views on navigation
    if (viewName === 'dashboard')  renderDashboard();
    if (viewName === 'cases')      renderCasesList();
    if (viewName === 'evidence')   renderEvidenceList();
    if (viewName === 'priorities') renderPriorities();
    if (viewName === 'schedule')   renderSchedule();
    if (viewName === 'report')     renderReport();
  }

  function updateNavState() {
    const caseNavBtns = ['evidence', 'priorities', 'schedule', 'report'].map(id => document.getElementById(`nav-${id}`));
    caseNavBtns.forEach(btn => {
      if (btn) btn.disabled = !activeCaseId;
    });
    const badge = document.getElementById('active-case-badge');
    const titleBadge = document.getElementById('active-case-title-badge');
    if (activeCaseId) {
      const c = Storage.getCaseById(activeCaseId);
      badge.hidden = false;
      titleBadge.textContent = c ? c.title : activeCaseId;
    } else {
      badge.hidden = true;
    }
    // Quick action buttons
    const qaEvidence = document.getElementById('qa-add-evidence');
    const qaPriority = document.getElementById('qa-run-priority');
    const qaReport   = document.getElementById('qa-report');
    if (qaEvidence) qaEvidence.disabled = !activeCaseId;
    if (qaPriority) qaPriority.disabled = !activeCaseId;
    if (qaReport)   qaReport.disabled = !activeCaseId;
  }

  function setActiveCase(caseId) {
    activeCaseId = caseId;
    lastPrioritized = [];
    updateNavState();
    updateCaseLabels();
  }

  function updateCaseLabels() {
    if (!activeCaseId) return;
    const c = Storage.getCaseById(activeCaseId);
    const label = c ? `${c.id} — ${c.title}` : activeCaseId;
    ['evidence', 'priorities', 'schedule'].forEach(v => {
      const el = document.getElementById(`${v}-case-label`);
      if (el) el.textContent = label;
    });
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  function renderDashboard() {
    const stats = Storage.getStats();
    document.getElementById('stat-total-cases').textContent   = stats.totalCases;
    document.getElementById('stat-active-cases').textContent  = stats.activeCases;
    document.getElementById('stat-total-evidence').textContent = stats.totalEvidence;

    // Count critical items across all cases
    const allEvidence = Storage.getEvidence();
    const criticalCount = allEvidence.filter(ev => {
      const eff = ev.override ? ev.override.priority : Prioritization.classifyPriority(Prioritization.computeScore(ev).total);
      return eff === 'critical';
    }).length;
    document.getElementById('stat-critical').textContent = criticalCount;

    // Recent cases
    const cases = Storage.getCases().slice(0, 5);
    const listEl = document.getElementById('recent-cases-list');

    if (cases.length === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No cases yet. Get started below.</p>
        <button class="btn btn-primary" data-action="new-case">Create Your First Case</button>
        <button class="btn btn-secondary" data-action="load-demo">Load Demo Case</button>
      </div>`;
    } else {
      listEl.innerHTML = cases.map(c => {
        const evidenceCount = Storage.getEvidence(c.id).length;
        const statusClass = `status-${c.status || 'active'}`;
        return `<div class="recent-case-row" data-caseid="${escapeHtml(c.id)}" role="button" tabindex="0" aria-label="Open case ${escapeHtml(c.title)}">
          <div class="recent-case-info">
            <div class="recent-case-title">${escapeHtml(c.title)}${c.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}</div>
            <div class="recent-case-meta">${escapeHtml(c.id)} · ${escapeHtml(c.crimeType || '—')} · ${evidenceCount} evidence item${evidenceCount !== 1 ? 's' : ''}</div>
          </div>
          <span class="case-status-badge ${statusClass}">${escapeHtml(c.status || 'active')}</span>
        </div>`;
      }).join('');

      // Bind click/keyboard on rows
      listEl.querySelectorAll('.recent-case-row').forEach(row => {
        row.addEventListener('click', () => selectCase(row.dataset.caseid));
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectCase(row.dataset.caseid); });
      });
    }

    // Demo reset button
    const demoCaseId = Storage.getDemoCaseId();
    const resetBtn = document.getElementById('qa-reset-demo');
    if (resetBtn) resetBtn.hidden = !demoCaseId;
  }

  // ── Cases list ────────────────────────────────────────────────────────────

  function renderCasesList() {
    const cases = Storage.getCases();
    const container = document.getElementById('cases-list-container');
    if (cases.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No cases yet.</p><button class="btn btn-primary" data-action="new-case">Create First Case</button></div>`;
      return;
    }
    container.innerHTML = `
      <div class="cases-table-wrap">
        <table class="cases-table">
          <thead><tr>
            <th>Case ID</th><th>Title</th><th>Crime Type</th><th>Incident Date</th>
            <th>Evidence</th><th>Status</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${cases.map(c => {
              const evidenceCount = Storage.getEvidence(c.id).length;
              const statusClass = `status-${c.status || 'active'}`;
              return `<tr>
                <td class="monospace" style="font-size:0.8rem">${escapeHtml(c.id)}</td>
                <td><button class="case-select-btn" data-caseid="${escapeHtml(c.id)}">${escapeHtml(c.title)}${c.isDemo ? '<span class="demo-tag" style="margin-left:0.4rem">DEMO</span>' : ''}</button></td>
                <td>${escapeHtml(c.crimeType || '—')}</td>
                <td>${formatDate(c.incidentDate)}</td>
                <td>${evidenceCount}</td>
                <td><span class="case-status-badge ${statusClass}">${escapeHtml(c.status || 'active')}</span></td>
                <td>${formatDateTime(c.createdAt)}</td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" data-action="select-case" data-caseid="${escapeHtml(c.id)}" title="Open case">📂</button>
                    <button class="icon-btn" data-action="edit-case" data-caseid="${escapeHtml(c.id)}" title="Edit case">✏️</button>
                    <button class="icon-btn danger" data-action="delete-case" data-caseid="${escapeHtml(c.id)}" title="Delete case">🗑</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function selectCase(caseId) {
    setActiveCase(caseId);
    toast(`Case ${caseId} selected.`, 'success');
    showView('evidence');
  }

  // ── Evidence list ─────────────────────────────────────────────────────────

  function renderEvidenceList() {
    if (!activeCaseId) {
      document.getElementById('evidence-list-container').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠</div><p>No case selected. Please select or create a case first.</p></div>`;
      return;
    }
    updateCaseLabels();

    let evidence = Storage.getEvidence(activeCaseId);

    // Apply search filter
    const searchTerm = (document.getElementById('evidence-search')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('evidence-filter-type')?.value || '';
    const priorityFilter = document.getElementById('evidence-filter-priority')?.value || '';

    if (searchTerm) {
      evidence = evidence.filter(e =>
        (e.name || '').toLowerCase().includes(searchTerm) ||
        (e.id || '').toLowerCase().includes(searchTerm) ||
        (e.type || '').toLowerCase().includes(searchTerm) ||
        (e.description || '').toLowerCase().includes(searchTerm)
      );
    }
    if (typeFilter) {
      evidence = evidence.filter(e => e.type === typeFilter);
    }
    if (priorityFilter) {
      evidence = evidence.filter(e => {
        const eff = e.override ? e.override.priority : Prioritization.classifyPriority(Prioritization.computeScore(e).total);
        return eff === priorityFilter;
      });
    }

    const container = document.getElementById('evidence-list-container');
    if (evidence.length === 0 && !searchTerm && !typeFilter && !priorityFilter) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔬</div><p>No evidence items yet.</p><button class="btn btn-primary" data-action="add-evidence">Add First Evidence Item</button></div>`;
      return;
    }
    if (evidence.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No evidence matches your search/filter.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="evidence-table-wrap">
        <table class="evidence-table">
          <thead><tr>
            <th>ID</th><th>Name</th><th>Type</th><th>Condition</th>
            <th>Collection Date</th><th>Contamination</th><th>Urgency</th><th>Priority</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${evidence.map(ev => {
              const score = Prioritization.computeScore(ev).total;
              const computed = Prioritization.classifyPriority(score);
              const effective = ev.override ? ev.override.priority : computed;
              return `<tr>
                <td class="evidence-id-cell">${escapeHtml(ev.id)}</td>
                <td class="evidence-name-cell">${escapeHtml(ev.name)}</td>
                <td><span class="evidence-type-chip">${escapeHtml(ev.type)}</span></td>
                <td>${escapeHtml(ev.condition || '—')}</td>
                <td>${formatDate(ev.collectionDate)}</td>
                <td>${escapeHtml(ev.contamination || '—')}</td>
                <td>${escapeHtml(ev.urgency || '—')}</td>
                <td><span class="priority-badge ${effective}">${effective.toUpperCase()}${ev.override ? ' ⚙' : ''}</span></td>
                <td>
                  <div class="table-actions">
                    <button class="icon-btn" data-action="view-evidence" data-evid="${escapeHtml(ev.id)}" title="View">👁</button>
                    <button class="icon-btn" data-action="edit-evidence" data-evid="${escapeHtml(ev.id)}" title="Edit">✏️</button>
                    <button class="icon-btn danger" data-action="delete-evidence" data-evid="${escapeHtml(ev.id)}" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Priorities view ───────────────────────────────────────────────────────

  function renderPriorities() {
    if (!activeCaseId) return;
    updateCaseLabels();
    const evidence = Storage.getEvidence(activeCaseId);
    const container = document.getElementById('priorities-list-container');

    if (evidence.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚡</div><p>No evidence added to this case. Add evidence first to run prioritization.</p><button class="btn btn-primary" data-action="add-evidence">Add Evidence</button></div>`;
      return;
    }

    lastPrioritized = Prioritization.prioritizeEvidence(evidence);

    container.innerHTML = lastPrioritized.map(ev => {
      const isOverrideApplied = !!ev.override;
      return `
      <div class="priority-card ${ev._effectivePriority}${isOverrideApplied ? ' override-applied' : ''}" id="pcard-${escapeHtml(ev.id)}">
        <div class="priority-card-header" data-card="${escapeHtml(ev.id)}">
          <span class="priority-badge ${ev._effectivePriority}">${ev._effectivePriority.toUpperCase()}</span>
          <span class="priority-card-title">${escapeHtml(ev.name)} <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400">${escapeHtml(ev.id)}</span></span>
          <span class="priority-score">Score: ${ev._score}/100</span>
          ${isOverrideApplied ? '<span class="priority-badge override" style="font-size:0.68rem">overridden</span>' : ''}
          <span class="expand-icon">▼</span>
        </div>
        <div class="priority-card-body">
          <div class="priority-factors">
            <h4>Score Breakdown</h4>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem">
              Degradation: <strong>${ev._breakdown.degradation}</strong> &nbsp;|&nbsp;
              Contamination: <strong>${ev._breakdown.contamination}</strong> &nbsp;|&nbsp;
              Urgency: <strong>${ev._breakdown.urgency}</strong> &nbsp;|&nbsp;
              Evidence Value: <strong>${ev._breakdown.evidenceValue}</strong> &nbsp;|&nbsp;
              Total: <strong>${ev._score}/100</strong>
            </div>
            <h4>Contributing Factors</h4>
            <ul class="factor-list">
              ${ev._factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
            </ul>
          </div>
          <div class="recommendation-box">
            <h4>Recommended Examinations <span style="font-size:0.72rem;font-weight:400;color:var(--text-muted)">(suggested types, not confirmed protocols)</span></h4>
            <ul style="margin:0.3rem 0 0 1.2rem;font-size:0.83rem;">
              ${ev._recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
          <div class="override-section">
            ${isOverrideApplied ? `
              <div class="override-applied-notice">
                ⚙ <strong>Override active:</strong> Priority changed from <strong>${ev._computedPriority.toUpperCase()}</strong> to <strong>${ev.override.priority.toUpperCase()}</strong>.
                Reason: "${escapeHtml(ev.override.reason)}"
                <button class="btn btn-ghost btn-sm" style="margin-left:0.75rem" data-action="clear-override" data-evid="${escapeHtml(ev.id)}">Clear Override</button>
              </div>
            ` : `
              <details>
                <summary style="cursor:pointer;font-size:0.82rem;color:var(--text-muted);padding:0.3rem 0">⚙ Manual Priority Override (requires reason)</summary>
                <div class="override-form" style="margin-top:0.75rem">
                  <select class="override-priority-select filter-select btn-sm" style="width:140px;" id="ov-priority-${escapeHtml(ev.id)}">
                    <option value="">Select priority…</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="routine">Routine</option>
                  </select>
                  <input type="text" class="override-input" id="ov-reason-${escapeHtml(ev.id)}" placeholder="Reason for override (required)…" maxlength="200" />
                  <button class="btn btn-secondary btn-sm" data-action="apply-override" data-evid="${escapeHtml(ev.id)}">Apply Override</button>
                </div>
              </details>
            `}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ── Schedule view ─────────────────────────────────────────────────────────

  function renderSchedule() {
    if (!activeCaseId) return;
    updateCaseLabels();
    const container = document.getElementById('schedule-container');

    if (lastPrioritized.length === 0) {
      const evidence = Storage.getEvidence(activeCaseId);
      if (evidence.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No evidence to schedule.</p></div>`;
        return;
      }
      lastPrioritized = Prioritization.prioritizeEvidence(evidence);
    }

    const scheduled = Prioritization.generateSchedule(lastPrioritized);
    container.innerHTML = `
      <div class="cases-table-wrap">
        <table class="schedule-table">
          <thead><tr><th>Order</th><th>Evidence ID</th><th>Name</th><th>Type</th><th>Priority</th><th>Recommended Examinations</th></tr></thead>
          <tbody>
            ${scheduled.map(ev => `
            <tr>
              <td>
                <div class="order-cell">
                  <div class="order-num order-${ev._effectivePriority}">${ev._scheduleOrder}</div>
                </div>
              </td>
              <td class="monospace" style="font-size:0.8rem">${escapeHtml(ev.id)}</td>
              <td><strong>${escapeHtml(ev.name)}</strong></td>
              <td><span class="evidence-type-chip">${escapeHtml(ev.type)}</span></td>
              <td><span class="priority-badge ${ev._effectivePriority}">${ev._effectivePriority.toUpperCase()}</span></td>
              <td style="font-size:0.8rem">${ev._recommendations.slice(0, 2).map(r => `• ${escapeHtml(r)}`).join('<br>')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── Report view ───────────────────────────────────────────────────────────

  function renderReport() {
    if (!activeCaseId) return;
    const caseObj = Storage.getCaseById(activeCaseId);
    const container = document.getElementById('report-container');

    const evidence = Storage.getEvidence(activeCaseId);
    if (evidence.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>No evidence to report on. Add evidence first.</p></div>`;
      return;
    }

    if (lastPrioritized.length === 0) {
      lastPrioritized = Prioritization.prioritizeEvidence(evidence);
    }
    const withSchedule = Prioritization.generateSchedule(lastPrioritized);
    container.innerHTML = Reports.generateReport(caseObj, withSchedule);
  }

  // ── Forms: New / Edit Case ────────────────────────────────────────────────

  const CRIME_TYPES = [
    'Homicide', 'Assault', 'Robbery', 'Burglary', 'Theft', 'Sexual Offence',
    'Fraud / Financial Crime', 'Drug Offence', 'Arson', 'Cybercrime',
    'Missing Person', 'Hit and Run', 'Terrorism', 'Other',
  ];

  function showCaseForm(existingCase) {
    const isEdit = !!existingCase;
    const c = existingCase || {};
    const id = isEdit ? c.id : Storage.generateCaseId();

    openModal(`
      <div class="modal-title">${isEdit ? 'Edit Case' : 'New Case'}</div>
      <form id="case-form" novalidate>
        <div class="form-grid">
          <div class="form-group">
            <label>Case ID</label>
            <input type="text" value="${escapeHtml(id)}" readonly style="opacity:0.6;cursor:not-allowed" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="active"   ${(!c.status || c.status === 'active')   ? 'selected' : ''}>Active</option>
              <option value="pending"  ${c.status === 'pending'  ? 'selected' : ''}>Pending</option>
              <option value="closed"   ${c.status === 'closed'   ? 'selected' : ''}>Closed</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label>Case Title <span class="required">*</span></label>
            <input type="text" name="title" value="${escapeHtml(c.title || '')}" placeholder="e.g., Riverside Park Incident" maxlength="120" required />
            <span class="field-error" id="err-title"></span>
          </div>
          <div class="form-group">
            <label>Crime Type <span class="required">*</span></label>
            <select name="crimeType" required>
              <option value="">Select crime type…</option>
              ${CRIME_TYPES.map(t => `<option value="${escapeHtml(t)}" ${c.crimeType === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
            <span class="field-error" id="err-crimeType"></span>
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

    document.getElementById('case-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      let valid = true;

      // Clear errors
      ['title', 'crimeType', 'investigator'].forEach(f => {
        const el = document.getElementById(`err-${f}`);
        if (el) el.textContent = '';
        const inp = form.elements[f];
        if (inp) inp.classList.remove('error');
      });

      const title       = form.elements.title.value.trim();
      const crimeType   = form.elements.crimeType.value;
      const investigator = form.elements.investigator.value.trim();

      if (!title)       { showFieldError('title',       'Case title is required.'); valid = false; }
      if (!crimeType)   { showFieldError('crimeType',   'Please select a crime type.'); valid = false; }
      if (!investigator){ showFieldError('investigator', 'Investigator name is required.'); valid = false; }

      if (!valid) return;

      const incidentDate = form.elements.incidentDate.value;
      if (incidentDate && new Date(incidentDate) > new Date()) {
        toast('Incident date cannot be in the future.', 'warning');
        form.elements.incidentDate.classList.add('error');
        valid = false;
      }

      const caseObj = {
        id:           id,
        title,
        crimeType,
        incidentDate: form.elements.incidentDate.value,
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
        showView('evidence');
      } else {
        if (currentView === 'cases') renderCasesList();
        else renderDashboard();
        updateNavState();
      }
    });
  }

  function showFieldError(fieldName, message) {
    const errEl = document.getElementById(`err-${fieldName}`);
    if (errEl) errEl.textContent = message;
    const form = document.getElementById('case-form') || document.getElementById('evidence-form');
    if (form && form.elements[fieldName]) form.elements[fieldName].classList.add('error');
  }

  // ── Forms: New / Edit Evidence ────────────────────────────────────────────

  const EVIDENCE_TYPES = [
    { value: 'biological',   label: 'Biological' },
    { value: 'digital',      label: 'Digital' },
    { value: 'fingerprint',  label: 'Fingerprint / Impression' },
    { value: 'trace',        label: 'Trace' },
    { value: 'physical',     label: 'Physical' },
    { value: 'document',     label: 'Document' },
    { value: 'other',        label: 'Other' },
  ];

  const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'degraded'];
  const CONTAMINATION_LEVELS = ['none', 'low', 'moderate', 'high'];
  const URGENCY_LEVELS = [
    { value: 'routine', label: 'Routine' },
    { value: 'normal',  label: 'Normal' },
    { value: 'urgent',  label: 'Urgent' },
  ];

  function showEvidenceForm(existingEvidence) {
    if (!activeCaseId) { toast('Select a case first.', 'warning'); return; }
    const isEdit = !!existingEvidence;
    const ev = existingEvidence || {};
    const id = isEdit ? ev.id : Storage.generateEvidenceId(activeCaseId);

    openModal(`
      <div class="modal-title">${isEdit ? 'Edit Evidence' : 'Add Evidence'}</div>
      <form id="evidence-form" novalidate>
        <div class="form-grid">
          <div class="form-group">
            <label>Evidence ID</label>
            <input type="text" name="id" value="${escapeHtml(id)}" ${isEdit ? 'readonly style="opacity:0.6;cursor:not-allowed"' : ''} maxlength="30" />
            <span class="field-error" id="err-ev-id"></span>
          </div>
          <div class="form-group">
            <label>Type <span class="required">*</span></label>
            <select name="type" required>
              <option value="">Select type…</option>
              ${EVIDENCE_TYPES.map(t => `<option value="${t.value}" ${ev.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
            <span class="field-error" id="err-ev-type"></span>
          </div>
          <div class="form-group full-width">
            <label>Name / Description <span class="required">*</span></label>
            <input type="text" name="name" value="${escapeHtml(ev.name || '')}" placeholder="e.g., Blood-stained shirt — victim" maxlength="150" required />
            <span class="field-error" id="err-ev-name"></span>
          </div>
          <div class="form-group full-width">
            <label>Detailed Description</label>
            <textarea name="description" rows="2" maxlength="500" placeholder="Optional additional details…">${escapeHtml(ev.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Collection Location</label>
            <input type="text" name="collectionLocation" value="${escapeHtml(ev.collectionLocation || '')}" placeholder="e.g., Living room floor" maxlength="150" />
          </div>
          <div class="form-group">
            <label>Collection Date</label>
            <input type="date" name="collectionDate" value="${escapeHtml(ev.collectionDate || '')}" max="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label>Condition</label>
            <select name="condition">
              <option value="">Unknown</option>
              ${CONDITIONS.map(c => `<option value="${c}" ${ev.condition === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Contamination Risk</label>
            <select name="contamination">
              <option value="none" ${(!ev.contamination || ev.contamination === 'none') ? 'selected' : ''}>None</option>
              ${CONTAMINATION_LEVELS.filter(c => c !== 'none').map(c => `<option value="${c}" ${ev.contamination === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Urgency</label>
            <select name="urgency">
              ${URGENCY_LEVELS.map(u => `<option value="${u.value}" ${(ev.urgency === u.value || (!ev.urgency && u.value === 'normal')) ? 'selected' : ''}>${u.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Requested Examination</label>
            <input type="text" name="requestedExam" value="${escapeHtml(ev.requestedExam || '')}" placeholder="e.g., DNA analysis" maxlength="200" />
          </div>
          <div class="form-group full-width">
            <label>Contamination / Handling Notes</label>
            <textarea name="contaminationNotes" rows="2" maxlength="300" placeholder="Any known contamination events or handling concerns…">${escapeHtml(ev.contaminationNotes || '')}</textarea>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Evidence'}</button>
        </div>
      </form>
    `);

    document.getElementById('evidence-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      let valid = true;

      // Clear errors
      ['ev-id', 'ev-type', 'ev-name'].forEach(f => {
        const el = document.getElementById(`err-${f}`);
        if (el) el.textContent = '';
      });

      const evidenceId = (form.elements.id.value || '').trim();
      const type = form.elements.type.value;
      const name = (form.elements.name.value || '').trim();

      if (!evidenceId) {
        const errEl = document.getElementById('err-ev-id');
        if (errEl) errEl.textContent = 'Evidence ID is required.';
        valid = false;
      }
      if (!isEdit && Storage.evidenceIdExists(evidenceId, activeCaseId)) {
        const errEl = document.getElementById('err-ev-id');
        if (errEl) errEl.textContent = `ID "${evidenceId}" already exists in this case.`;
        valid = false;
      }
      if (!type) {
        const errEl = document.getElementById('err-ev-type');
        if (errEl) errEl.textContent = 'Evidence type is required.';
        valid = false;
      }
      if (!name) {
        const errEl = document.getElementById('err-ev-name');
        if (errEl) errEl.textContent = 'Evidence name is required.';
        valid = false;
      }

      if (!valid) return;

      const evObj = {
        id:                 evidenceId,
        caseId:             activeCaseId,
        type,
        name,
        description:        form.elements.description.value.trim(),
        collectionLocation: form.elements.collectionLocation.value.trim(),
        collectionDate:     form.elements.collectionDate.value,
        condition:          form.elements.condition.value,
        contamination:      form.elements.contamination.value,
        urgency:            form.elements.urgency.value,
        requestedExam:      form.elements.requestedExam.value.trim(),
        contaminationNotes: form.elements.contaminationNotes.value.trim(),
        override:           ev.override || undefined,
      };

      Storage.saveEvidence(evObj);
      lastPrioritized = []; // invalidate cache
      closeModal();
      toast(isEdit ? 'Evidence updated.' : `Evidence ${evidenceId} added.`, 'success');
      renderEvidenceList();
    });
  }

  // ── Evidence view detail ──────────────────────────────────────────────────

  function showEvidenceDetail(evId) {
    const ev = Storage.getEvidenceById(evId, activeCaseId);
    if (!ev) { toast('Evidence not found.', 'error'); return; }
    const score = Prioritization.computeScore(ev).total;
    const computed = Prioritization.classifyPriority(score);
    const effective = ev.override ? ev.override.priority : computed;
    const recs = Prioritization.getRecommendations(ev);

    openModal(`
      <div class="modal-title">Evidence Detail — ${escapeHtml(ev.id)}</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">ID</span><span class="info-value monospace">${escapeHtml(ev.id)}</span></div>
        <div class="info-row"><span class="info-label">Type</span><span class="info-value"><span class="evidence-type-chip">${escapeHtml(ev.type)}</span></span></div>
        <div class="info-row"><span class="info-label">Name</span><span class="info-value">${escapeHtml(ev.name)}</span></div>
        <div class="info-row"><span class="info-label">Effective Priority</span><span class="info-value"><span class="priority-badge ${effective}">${effective.toUpperCase()}</span>${ev.override ? ' <small style="color:var(--text-muted)">(overridden from '+computed.toUpperCase()+')</small>' : ''}</span></div>
        <div class="info-row"><span class="info-label">Score</span><span class="info-value">${score}/100</span></div>
        <div class="info-row"><span class="info-label">Condition</span><span class="info-value">${escapeHtml(ev.condition || '—')}</span></div>
        <div class="info-row"><span class="info-label">Contamination</span><span class="info-value">${escapeHtml(ev.contamination || '—')}</span></div>
        <div class="info-row"><span class="info-label">Urgency</span><span class="info-value">${escapeHtml(ev.urgency || '—')}</span></div>
        <div class="info-row"><span class="info-label">Collection Location</span><span class="info-value">${escapeHtml(ev.collectionLocation || '—')}</span></div>
        <div class="info-row"><span class="info-label">Collection Date</span><span class="info-value">${formatDate(ev.collectionDate)}</span></div>
        <div class="info-row full-width"><span class="info-label">Description</span><span class="info-value">${escapeHtml(ev.description || '—')}</span></div>
        <div class="info-row full-width"><span class="info-label">Requested Examination</span><span class="info-value">${escapeHtml(ev.requestedExam || '—')}</span></div>
        <div class="info-row full-width"><span class="info-label">Contamination Notes</span><span class="info-value">${escapeHtml(ev.contaminationNotes || '—')}</span></div>
      </div>
      <hr class="divider">
      <div style="margin-top:0.75rem">
        <h4 style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.4rem">Recommended Examinations</h4>
        <ul style="margin-left:1.2rem;font-size:0.83rem;color:var(--text-muted)">
          ${recs.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
        <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.4rem;font-style:italic">Recommendations are suggested types only, not confirmed forensic protocols.</p>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" data-action="close-modal">Close</button>
        <button class="btn btn-primary" data-action="edit-evidence" data-evid="${escapeHtml(ev.id)}">Edit</button>
      </div>
    `);
  }

  // ── Delete confirmation ───────────────────────────────────────────────────

  function confirmDelete(title, message, onConfirm) {
    openModal(`
      <div class="confirm-dialog">
        <div class="empty-icon" style="font-size:2rem">⚠</div>
        <h3 style="margin-bottom:0.5rem">${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="close-modal">Cancel</button>
          <button class="btn btn-danger" id="confirm-delete-btn">Delete</button>
        </div>
      </div>
    `);
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
      closeModal();
      onConfirm();
    });
  }

  // ── Demo case ─────────────────────────────────────────────────────────────

  function loadDemoCase() {
    const existingDemoId = Storage.getDemoCaseId();
    if (existingDemoId && Storage.getCaseById(existingDemoId)) {
      toast('Demo case already loaded. Selecting it now.', 'info');
      selectCase(existingDemoId);
      return;
    }

    const demoId = `CASE-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    const demoCase = {
      id: demoId,
      title: 'Riverside Apartment Homicide — DEMO',
      crimeType: 'Homicide',
      incidentDate: '2025-06-15',
      location: '12B Riverside Court, Apartment 4, Block East',
      investigator: 'Det. Sgt. J. Sharma',
      description: 'FICTIONAL DEMO DATA. Victim found in residential apartment. Multiple evidence items collected at scene.',
      status: 'active',
      isDemo: true,
    };
    Storage.saveCase(demoCase);
    Storage.setDemoCaseId(demoId);

    const demoEvidence = [
      {
        id: 'EV-001', caseId: demoId, type: 'biological', name: 'Blood-stained clothing (shirt)',
        description: 'White shirt recovered near doorway, significant bloodstaining on chest and left sleeve.',
        collectionLocation: 'Hallway entrance', collectionDate: '2025-06-15',
        condition: 'fair', contamination: 'moderate', urgency: 'urgent',
        requestedExam: 'DNA profiling, serology',
        contaminationNotes: 'Item was disturbed by first responders before scene was secured.',
      },
      {
        id: 'EV-002', caseId: demoId, type: 'digital', name: 'Victim mobile phone (Samsung)',
        description: 'Locked Android smartphone found under couch cushion. Screen cracked.',
        collectionLocation: 'Living room sofa', collectionDate: '2025-06-15',
        condition: 'poor', contamination: 'low', urgency: 'urgent',
        requestedExam: 'Forensic imaging, call/message recovery',
        contaminationNotes: 'Handled briefly by neighbour who found victim.',
      },
      {
        id: 'EV-003', caseId: demoId, type: 'fingerprint', name: 'Latent fingerprint on wine glass',
        description: 'Clear partial latent print on exterior of wine glass recovered from kitchen counter.',
        collectionLocation: 'Kitchen counter, near sink', collectionDate: '2025-06-15',
        condition: 'good', contamination: 'none', urgency: 'normal',
        requestedExam: 'AFIS comparison',
        contaminationNotes: '',
      },
      {
        id: 'EV-004', caseId: demoId, type: 'digital', name: 'CCTV footage — building entrance',
        description: 'USB drive containing 6-hour footage from building entrance camera (18:00–24:00).',
        collectionLocation: 'Building manager office', collectionDate: '2025-06-16',
        condition: 'excellent', contamination: 'none', urgency: 'normal',
        requestedExam: 'Video analysis, timestamp verification',
        contaminationNotes: '',
      },
      {
        id: 'EV-005', caseId: demoId, type: 'physical', name: 'Kitchen knife with possible bloodstaining',
        description: 'Chef knife, 20 cm blade, found in kitchen sink. Residue on blade consistent with blood — requires confirmation.',
        collectionLocation: 'Kitchen sink', collectionDate: '2025-06-15',
        condition: 'good', contamination: 'high', urgency: 'urgent',
        requestedExam: 'DNA from blade residue, fingerprint development on handle',
        contaminationNotes: 'Knife was submerged in water; evidence integrity compromised.',
      },
      {
        id: 'EV-006', caseId: demoId, type: 'trace', name: 'Hair sample — unidentified',
        description: 'Single hair with root attached found on victim\'s clothing.',
        collectionLocation: 'Victim shirt (EV-001)', collectionDate: '2025-06-15',
        condition: 'good', contamination: 'none', urgency: 'normal',
        requestedExam: 'mtDNA analysis, microscopic comparison',
        contaminationNotes: '',
      },
    ];

    demoEvidence.forEach(ev => Storage.saveEvidence(ev));
    Storage.setDemoCaseId(demoId);

    toast('Demo case loaded with 6 evidence items. Note: all data is fictional.', 'success');
    selectCase(demoId);
    renderDashboard();

    // Show reset button
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
        if (activeCaseId === demoId) {
          setActiveCase(null);
          showView('dashboard');
        }
        renderDashboard();
        toast('Demo case reset.', 'info');
      }
    );
  }

  // ── Priority overrides ────────────────────────────────────────────────────

  function applyOverride(evId) {
    const prioritySelect = document.getElementById(`ov-priority-${evId}`);
    const reasonInput    = document.getElementById(`ov-reason-${evId}`);
    if (!prioritySelect || !reasonInput) return;

    const priority = prioritySelect.value;
    const reason   = reasonInput.value.trim();

    if (!priority) { toast('Please select a priority level.', 'warning'); return; }
    if (!reason)   { toast('A reason is required for override.', 'warning'); reasonInput.focus(); return; }

    const caseObj = Storage.getCaseById(activeCaseId);
    Storage.setOverride(evId, activeCaseId, {
      priority,
      reason,
      by: caseObj ? caseObj.investigator : 'Unknown',
      at: new Date().toISOString(),
    });
    lastPrioritized = [];
    toast(`Override applied: ${evId} set to ${priority.toUpperCase()}.`, 'success');
    renderPriorities();
  }

  function clearOverride(evId) {
    Storage.clearOverride(evId, activeCaseId);
    lastPrioritized = [];
    toast(`Override cleared for ${evId}.`, 'info');
    renderPriorities();
  }

  // ── Global event delegation ───────────────────────────────────────────────

  function handleGlobalAction(target) {
    const action = target.dataset.action;
    const caseId = target.dataset.caseid;
    const evId   = target.dataset.evid;

    if (!action) return false;

    switch (action) {
      case 'new-case':       showCaseForm(null);    return true;
      case 'close-modal':    closeModal();          return true;
      case 'load-demo':      loadDemoCase();        return true;
      case 'reset-demo':     resetDemoCase();       return true;
      case 'add-evidence':
        if (!activeCaseId) { toast('Select or create a case first.', 'warning'); showView('cases'); return true; }
        showEvidenceForm(null); return true;
      case 'run-prioritization':
        if (!activeCaseId) { toast('Select a case first.', 'warning'); return true; }
        showView('priorities'); return true;
      case 'generate-report':
        if (!activeCaseId) { toast('Select a case first.', 'warning'); return true; }
        showView('report'); return true;
      case 'select-case':
        if (caseId) selectCase(caseId); return true;
      case 'edit-case': {
        const c = Storage.getCaseById(caseId);
        if (c) showCaseForm(c); return true;
      }
      case 'delete-case':
        if (!caseId) return true;
        confirmDelete(
          'Delete Case',
          `Delete case "${Storage.getCaseById(caseId)?.title || caseId}" and all its evidence? This cannot be undone.`,
          () => {
            if (activeCaseId === caseId) setActiveCase(null);
            Storage.deleteCase(caseId);
            renderCasesList();
            renderDashboard();
            toast('Case deleted.', 'info');
          }
        );
        return true;
      case 'view-evidence':  if (evId) showEvidenceDetail(evId); return true;
      case 'edit-evidence': {
        closeModal(); // close if detail modal was open
        const ev = evId ? Storage.getEvidenceById(evId, activeCaseId) : null;
        if (ev) showEvidenceForm(ev);
        return true;
      }
      case 'delete-evidence':
        if (!evId) return true;
        confirmDelete(
          'Delete Evidence',
          `Delete evidence item "${Storage.getEvidenceById(evId, activeCaseId)?.name || evId}"? This cannot be undone.`,
          () => {
            Storage.deleteEvidence(evId, activeCaseId);
            lastPrioritized = [];
            renderEvidenceList();
            toast('Evidence deleted.', 'info');
          }
        );
        return true;
      case 'apply-override': if (evId) applyOverride(evId); return true;
      case 'clear-override': if (evId) clearOverride(evId); return true;
    }
    return false;
  }

  // ── Priority card expand/collapse ─────────────────────────────────────────

  function handlePriorityCardClick(target) {
    const header = target.closest('.priority-card-header');
    if (!header) return;
    const cardId = header.dataset.card;
    if (!cardId) return;
    const card = document.getElementById(`pcard-${cardId}`);
    if (card) card.classList.toggle('expanded');
  }

  // ── Initialise ────────────────────────────────────────────────────────────

  function init() {
    // Navigation
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!btn.disabled) showView(btn.dataset.view);
      });
    });

    // Global event delegation — clicks
    document.addEventListener('click', e => {
      // Action buttons
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) { handleGlobalAction(actionEl); return; }

      // Priority card collapse
      handlePriorityCardClick(e.target);

      // Case select from table
      const caseSelectBtn = e.target.closest('.case-select-btn');
      if (caseSelectBtn) {
        selectCase(caseSelectBtn.dataset.caseid);
        return;
      }
    });

    // Modal close button
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);

    // Close modal on overlay click
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });

    // Escape key closes modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('modal-overlay').hidden) closeModal();
    });

    // Evidence search & filter — live filtering
    ['evidence-search', 'evidence-filter-type', 'evidence-filter-priority'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => { if (currentView === 'evidence') renderEvidenceList(); });
    });

    // Initial render
    updateNavState();
    renderDashboard();
  }

  // ── Run ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  // Expose minimal public API for debugging
  return { showView, toast, loadDemoCase };
})();
