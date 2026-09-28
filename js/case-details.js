/* ============================================================
   ForensiTriage — Case Details Page Logic
   ============================================================ */

let currentCaseId = null;

document.addEventListener('DOMContentLoaded', () => {
  currentCaseId = URLParams.get('id');
  if (!currentCaseId) {
    window.location.href = 'cases.html';
    return;
  }
  loadCase();
});

function loadCase() {
  const c = CasesDB.find(currentCaseId);
  if (!c) {
    injectShell([{ label: 'Cases', href: 'cases.html' }, { label: 'Not Found' }]);
    renderNotFound();
    return;
  }

  injectShell([
    { label: 'Cases', href: 'cases.html' },
    { label: c.caseNumber + ' · ' + c.title },
  ]);

  renderPage(c);
}

function renderPage(c) {
  const pageBody = document.getElementById('case-page-body');
  const evidence = EvidenceDB.forCase(c.id);
  const sorted   = PriorityUtils.sort(evidence);
  const isInv    = Auth.isInvestigator();
  const crimeLabel = c.crimeType === 'Other' && c.crimeTypeCustom ? c.crimeTypeCustom : c.crimeType;

  pageBody.innerHTML = `
    <!-- Case Header Card -->
    <div class="case-detail-header">
      <div class="case-detail-meta">
        <span class="case-detail-id">${escHtml(c.caseNumber)}</span>
        ${statusBadge(c.status)}
        <span class="badge badge-unassigned">${escHtml(crimeLabel)}</span>
      </div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <h1 class="case-detail-title">${escHtml(c.title)}</h1>
          ${c.description ? `<p class="case-detail-description">${escHtml(c.description)}</p>` : ''}
        </div>
        <div style="display:flex;gap:10px;flex-shrink:0">
          ${isInv ? `
            <button class="btn btn-secondary btn-sm" id="edit-case-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Case
            </button>
            <button class="btn btn-danger btn-sm" id="delete-case-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Delete
            </button>
          ` : ''}
          <a href="cases.html" class="btn btn-ghost btn-sm">← Back to Cases</a>
        </div>
      </div>
      <div class="case-detail-info-grid">
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Lead Investigator</div>
          <div class="case-detail-info-value">${escHtml(c.leadInvestigator || '—')}</div>
        </div>
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Location</div>
          <div class="case-detail-info-value">${escHtml(c.location || '—')}</div>
        </div>
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Date of Incident</div>
          <div class="case-detail-info-value">${DateUtils.format(c.dateOfIncident) || '—'}</div>
        </div>
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Created</div>
          <div class="case-detail-info-value">${DateUtils.format(c.createdAt)}</div>
        </div>
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Last Updated</div>
          <div class="case-detail-info-value">${DateUtils.formatRelative(c.updatedAt)}</div>
        </div>
        <div class="case-detail-info-item">
          <div class="case-detail-info-label">Total Evidence</div>
          <div class="case-detail-info-value">${evidence.length} item${evidence.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer-banner mb-6">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>Priority classifications are investigator-assigned recommendations only. They do not constitute forensic or legal findings.</span>
    </div>

    <!-- Evidence Section -->
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">Evidence Inventory</div>
          <div class="card-subtitle">${evidence.length} item${evidence.length !== 1 ? 's' : ''} — sorted by priority</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <div class="search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="ev-search" class="search-input" placeholder="Search evidence…" autocomplete="off" style="width:200px" />
          </div>
          <select id="ev-priority-filter" class="filter-select">
            <option value="">All Priorities</option>
            ${PRIORITY_LEVELS.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
          <select id="ev-category-filter" class="filter-select">
            <option value="">All Categories</option>
            ${EVIDENCE_CATEGORIES.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
          </select>
          ${isInv ? `
            <button class="btn btn-primary btn-sm" id="add-evidence-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Evidence
            </button>
          ` : ''}
        </div>
      </div>
      <div id="evidence-list-container">
        ${renderEvidenceList(sorted, c)}
      </div>
    </div>
  `;

  bindCasePageEvents(c, evidence);
}

function renderEvidenceList(evidence, c) {
  const query    = (document.getElementById('ev-search')?.value || '').toLowerCase();
  const priority = document.getElementById('ev-priority-filter')?.value || '';
  const category = document.getElementById('ev-category-filter')?.value || '';

  let filtered = evidence;
  if (query)    filtered = filtered.filter(e => e.name.toLowerCase().includes(query) || (e.description||'').toLowerCase().includes(query));
  if (priority) filtered = filtered.filter(e => (e.priority || 'Unassigned') === priority);
  if (category) filtered = filtered.filter(e => e.category === category);

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
        <div class="empty-state-title">No evidence found</div>
        <div class="empty-state-text">${query || priority || category ? 'No evidence matches your filters.' : 'No evidence has been added to this case yet.'}</div>
      </div>`;
  }

  return `<div class="evidence-grid" style="padding:var(--space-5)">
    ${filtered.map(ev => {
      const p   = ev.priority || 'Unassigned';
      const cls = p.toLowerCase();
      const catLabel = ev.category === 'Other' && ev.categoryCustom ? ev.categoryCustom : ev.category;
      return `
        <a href="evidence-details.html?id=${escHtml(ev.id)}" class="evidence-card">
          <div class="evidence-card-priority-strip ${cls}"></div>
          <div class="evidence-card-header">
            <div>
              <div class="evidence-card-id">${escHtml(ev.evidenceNumber)}</div>
              <div class="evidence-card-name">${escHtml(ev.name)}</div>
            </div>
            ${PriorityUtils.badge(p)}
          </div>
          <div class="evidence-card-body">
            <div class="evidence-card-category">${escHtml(catLabel)}</div>
            ${ev.description ? `<div class="text-xs text-secondary" style="line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escHtml(ev.description)}</div>` : ''}
          </div>
          <div class="evidence-card-footer">
            <span class="evidence-card-date">${DateUtils.format(ev.collectedAt) || DateUtils.format(ev.createdAt)}</span>
            ${ev.attachments && ev.attachments.length > 0 ? `<span class="text-xs text-muted">${ev.attachments.length} attachment${ev.attachments.length !== 1 ? 's' : ''}</span>` : ''}
          </div>
        </a>`;
    }).join('')}
  </div>`;
}

function bindCasePageEvents(c, evidence) {
  const isInv = Auth.isInvestigator();

  // Edit case
  const editBtn = document.getElementById('edit-case-btn');
  if (editBtn) editBtn.addEventListener('click', () => showEditCaseModal(c));

  // Delete case
  const deleteBtn = document.getElementById('delete-case-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => {
    Modal.confirm({
      title: 'Delete Case',
      confirmText: 'Delete Case',
      confirmClass: 'btn-danger',
      body: `
        <div class="alert alert-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/></svg>
          <span>This will permanently delete <strong>${escHtml(c.title)}</strong> and all ${evidence.length} evidence items. This cannot be undone.</span>
        </div>`,
      onConfirm: () => {
        CasesDB.delete(c.id);
        Toast.success('Case deleted.');
        window.location.href = 'cases.html';
      },
    });
  });

  // Add Evidence
  const addEvBtn = document.getElementById('add-evidence-btn');
  if (addEvBtn) addEvBtn.addEventListener('click', () => showAddEvidenceModal(c.id));

  // Live filters
  const evSearch = document.getElementById('ev-search');
  const evPri    = document.getElementById('ev-priority-filter');
  const evCat    = document.getElementById('ev-category-filter');

  const refreshList = () => {
    const container = document.getElementById('evidence-list-container');
    if (container) container.innerHTML = renderEvidenceList(PriorityUtils.sort(EvidenceDB.forCase(c.id)), c);
  };

  if (evSearch) evSearch.addEventListener('input', debounce(refreshList, 200));
  if (evPri)    evPri.addEventListener('change', refreshList);
  if (evCat)    evCat.addEventListener('change', refreshList);
}

/* ── Edit Case Modal ────────────────────────────────────────── */
function showEditCaseModal(c) {
  const crimeOptions = CRIME_TYPES.map(t =>
    `<option value="${escHtml(t)}"${c.crimeType === t ? ' selected' : ''}>${escHtml(t)}</option>`
  ).join('');

  Modal.show({
    title: 'Edit Case',
    size: 'lg',
    confirmText: 'Save Changes',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Case Title</label>
        <input type="text" id="ec-title" class="input" value="${escHtml(c.title)}" maxlength="120" />
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label form-label-req">Crime Type</label>
          <select id="ec-crime" class="select">${crimeOptions}</select>
        </div>
        <div class="form-group" id="ec-custom-group" style="${c.crimeType==='Other'?'':'display:none'}">
          <label class="form-label form-label-req">Specify Crime Type</label>
          <input type="text" id="ec-crime-custom" class="input" value="${escHtml(c.crimeTypeCustom||'')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="ec-desc" class="textarea" rows="3">${escHtml(c.description||'')}</textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Location</label>
          <input type="text" id="ec-location" class="input" value="${escHtml(c.location||'')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Incident</label>
          <input type="date" id="ec-date" class="input" value="${escHtml(c.dateOfIncident||'')}" />
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Lead Investigator</label>
          <input type="text" id="ec-inv" class="input" value="${escHtml(c.leadInvestigator||'')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="ec-status" class="select">
            ${CASE_STATUSES.map(s => `<option value="${s}"${c.status===s?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    onConfirm: () => submitEditCase(c.id),
  });

  setTimeout(() => {
    document.getElementById('ec-crime').addEventListener('change', function() {
      document.getElementById('ec-custom-group').style.display = this.value === 'Other' ? '' : 'none';
    });
  }, 50);
}

function submitEditCase(id) {
  const title  = document.getElementById('ec-title')?.value.trim();
  const crime  = document.getElementById('ec-crime')?.value;
  const custom = document.getElementById('ec-crime-custom')?.value.trim();

  if (!title) { Toast.error('Case title is required.'); return; }

  CasesDB.update(id, {
    title,
    crimeType:       crime,
    crimeTypeCustom: custom,
    description:     document.getElementById('ec-desc')?.value.trim(),
    location:        document.getElementById('ec-location')?.value.trim(),
    dateOfIncident:  document.getElementById('ec-date')?.value,
    leadInvestigator:document.getElementById('ec-inv')?.value.trim(),
    status:          document.getElementById('ec-status')?.value,
  });
  Toast.success('Case updated successfully.', 'Case Updated');
  loadCase();
}

/* ── Add Evidence Modal ─────────────────────────────────────── */
function showAddEvidenceModal(caseId) {
  const catOptions = EVIDENCE_CATEGORIES.map(cat =>
    `<option value="${escHtml(cat)}">${escHtml(cat)}</option>`
  ).join('');

  Modal.show({
    title: 'Add Evidence Item',
    size: 'lg',
    confirmText: 'Add Evidence',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Evidence Name</label>
        <input type="text" id="ae-name" class="input" placeholder="e.g. Blood Sample — Primary Scene" maxlength="120" />
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label form-label-req">Category</label>
          <select id="ae-category" class="select">${catOptions}</select>
        </div>
        <div class="form-group" id="ae-custom-group" style="display:none">
          <label class="form-label form-label-req">Specify Category</label>
          <input type="text" id="ae-category-custom" class="input" placeholder="Describe category" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="ae-desc" class="textarea" rows="3" placeholder="Describe the evidence item…"></textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Collected By</label>
          <input type="text" id="ae-collected-by" class="input" placeholder="Officer/team name" />
        </div>
        <div class="form-group">
          <label class="form-label">Date Collected</label>
          <input type="date" id="ae-collected-at" class="input" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Collection Location</label>
        <input type="text" id="ae-location" class="input" placeholder="Where was it found?" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="ae-notes" class="textarea" rows="2" placeholder="Chain of custody notes, handling instructions…"></textarea>
      </div>
      <div id="ae-error" class="alert alert-danger hidden" style="margin-top:8px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span id="ae-error-msg"></span>
      </div>
    `,
    onConfirm: () => submitAddEvidence(caseId),
  });

  setTimeout(() => {
    document.getElementById('ae-category').addEventListener('change', function() {
      document.getElementById('ae-custom-group').style.display = this.value === 'Other' ? '' : 'none';
    });
  }, 50);
}

function submitAddEvidence(caseId) {
  const name     = document.getElementById('ae-name')?.value.trim();
  const category = document.getElementById('ae-category')?.value;
  const custom   = document.getElementById('ae-category-custom')?.value.trim();

  const showErr = (msg) => {
    const el = document.getElementById('ae-error');
    if (el) { el.classList.remove('hidden'); document.getElementById('ae-error-msg').textContent = msg; }
  };

  if (!name)    { showErr('Evidence name is required.'); return; }
  if (category === 'Other' && !custom) { showErr('Please specify the category.'); return; }

  const user = Auth.currentUser();
  const ev = EvidenceDB.create({
    caseId,
    name,
    category,
    categoryCustom: custom,
    description:  document.getElementById('ae-desc')?.value.trim(),
    collectedBy:  document.getElementById('ae-collected-by')?.value.trim(),
    collectedAt:  document.getElementById('ae-collected-at')?.value,
    location:     document.getElementById('ae-location')?.value.trim(),
    notes:        document.getElementById('ae-notes')?.value.trim(),
    createdBy:    user.id,
  });

  Toast.success(`Evidence "${ev.name}" added.`, 'Evidence Added');
  loadCase();
}

/* ── Status Badge Helper ────────────────────────────────────── */
function statusBadge(status) {
  const map = { 'Active': 'badge-active', 'Closed': 'badge-closed', 'Pending': 'badge-pending', 'Under Review': 'badge-review' };
  return `<span class="badge ${map[status]||'badge-unassigned'} badge-dot">${escHtml(status)}</span>`;
}
