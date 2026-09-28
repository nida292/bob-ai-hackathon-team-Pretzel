/* ============================================================
   ForensiTriage — Cases Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  injectShell([{ label: 'Cases' }]);
  populateCrimeFilter();
  renderCases();
  bindFilters();
  bindNewCaseBtn();
});

function populateCrimeFilter() {
  const sel = document.getElementById('cases-crime-filter');
  CRIME_TYPES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
}

function bindFilters() {
  const search  = document.getElementById('cases-search');
  const status  = document.getElementById('cases-status-filter');
  const crime   = document.getElementById('cases-crime-filter');
  search.addEventListener('input', debounce(renderCases, 250));
  status.addEventListener('change', renderCases);
  crime.addEventListener('change', renderCases);
}

function renderCases() {
  const query  = (document.getElementById('cases-search').value || '').toLowerCase();
  const status = document.getElementById('cases-status-filter').value;
  const crime  = document.getElementById('cases-crime-filter').value;
  const allEv  = EvidenceDB.all();

  let cases = CasesDB.all();
  if (query)  cases = cases.filter(c =>
    c.title.toLowerCase().includes(query) ||
    c.caseNumber.toLowerCase().includes(query) ||
    (c.location || '').toLowerCase().includes(query) ||
    (c.leadInvestigator || '').toLowerCase().includes(query)
  );
  if (status) cases = cases.filter(c => c.status === status);
  if (crime)  cases = cases.filter(c => c.crimeType === crime);

  // Sort newest first
  cases = cases.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const tbody   = document.getElementById('cases-table-body');
  const empty   = document.getElementById('cases-empty');
  const tableW  = document.querySelector('.table-wrapper');
  const countEl = document.getElementById('cases-count');

  countEl.textContent = `${cases.length} case${cases.length !== 1 ? 's' : ''}`;

  if (cases.length === 0) {
    tbody.innerHTML = '';
    tableW.style.display = 'none';
    empty.classList.remove('hidden');
    document.getElementById('cases-empty-text').textContent =
      query || status || crime
        ? 'No cases match your current filters. Try clearing them.'
        : 'No cases have been created yet. Create your first case to get started.';
    return;
  }

  tableW.style.display = '';
  empty.classList.add('hidden');

  const isInv = Auth.isInvestigator();

  tbody.innerHTML = cases.map(c => {
    const evList   = allEv.filter(e => e.caseId === c.id);
    const critCount = evList.filter(e => e.priority === 'Critical').length;
    const crimeLabel = c.crimeType === 'Other' && c.crimeTypeCustom ? c.crimeTypeCustom : c.crimeType;

    return `
      <tr>
        <td>
          <a href="case-details.html?id=${escHtml(c.id)}" class="case-id-cell" style="text-decoration:none;color:inherit">
            ${escHtml(c.caseNumber)}
          </a>
        </td>
        <td>
          <div class="case-name-cell">
            <a href="case-details.html?id=${escHtml(c.id)}" style="text-decoration:none;color:inherit">${escHtml(c.title)}</a>
          </div>
          ${c.location ? `<div class="case-crime-cell">${escHtml(c.location)}</div>` : ''}
        </td>
        <td><span class="text-sm">${escHtml(crimeLabel)}</span></td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <span class="evidence-count">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            ${evList.length}
          </span>
          ${critCount > 0 ? `<span class="badge badge-critical" style="margin-left:4px">${critCount} critical</span>` : ''}
        </td>
        <td><span class="text-sm">${escHtml(c.leadInvestigator || '—')}</span></td>
        <td><span class="text-sm text-muted">${DateUtils.format(c.dateOfIncident) || '—'}</span></td>
        <td>
          <div class="table-actions">
            <a href="case-details.html?id=${escHtml(c.id)}" class="btn btn-icon" title="View case">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </a>
            ${isInv ? `
              <button class="btn btn-icon" title="Edit case" data-action="edit-case" data-id="${escHtml(c.id)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-icon" title="Delete case" data-action="delete-case" data-id="${escHtml(c.id)}" style="color:var(--danger)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');

  // Event delegation for row actions
  tbody.addEventListener('click', handleTableAction, { once: true });
}

function handleTableAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) { renderCases(); return; }

  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'delete-case') {
    if (!Auth.requireInvestigator()) return;
    const c = CasesDB.find(id);
    if (!c) return;
    Modal.confirm({
      title: 'Delete Case',
      body: `
        <div class="alert alert-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>This will permanently delete case <strong>${escHtml(c.title)}</strong> and all its evidence items. This action cannot be undone.</span>
        </div>`,
      confirmText: 'Delete Case',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        CasesDB.delete(id);
        Toast.success(`Case "${c.title}" deleted.`, 'Case Deleted');
        renderCases();
      },
    });
  } else if (action === 'edit-case') {
    if (!Auth.requireInvestigator()) return;
    showEditCaseModal(id);
  } else {
    renderCases();
  }
}

/* ── New Case Modal ─────────────────────────────────────────── */
function bindNewCaseBtn() {
  const btn = document.getElementById('new-case-btn');
  const emptyBtn = document.getElementById('cases-empty-new-btn');
  if (btn) btn.addEventListener('click', showNewCaseModal);
  if (emptyBtn) emptyBtn.addEventListener('click', showNewCaseModal);
}

function showNewCaseModal(caseData = null) {
  const isEdit = !!caseData;
  const crimeOptions = CRIME_TYPES.map(t =>
    `<option value="${escHtml(t)}"${caseData && caseData.crimeType === t ? ' selected' : ''}>${escHtml(t)}</option>`
  ).join('');

  Modal.show({
    title: isEdit ? 'Edit Case' : 'Create New Case',
    size: 'lg',
    confirmText: isEdit ? 'Save Changes' : 'Create Case',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Case Title</label>
        <input type="text" id="nc-title" class="input" placeholder="e.g. Northgate Residential Burglary"
          value="${escHtml(caseData?.title || '')}" maxlength="120" />
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label form-label-req">Crime Type</label>
          <select id="nc-crime" class="select">${crimeOptions}</select>
        </div>
        <div class="form-group" id="nc-custom-group" style="${caseData?.crimeType==='Other'?'':'display:none'}">
          <label class="form-label form-label-req">Specify Crime Type</label>
          <input type="text" id="nc-crime-custom" class="input" placeholder="Describe crime type"
            value="${escHtml(caseData?.crimeTypeCustom || '')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="nc-desc" class="textarea" rows="3">${escHtml(caseData?.description || '')}</textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Incident Location</label>
          <input type="text" id="nc-location" class="input" value="${escHtml(caseData?.location || '')}" placeholder="Address or area" />
        </div>
        <div class="form-group">
          <label class="form-label">Date of Incident</label>
          <input type="date" id="nc-date" class="input" value="${escHtml(caseData?.dateOfIncident || '')}" />
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Lead Investigator</label>
          <input type="text" id="nc-investigator" class="input" value="${escHtml(caseData?.leadInvestigator || '')}" placeholder="Investigator name" />
        </div>
        <div class="form-group">
          <label class="form-label">Case Status</label>
          <select id="nc-status" class="select">
            ${CASE_STATUSES.map(s => `<option value="${s}"${(caseData?.status||'Active')===s?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="nc-error" class="alert alert-danger hidden" style="margin-top:8px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span id="nc-error-msg"></span>
      </div>
    `,
    onConfirm: () => submitCaseForm(isEdit ? caseData.id : null),
  });

  setTimeout(() => {
    document.getElementById('nc-crime').addEventListener('change', function () {
      document.getElementById('nc-custom-group').style.display = this.value === 'Other' ? '' : 'none';
    });
  }, 50);
}

function showEditCaseModal(id) {
  const c = CasesDB.find(id);
  if (!c) { Toast.error('Case not found.'); return; }
  showNewCaseModal(c);
}

function submitCaseForm(editId = null) {
  const title  = document.getElementById('nc-title')?.value.trim();
  const crime  = document.getElementById('nc-crime')?.value;
  const custom = document.getElementById('nc-crime-custom')?.value.trim();
  const desc   = document.getElementById('nc-desc')?.value.trim();
  const loc    = document.getElementById('nc-location')?.value.trim();
  const date   = document.getElementById('nc-date')?.value;
  const inv    = document.getElementById('nc-investigator')?.value.trim();
  const status = document.getElementById('nc-status')?.value;

  if (!title) {
    const errEl = document.getElementById('nc-error');
    if (errEl) { errEl.classList.remove('hidden'); document.getElementById('nc-error-msg').textContent = 'Case title is required.'; }
    return;
  }
  if (crime === 'Other' && !custom) {
    const errEl = document.getElementById('nc-error');
    if (errEl) { errEl.classList.remove('hidden'); document.getElementById('nc-error-msg').textContent = 'Please specify the crime type.'; }
    return;
  }

  const user = Auth.currentUser();

  if (editId) {
    CasesDB.update(editId, { title, crimeType: crime, crimeTypeCustom: custom, description: desc, location: loc, dateOfIncident: date, leadInvestigator: inv, status });
    Toast.success('Case updated.', 'Case Updated');
  } else {
    const newCase = CasesDB.create({ title, crimeType: crime, crimeTypeCustom: custom, description: desc, location: loc, dateOfIncident: date, leadInvestigator: inv, status, createdBy: user.id });
    Toast.success(`Case "${newCase.title}" created.`, 'Case Created');
  }
  renderCases();
}

/* ── Status Badge ───────────────────────────────────────────── */
function statusBadge(status) {
  const map = { 'Active': 'badge-active', 'Closed': 'badge-closed', 'Pending': 'badge-pending', 'Under Review': 'badge-review' };
  return `<span class="badge ${map[status]||'badge-unassigned'} badge-dot">${escHtml(status)}</span>`;
}
