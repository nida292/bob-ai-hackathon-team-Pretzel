/* ============================================================
   ForensiTriage — Reports Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  injectShell([{ label: 'Reports' }]);
  populateCaseSelector();
  populatePriorityFilter();
  bindReportActions();
});

function populateCaseSelector() {
  const sel   = document.getElementById('report-case-select');
  const cases = CasesDB.all().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  cases.forEach(c => {
    const ev   = EvidenceDB.forCase(c.id);
    const opt  = document.createElement('option');
    opt.value  = c.id;
    opt.textContent = `${c.caseNumber} — ${c.title} (${ev.length} evidence)`;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    const btn = document.getElementById('generate-report-btn');
    if (btn) btn.disabled = !sel.value;
    if (sel.value) renderReportPreview(sel.value);
    else clearReport();
  });
}

function populatePriorityFilter() {
  const sel = document.getElementById('report-priority-filter');
  PRIORITY_LEVELS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    const caseId = document.getElementById('report-case-select').value;
    if (caseId) renderReportPreview(caseId);
  });
}

function bindReportActions() {
  const genBtn = document.getElementById('generate-report-btn');
  if (genBtn) genBtn.addEventListener('click', () => {
    if (!Auth.requireInvestigator()) return;
    const caseId = document.getElementById('report-case-select').value;
    if (!caseId) return;
    ActivityLog.add('Report Generated', `FSL schedule for case ${CasesDB.find(caseId)?.caseNumber || caseId}`);
    Toast.success('Report generated. Use "Print Page" to create a PDF.', 'Report Ready');
  });
}

function clearReport() {
  document.getElementById('report-output').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="empty-state-title">Select a Case</div>
      <div class="empty-state-text">Choose a case from the dropdown above to generate the FSL examination schedule.</div>
    </div>`;
}

function renderReportPreview(caseId) {
  const c           = CasesDB.find(caseId);
  if (!c) return;

  const priorityFilter = document.getElementById('report-priority-filter').value;
  let evidence = EvidenceDB.forCase(caseId);
  if (priorityFilter) evidence = evidence.filter(e => (e.priority||'Unassigned') === priorityFilter);

  const sorted      = PriorityUtils.sort(evidence);
  const user        = Auth.currentUser();
  const crimeLabel  = c.crimeType === 'Other' && c.crimeTypeCustom ? c.crimeTypeCustom : c.crimeType;

  // Group by priority
  const groups = { Critical: [], High: [], Medium: [], Low: [], Unassigned: [] };
  sorted.forEach(ev => { (groups[ev.priority || 'Unassigned'] || groups.Unassigned).push(ev); });

  const now = DateUtils.formatFull(new Date().toISOString());

  const container = document.getElementById('report-output');
  container.innerHTML = `
    <!-- Report Header Card -->
    <div class="report-card" id="printable-report">

      <!-- Cover -->
      <div class="report-card-header">
        <div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:4px">
            Forensic Science Laboratory — Examination Schedule
          </div>
          <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px">
            ${escHtml(c.title)}
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${escHtml(c.caseNumber)} · ${escHtml(crimeLabel)} · ${statusBadge(c.status)}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-muted)">Generated</div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(now)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">By: ${escHtml(user.name)}</div>
        </div>
      </div>

      <!-- Meta Row -->
      <div class="report-card-meta">
        <div class="report-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          Lead: ${escHtml(c.leadInvestigator || 'Not assigned')}
        </div>
        <div class="report-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escHtml(c.location || 'Location not recorded')}
        </div>
        <div class="report-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Incident: ${DateUtils.format(c.dateOfIncident) || 'Not recorded'}
        </div>
        <div class="report-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          ${evidence.length} evidence item${evidence.length !== 1 ? 's' : ''}${priorityFilter ? ` (filtered: ${priorityFilter})` : ''}
        </div>
      </div>

      <!-- Disclaimer inside report -->
      <div style="padding:10px 24px;background:#FFFBEB;border-bottom:1px solid #FDE68A;font-size:11px;color:#92400E;line-height:1.5">
        <strong>Notice:</strong> Priority classifications in this schedule are investigator-assigned recommendations only. They do not represent automated forensic scoring, numerical risk assessments, or legal determinations. All classifications must be reviewed and verified by the lead investigator prior to formal FSL submission.
      </div>

      <!-- Priority Groups -->
      ${Object.entries(groups).map(([level, items]) => {
        if (items.length === 0) return '';
        return `
          <div>
            <div style="padding:10px 24px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
              ${PriorityUtils.badge(level)}
              <span style="font-size:12px;color:var(--text-secondary)">${items.length} item${items.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="report-evidence-list">
              ${items.map((ev, idx) => {
                const catLabel = ev.category === 'Other' && ev.categoryCustom ? ev.categoryCustom : ev.category;
                const lastChange = (ev.priorityHistory||[])[0];
                return `
                  <div class="report-evidence-item">
                    <div class="report-evidence-num">${idx + 1}</div>
                    <div class="report-evidence-info">
                      <div class="report-evidence-name">${escHtml(ev.name)} <span style="font-family:monospace;font-size:11px;color:var(--text-muted)">(${escHtml(ev.evidenceNumber)})</span></div>
                      <div class="report-evidence-detail">
                        <strong>Category:</strong> ${escHtml(catLabel)}
                        ${ev.collectedBy ? ` · <strong>Collected by:</strong> ${escHtml(ev.collectedBy)}` : ''}
                        ${ev.collectedAt ? ` · <strong>Date:</strong> ${DateUtils.format(ev.collectedAt)}` : ''}
                        ${ev.location ? `<br><strong>Location:</strong> ${escHtml(ev.location)}` : ''}
                        ${ev.description ? `<br>${escHtml(ev.description)}` : ''}
                        ${lastChange ? `<br><em style="color:var(--text-muted)">Priority set by ${escHtml(lastChange.changedBy)} on ${DateUtils.format(lastChange.changedAt)}${lastChange.reason ? ': ' + escHtml(lastChange.reason) : ''}</em>` : ''}
                        ${(ev.attachments||[]).length > 0 ? `<br><span style="color:var(--brand-blue)">📎 ${ev.attachments.length} attachment${ev.attachments.length !== 1 ? 's' : ''}</span>` : ''}
                      </div>
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}

      ${evidence.length === 0 ? `<div class="report-empty">No evidence items match the selected filter.</div>` : ''}

      <!-- Report Footer -->
      <div style="padding:16px 24px;border-top:1px solid var(--border);background:var(--bg-secondary);font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>ForensiTriage — Evidence Prioritization Platform · ${escHtml(c.caseNumber)}</span>
        <span>Generated: ${escHtml(now)}</span>
      </div>

    </div><!-- /report-card -->
  `;
}

function statusBadge(status) {
  const map = { 'Active': 'badge-active', 'Closed': 'badge-closed', 'Pending': 'badge-pending', 'Under Review': 'badge-review' };
  return `<span class="badge ${map[status]||'badge-unassigned'} badge-dot">${escHtml(status)}</span>`;
}
