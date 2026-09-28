/* ============================================================
   ForensiTriage — Evidence Details Page Logic
   ============================================================ */

let currentEvidenceId = null;

document.addEventListener('DOMContentLoaded', () => {
  currentEvidenceId = URLParams.get('id');
  if (!currentEvidenceId) {
    window.location.href = 'cases.html';
    return;
  }
  // Mark as viewed
  EvidenceDB.markViewed(currentEvidenceId);
  loadEvidence();
});

function loadEvidence() {
  const ev = EvidenceDB.find(currentEvidenceId);
  if (!ev) {
    injectShell([{ label: 'Cases', href: 'cases.html' }, { label: 'Not Found' }]);
    document.getElementById('evidence-page-body').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Evidence Not Found</div>
        <div class="empty-state-text">The requested evidence item could not be found.</div>
        <a href="cases.html" class="btn btn-primary">Back to Cases</a>
      </div>`;
    return;
  }

  const c = CasesDB.find(ev.caseId);

  injectShell([
    { label: 'Cases', href: 'cases.html' },
    { label: c ? (c.caseNumber + ' · ' + c.title) : 'Unknown Case', href: c ? ('case-details.html?id=' + c.id) : '#' },
    { label: ev.evidenceNumber + ' · ' + ev.name },
  ]);

  renderPage(ev, c);
}

function renderPage(ev, c) {
  const pageBody = document.getElementById('evidence-page-body');
  const isInv    = Auth.isInvestigator();
  const p        = ev.priority || 'Unassigned';
  const catLabel = ev.category === 'Other' && ev.categoryCustom ? ev.categoryCustom : ev.category;

  pageBody.innerHTML = `
    <!-- Back link + Header -->
    <div class="mb-6" style="display:flex;align-items:center;gap:12px">
      <a href="${c ? 'case-details.html?id=' + escHtml(c.id) : 'cases.html'}" class="btn btn-ghost btn-sm">← Back to Case</a>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer-banner mb-6">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span>Priority assignments are investigator recommendations only. They do not constitute forensic or legal determinations.</span>
    </div>

    <div class="evidence-detail-layout">

      <!-- Left column -->
      <div>

        <!-- Evidence Header -->
        <div class="card mb-6">
          <div class="card-body">
            <div class="evidence-detail-header">
              <div class="evidence-detail-icon">
                ${categoryIcon(ev.category)}
              </div>
              <div style="flex:1">
                <div class="evidence-detail-id">${escHtml(ev.evidenceNumber)}</div>
                <h1 class="evidence-detail-name">${escHtml(ev.name)}</h1>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  ${PriorityUtils.badge(p)}
                  <span class="badge badge-unassigned">${escHtml(catLabel)}</span>
                </div>
              </div>
              ${isInv ? `
                <div style="display:flex;gap:8px;flex-shrink:0">
                  <button class="btn btn-secondary btn-sm" id="edit-ev-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                  <button class="btn btn-danger btn-sm" id="delete-ev-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    Delete
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="card mb-6">
          <div class="card-header"><div class="card-title">Evidence Details</div></div>
          <div class="card-body">
            ${ev.description ? `
              <div class="form-group">
                <div class="form-label">Description</div>
                <p style="font-size:14px;color:var(--text);line-height:1.6">${escHtml(ev.description)}</p>
              </div>
              <hr class="divider" />
            ` : ''}
            <div class="grid grid-2" style="gap:var(--space-4)">
              <div class="info-row" style="flex-direction:column;gap:2px">
                <div class="info-label">Collected By</div>
                <div class="info-value">${escHtml(ev.collectedBy || '—')}</div>
              </div>
              <div class="info-row" style="flex-direction:column;gap:2px">
                <div class="info-label">Date Collected</div>
                <div class="info-value">${DateUtils.format(ev.collectedAt) || '—'}</div>
              </div>
              <div class="info-row" style="flex-direction:column;gap:2px">
                <div class="info-label">Collection Location</div>
                <div class="info-value">${escHtml(ev.location || '—')}</div>
              </div>
              <div class="info-row" style="flex-direction:column;gap:2px">
                <div class="info-label">Last Viewed</div>
                <div class="info-value">${DateUtils.formatRelative(ev.lastViewedAt) || '—'}</div>
              </div>
            </div>
            ${ev.notes ? `
              <hr class="divider" />
              <div>
                <div class="form-label" style="margin-bottom:6px">Chain of Custody Notes</div>
                <p style="font-size:13px;color:var(--text-secondary);line-height:1.6;background:var(--bg-secondary);padding:12px;border-radius:var(--radius);border:1px solid var(--border)">${escHtml(ev.notes)}</p>
              </div>
            ` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--border)">
              <span style="font-size:12px;color:var(--text-muted)">Added ${DateUtils.formatFull(ev.createdAt)} · Last updated ${DateUtils.formatRelative(ev.updatedAt)}</span>
            </div>
          </div>
        </div>

        <!-- Attachments -->
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Attachments</div>
              <div class="card-subtitle">${(ev.attachments||[]).length} file${(ev.attachments||[]).length !== 1 ? 's' : ''}</div>
            </div>
            ${isInv ? `
              <button class="btn btn-secondary btn-sm" id="upload-attachment-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Upload
              </button>
            ` : ''}
          </div>
          <div class="card-body">
            <div class="attachments-grid" id="attachments-grid">
              ${renderAttachments(ev, isInv)}
            </div>
          </div>
          <div class="card-footer" style="font-size:11px;color:var(--text-muted)">
            Accepted formats: JPG, JPEG, PNG, WebP, PDF — Max 5MB per file
          </div>
        </div>

      </div><!-- /left column -->

      <!-- Right column (Priority Panel) -->
      <div>
        <div class="priority-panel mb-6">
          <div class="priority-panel-header">
            <div class="priority-panel-title">Priority Classification</div>
          </div>
          <div class="priority-panel-body">
            <div class="priority-current-display" id="priority-current-display">
              <div class="priority-current-dot" id="priority-dot" style="background:${escHtml(PriorityUtils.color(p))}"></div>
              <div>
                <div class="priority-current-label" id="priority-current-label">${escHtml(p)}</div>
                <div class="priority-current-sub">Current priority level</div>
              </div>
            </div>
            ${isInv ? `
              <button class="btn btn-primary w-full" id="change-priority-btn" style="margin-bottom:var(--space-4)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Change Priority
              </button>
            ` : ''}
            <div class="disclaimer-banner" style="margin-bottom:var(--space-4)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Priority is set by the investigator. Not an automated determination.</span>
            </div>
            <div class="priority-panel-title" style="margin-bottom:var(--space-3);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary)">Priority History</div>
            <div id="priority-history-list">
              ${renderPriorityHistory(ev)}
            </div>
          </div>
        </div>

        <!-- Case Info -->
        ${c ? `
          <div class="card">
            <div class="card-header">
              <div class="card-title">Parent Case</div>
            </div>
            <div class="card-body">
              <div style="margin-bottom:var(--space-3)">
                <div class="text-xs text-muted">${escHtml(c.caseNumber)}</div>
                <div style="font-weight:600;font-size:14px">${escHtml(c.title)}</div>
              </div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:var(--space-4)">${escHtml(c.crimeType === 'Other' && c.crimeTypeCustom ? c.crimeTypeCustom : c.crimeType)}</div>
              <a href="case-details.html?id=${escHtml(c.id)}" class="btn btn-secondary btn-sm w-full">View Case →</a>
            </div>
          </div>
        ` : ''}
      </div>

    </div><!-- /evidence-detail-layout -->
  `;

  bindEvidencePageEvents(ev, c);
}

/* ── Render Helpers ─────────────────────────────────────────── */
function renderAttachments(ev, isInv) {
  const atts = ev.attachments || [];
  let html = '';

  atts.forEach(att => {
    const isImage = /\.(jpe?g|png|webp)$/i.test(att.name);
    html += `
      <div class="attachment-thumb" data-att-id="${escHtml(att.id)}">
        ${isImage && att.data
          ? `<img src="${att.data}" alt="${escHtml(att.name)}" />`
          : `<div class="attachment-thumb-icon">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               <div class="attachment-thumb-ext">${escHtml(att.name.split('.').pop())}</div>
             </div>`}
        <div class="attachment-thumb-overlay">
          <button class="attach-view-btn" title="View" data-att-action="view" data-att-id="${escHtml(att.id)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          ${isInv ? `
            <button class="attach-del-btn" title="Remove" data-att-action="delete" data-att-id="${escHtml(att.id)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H5L4 6"/></svg>
            </button>
          ` : ''}
        </div>
      </div>`;
  });

  if (isInv) {
    html += `
      <button class="attachment-upload-btn" id="attach-upload-trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Add File
      </button>`;
  }
  return html;
}

function renderPriorityHistory(ev) {
  const history = ev.priorityHistory || [];
  if (history.length === 0) {
    return `<div class="text-xs text-muted" style="padding:8px 0">No priority changes recorded.</div>`;
  }
  return history.map(h => `
    <div class="priority-history-item">
      <div class="priority-history-arrow">
        <span class="badge badge-${(h.from||'unassigned').toLowerCase()}" style="font-size:10px;padding:1px 5px">${escHtml(h.from||'Unassigned')}</span>
        <span>→</span>
        <span class="badge badge-${(h.to||'unassigned').toLowerCase()}" style="font-size:10px;padding:1px 5px">${escHtml(h.to||'Unassigned')}</span>
      </div>
      <div class="priority-history-content">
        <div class="priority-history-meta">
          ${escHtml(h.changedBy)} · ${DateUtils.formatFull(h.changedAt)}
          ${h.reason ? `<br><em>${escHtml(h.reason)}</em>` : ''}
        </div>
      </div>
    </div>`).join('');
}

function categoryIcon(category) {
  const icons = {
    'Biological':            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a9 9 0 0 0 9-9 9 9 0 0 0-9-9 9 9 0 0 0-9 9 9 9 0 0 0 9 9z"/><path d="M12 13a4 4 0 0 0 4-4M12 13a4 4 0 0 1-4-4"/></svg>`,
    'Digital':               `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    'Fingerprint/Impression':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2 4 4 0 0 0-4-4 6 6 0 0 0-6 6 8 8 0 0 0 8 8 8 8 0 0 0 8-8 10 10 0 0 0-10-10"/></svg>`,
    'Trace':                 `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    'Physical':              `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    'Document':              `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };
  const svgStr = icons[category] || icons['Physical'];
  return svgStr;
}

/* ── Bind Events ────────────────────────────────────────────── */
function bindEvidencePageEvents(ev, c) {
  const isInv = Auth.isInvestigator();

  // Change Priority
  const changePriBtn = document.getElementById('change-priority-btn');
  if (changePriBtn) changePriBtn.addEventListener('click', () => showChangePriorityModal(ev));

  // Edit Evidence
  const editBtn = document.getElementById('edit-ev-btn');
  if (editBtn) editBtn.addEventListener('click', () => showEditEvidenceModal(ev));

  // Delete Evidence
  const deleteBtn = document.getElementById('delete-ev-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', () => confirmDeleteEvidence(ev, c));

  // Upload attachment
  const uploadBtn  = document.getElementById('upload-attachment-btn');
  const attachTrig = document.getElementById('attach-upload-trigger');
  const fileInput  = document.getElementById('attachment-file-input');

  const triggerUpload = () => fileInput && fileInput.click();
  if (uploadBtn)  uploadBtn.addEventListener('click', triggerUpload);
  if (attachTrig) attachTrig.addEventListener('click', triggerUpload);

  if (fileInput) fileInput.addEventListener('change', () => handleFileUpload(ev.id));

  // Attachment overlay actions
  const grid = document.getElementById('attachments-grid');
  if (grid) grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-att-action]');
    if (!btn) return;
    const action = btn.dataset.attAction;
    const attId  = btn.dataset.attId;

    if (action === 'view') {
      const latest = EvidenceDB.find(ev.id);
      const att = (latest?.attachments||[]).find(a => a.id === attId);
      if (att && att.data) viewAttachment(att);
    } else if (action === 'delete') {
      if (!Auth.requireInvestigator()) return;
      confirmDeleteAttachment(ev.id, attId);
    }
  });
}

/* ── Change Priority Modal ──────────────────────────────────── */
function showChangePriorityModal(ev) {
  const current = ev.priority || 'Unassigned';

  Modal.show({
    title: 'Change Priority',
    confirmText: 'Set Priority',
    body: `
      <div class="disclaimer-banner mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>As the investigator, you are responsible for this classification. This change will be logged with your name and timestamp.</span>
      </div>
      <div class="form-group">
        <label class="form-label">Current Priority: ${PriorityUtils.badge(current)}</label>
      </div>
      <div class="form-group">
        <label class="form-label form-label-req">New Priority Level</label>
        <select id="cp-priority" class="select">
          ${PRIORITY_LEVELS.map(p => `<option value="${p}"${p===current?' selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Reason / Justification</label>
        <textarea id="cp-reason" class="textarea" rows="3" placeholder="Briefly explain why this priority level was assigned…"></textarea>
        <p class="form-hint">Recommended — provides traceability for the classification decision.</p>
      </div>
    `,
    onConfirm: () => submitChangePriority(ev),
  });
}

function submitChangePriority(ev) {
  const newPriority = document.getElementById('cp-priority')?.value;
  const reason      = document.getElementById('cp-reason')?.value.trim();
  const user        = Auth.currentUser();

  if (!newPriority) return;

  const updated = EvidenceDB.setPriority(ev.id, newPriority, reason, user.name);
  Toast.success(`Priority set to "${newPriority}".`, 'Priority Updated');

  // Refresh just the priority panel and header badge
  const dot   = document.getElementById('priority-dot');
  const label = document.getElementById('priority-current-label');
  if (dot)   dot.style.background = PriorityUtils.color(newPriority);
  if (label) label.textContent    = newPriority;

  const histList = document.getElementById('priority-history-list');
  if (histList) histList.innerHTML = renderPriorityHistory(EvidenceDB.find(ev.id));

  // Refresh the badge in header
  loadEvidence();
}

/* ── Edit Evidence Modal ────────────────────────────────────── */
function showEditEvidenceModal(ev) {
  const catOptions = EVIDENCE_CATEGORIES.map(cat =>
    `<option value="${escHtml(cat)}"${ev.category === cat ? ' selected' : ''}>${escHtml(cat)}</option>`
  ).join('');

  Modal.show({
    title: 'Edit Evidence',
    size: 'lg',
    confirmText: 'Save Changes',
    body: `
      <div class="form-group">
        <label class="form-label form-label-req">Evidence Name</label>
        <input type="text" id="ee-name" class="input" value="${escHtml(ev.name)}" maxlength="120" />
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label form-label-req">Category</label>
          <select id="ee-category" class="select">${catOptions}</select>
        </div>
        <div class="form-group" id="ee-custom-group" style="${ev.category==='Other'?'':'display:none'}">
          <label class="form-label">Specify Category</label>
          <input type="text" id="ee-category-custom" class="input" value="${escHtml(ev.categoryCustom||'')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="ee-desc" class="textarea" rows="3">${escHtml(ev.description||'')}</textarea>
      </div>
      <div class="grid grid-2" style="gap:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Collected By</label>
          <input type="text" id="ee-collected-by" class="input" value="${escHtml(ev.collectedBy||'')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Date Collected</label>
          <input type="date" id="ee-collected-at" class="input" value="${escHtml(ev.collectedAt||'')}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Collection Location</label>
        <input type="text" id="ee-location" class="input" value="${escHtml(ev.location||'')}" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea id="ee-notes" class="textarea" rows="2">${escHtml(ev.notes||'')}</textarea>
      </div>
    `,
    onConfirm: () => submitEditEvidence(ev.id),
  });

  setTimeout(() => {
    document.getElementById('ee-category').addEventListener('change', function() {
      document.getElementById('ee-custom-group').style.display = this.value === 'Other' ? '' : 'none';
    });
  }, 50);
}

function submitEditEvidence(id) {
  const name     = document.getElementById('ee-name')?.value.trim();
  const category = document.getElementById('ee-category')?.value;
  const custom   = document.getElementById('ee-category-custom')?.value.trim();

  if (!name) { Toast.error('Evidence name is required.'); return; }

  EvidenceDB.update(id, {
    name,
    category,
    categoryCustom:  custom,
    description:     document.getElementById('ee-desc')?.value.trim(),
    collectedBy:     document.getElementById('ee-collected-by')?.value.trim(),
    collectedAt:     document.getElementById('ee-collected-at')?.value,
    location:        document.getElementById('ee-location')?.value.trim(),
    notes:           document.getElementById('ee-notes')?.value.trim(),
  });
  Toast.success('Evidence updated.', 'Evidence Updated');
  loadEvidence();
}

/* ── Delete Evidence ────────────────────────────────────────── */
function confirmDeleteEvidence(ev, c) {
  Modal.confirm({
    title: 'Delete Evidence',
    confirmText: 'Delete',
    confirmClass: 'btn-danger',
    body: `
      <div class="alert alert-danger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/></svg>
        <span>Permanently delete <strong>${escHtml(ev.name)}</strong> and all its attachments and history? This cannot be undone.</span>
      </div>`,
    onConfirm: () => {
      EvidenceDB.delete(ev.id);
      Toast.success(`Evidence "${ev.name}" deleted.`);
      window.location.href = c ? `case-details.html?id=${c.id}` : 'cases.html';
    },
  });
}

/* ── Attachment Upload ──────────────────────────────────────── */
function handleFileUpload(evidenceId) {
  const fileInput = document.getElementById('attachment-file-input');
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) return;

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED  = /\.(jpe?g|png|webp|pdf)$/i;

  let added = 0;
  const promises = files.map(file => {
    if (!ALLOWED.test(file.name)) {
      Toast.warning(`"${file.name}" is not an allowed file type.`);
      return Promise.resolve();
    }
    if (file.size > MAX_SIZE) {
      Toast.warning(`"${file.name}" exceeds the 5MB limit.`);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const att = {
          id:   genId('att'),
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          addedAt: DateUtils.isoNow(),
        };
        EvidenceDB.addAttachment(evidenceId, att);
        added++;
        resolve();
      };
      reader.onerror = resolve;
      reader.readAsDataURL(file);
    });
  });

  Promise.all(promises).then(() => {
    if (added > 0) {
      Toast.success(`${added} file${added !== 1 ? 's' : ''} uploaded.`, 'Attachments Added');
      loadEvidence();
    }
    fileInput.value = '';
  });
}

/* ── View Attachment ────────────────────────────────────────── */
function viewAttachment(att) {
  const isImage = /\.(jpe?g|png|webp)$/i.test(att.name);
  Modal.show({
    title: escHtml(att.name),
    size: 'lg',
    footer: `<button class="btn btn-secondary modal-cancel-btn">Close</button>`,
    body: isImage
      ? `<img src="${att.data}" alt="${escHtml(att.name)}" style="width:100%;border-radius:var(--radius);display:block" />`
      : `<div class="empty-state" style="padding:var(--space-8)">
           <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
           <div class="empty-state-title">PDF Preview Unavailable</div>
           <div class="empty-state-text">PDF preview is not supported inline. The file is stored in the system.</div>
         </div>`,
  });
}

/* ── Confirm Delete Attachment ──────────────────────────────── */
function confirmDeleteAttachment(evidenceId, attachmentId) {
  const ev  = EvidenceDB.find(evidenceId);
  const att = (ev?.attachments||[]).find(a => a.id === attachmentId);
  if (!att) return;

  Modal.confirm({
    title: 'Remove Attachment',
    confirmText: 'Remove',
    confirmClass: 'btn-danger',
    body: `
      <div class="alert alert-warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="m10.29 3.86-8.17 14A2 2 0 0 0 3.85 21h16.3a2 2 0 0 0 1.73-3l-8.18-14a2 2 0 0 0-3.44-.14z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span>Remove <strong>${escHtml(att.name)}</strong> from this evidence item?</span>
      </div>`,
    onConfirm: () => {
      EvidenceDB.removeAttachment(evidenceId, attachmentId);
      Toast.success(`Attachment "${att.name}" removed.`);
      loadEvidence();
    },
  });
}
