/**
 * reports.js — Report generation for ForensiTriage
 *
 * Generates printable HTML reports from case + evidence data.
 *
 * IMPORTANT: No numerical scores, no automatic priority calculations.
 * All priorities displayed here are manually set by investigators.
 * This report is a decision-support document only.
 */

const Reports = (() => {

  // ── Utilities ──────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return '—';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  }

  // Priority label — capitalised, no numbers
  function priorityLabel(p) {
    if (!p) return 'Unassigned';
    return String(p).charAt(0).toUpperCase() + String(p).slice(1);
  }

  // Priority accent colour for inline report styles
  function priorityColor(p) {
    const colors = {
      Critical:   '#dc2626',
      High:       '#d97706',
      Medium:     '#2563eb',
      Low:        '#16a34a',
      Unassigned: '#6b7280',
    };
    return colors[p] || '#6b7280';
  }

  // ── Main report generator ──────────────────────────────────────────────────

  /**
   * Generate a complete HTML report string for a case.
   * @param {object} caseObj      — case record from Storage.getCaseById()
   * @param {Array}  scheduled    — evidence array from Prioritization.generateSchedule()
   *                                each item has ev._scheduleOrder and ev._scheduleRationale
   */
  function generateReport(caseObj, scheduled) {
    const now = new Date();

    // Evidence items that have at least one recorded priority change
    const withHistory = scheduled.filter(
      ev => ev.priorityHistory && ev.priorityHistory.length > 0
    );

    // Count by priority
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Unassigned: 0 };
    scheduled.forEach(ev => {
      const p = ev.priority || 'Unassigned';
      if (counts[p] !== undefined) counts[p]++;
      else counts.Unassigned++;
    });

    return `
<div class="report-header">
  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="1.8" style="flex-shrink:0"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    <div>
      <h2 style="margin:0;font-size:1.25rem;color:#1e3a5f;">ForensiTriage — Evidence Priority Report</h2>
      <div style="font-size:0.78rem;color:#57606a;margin-top:0.15rem;">AI-Based Crime Scene Evidence Prioritization System</div>
    </div>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid #e5e7eb;">
    <div><span style="font-size:0.72rem;color:#57606a;text-transform:uppercase;letter-spacing:0.05em;">Case ID</span><div style="font-family:monospace;font-weight:700;color:#1e3a5f;">${escapeHtml(caseObj.id)}</div></div>
    <div><span style="font-size:0.72rem;color:#57606a;text-transform:uppercase;letter-spacing:0.05em;">Report Generated</span><div style="font-weight:600;">${formatDateTime(now.toISOString())}</div></div>
    <div><span style="font-size:0.72rem;color:#57606a;text-transform:uppercase;letter-spacing:0.05em;">Total Evidence Items</span><div style="font-weight:700;color:#1e3a5f;">${scheduled.length}</div></div>
    <div><span style="font-size:0.72rem;color:#57606a;text-transform:uppercase;letter-spacing:0.05em;">Investigator</span><div style="font-weight:600;">${escapeHtml(caseObj.investigator || '—')}</div></div>
  </div>
  ${caseObj.isDemo ? `<div style="margin-top:0.75rem;"><span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:0.25rem 0.75rem;border-radius:4px;font-size:0.75rem;font-weight:700;">⚠ DEMO DATA — FICTIONAL SCENARIO</span></div>` : ''}
</div>

<div class="report-section">
  <h3>1. Case Information</h3>
  <table class="report-table">
    <tbody>
      <tr><th>Case ID</th><td style="font-family:monospace">${escapeHtml(caseObj.id)}</td><th>Status</th><td><span style="font-weight:600;color:${caseObj.status === 'Active' ? '#16a34a' : caseObj.status === 'Closed' ? '#6b7280' : '#d97706'}">${escapeHtml(caseObj.status || '—')}</span></td></tr>
      <tr><th>Title</th><td colspan="3">${escapeHtml(caseObj.title)}</td></tr>
      <tr><th>Crime Type</th><td>${escapeHtml(caseObj.crimeType || '—')}</td><th>Incident Date</th><td>${formatDate(caseObj.incidentDate)}</td></tr>
      <tr><th>Location</th><td>${escapeHtml(caseObj.location || '—')}</td><th>Investigator</th><td>${escapeHtml(caseObj.investigator || '—')}</td></tr>
      <tr><th>Description</th><td colspan="3">${escapeHtml(caseObj.description || '—')}</td></tr>
      <tr><th>Case Created</th><td>${formatDateTime(caseObj.createdAt)}</td><th>Last Updated</th><td>${formatDateTime(caseObj.updatedAt)}</td></tr>
    </tbody>
  </table>
</div>

<div class="report-section">
  <h3>2. Priority Summary</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th>Priority Level</th>
        <th style="text-align:center">Count</th>
        <th>Distribution</th>
      </tr>
    </thead>
    <tbody>
      ${['Critical', 'High', 'Medium', 'Low', 'Unassigned'].map(p => {
        const c = counts[p];
        const pct = scheduled.length > 0 ? Math.round((c / scheduled.length) * 100) : 0;
        return `<tr>
          <td><span style="display:inline-block;padding:0.2rem 0.6rem;border-radius:3px;font-size:0.78rem;font-weight:700;background:${priorityColor(p)}1a;color:${priorityColor(p)};border:1px solid ${priorityColor(p)}40">${p.toUpperCase()}</span></td>
          <td style="text-align:center;font-weight:700">${c}</td>
          <td><div style="background:#f3f4f6;border-radius:2px;height:10px;width:100%;"><div style="width:${pct}%;height:10px;background:${priorityColor(p)};border-radius:2px;"></div></div></td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:700;border-top:2px solid #e5e7eb">
        <td>Total</td>
        <td style="text-align:center">${scheduled.length}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="report-section">
  <h3>3. Evidence Inventory (${scheduled.length} items)</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th style="text-align:center">#</th>
        <th>Evidence ID</th>
        <th>Name</th>
        <th>Category</th>
        <th>Condition</th>
        <th>Collection Date</th>
        <th>Priority</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${scheduled.map((ev, i) => {
        const p = ev.priority || 'Unassigned';
        return `<tr>
          <td style="text-align:center;color:#57606a">${i + 1}</td>
          <td style="font-family:monospace;font-size:0.78em">${escapeHtml(ev.id)}</td>
          <td style="font-weight:500">${escapeHtml(ev.name)}</td>
          <td>${escapeHtml(ev.category || '—')}</td>
          <td>${escapeHtml(ev.condition || '—')}</td>
          <td>${formatDate(ev.collectionDate)}</td>
          <td><span style="font-weight:700;color:${priorityColor(p)}">${priorityLabel(p)}</span></td>
          <td style="font-size:0.82em;color:#57606a">${escapeHtml(ev.notes || '')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

<div class="report-section">
  <h3>4. Proposed Examination Schedule</h3>
  <p style="font-size:0.82em;color:#57606a;margin-bottom:0.75rem;">
    Proposed order reflects the manually-assigned investigator priority only. This schedule does not account
    for laboratory capacity, staff availability, or instrument scheduling.
    <strong>Final schedule must be confirmed by a qualified forensic supervisor.</strong>
  </p>
  <table class="report-table">
    <thead>
      <tr>
        <th style="text-align:center">Slot</th>
        <th>Evidence ID</th>
        <th>Name</th>
        <th>Category</th>
        <th>Priority</th>
        <th>Suggested Examination Types</th>
        <th>Schedule Rationale</th>
      </tr>
    </thead>
    <tbody>
      ${scheduled.map(ev => {
        const p    = ev.priority || 'Unassigned';
        const sugg = Prioritization.getSuggestions(ev.category);
        return `<tr>
          <td style="text-align:center;font-weight:700;color:${priorityColor(p)}">${ev._scheduleOrder}</td>
          <td style="font-family:monospace;font-size:0.78em">${escapeHtml(ev.id)}</td>
          <td style="font-weight:500">${escapeHtml(ev.name)}</td>
          <td>${escapeHtml(ev.category || '—')}</td>
          <td><span style="font-weight:700;color:${priorityColor(p)}">${priorityLabel(p)}</span></td>
          <td style="font-size:0.8em">${sugg.map(s => escapeHtml(s)).join('<br>')}</td>
          <td style="font-size:0.8em;color:#57606a">${escapeHtml(ev._scheduleRationale || '—')}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

${withHistory.length > 0 ? `
<div class="report-section">
  <h3>5. Priority Change History</h3>
  <p style="font-size:0.82em;color:#57606a;margin-bottom:0.75rem;">
    The following evidence items had their priority manually changed by an investigator.
    All changes are recorded for audit purposes.
  </p>
  ${withHistory.map(ev => {
    const currentP = ev.priority || 'Unassigned';
    return `<div style="margin-bottom:1rem;padding:0.75rem;border:1px solid #e5e7eb;border-left:4px solid ${priorityColor(currentP)};border-radius:4px;background:#f9fafb;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
        <strong style="color:#1f2328">${escapeHtml(ev.name)}</strong>
        <span style="font-family:monospace;font-size:0.78em;color:#57606a">${escapeHtml(ev.id)}</span>
      </div>
      <div style="font-size:0.82em;color:#57606a;margin-bottom:0.5rem;">
        Current priority: <strong style="color:${priorityColor(currentP)}">${priorityLabel(currentP)}</strong>
        &nbsp;·&nbsp; ${ev.priorityHistory.length} change${ev.priorityHistory.length !== 1 ? 's' : ''} recorded
      </div>
      <table class="report-table" style="font-size:0.8em;margin:0">
        <thead>
          <tr><th>#</th><th>Previous</th><th>Changed To</th><th>By</th><th>Reason</th><th>Timestamp</th></tr>
        </thead>
        <tbody>
          ${ev.priorityHistory.map((h, idx) => `
          <tr>
            <td style="color:#57606a">${idx + 1}</td>
            <td style="color:${priorityColor(h.previousPriority)};font-weight:600">${priorityLabel(h.previousPriority)}</td>
            <td style="color:${priorityColor(h.newPriority)};font-weight:700">${priorityLabel(h.newPriority)}</td>
            <td>${escapeHtml(h.investigator || '—')}</td>
            <td>${escapeHtml(h.reason || '—')}</td>
            <td style="font-family:monospace;font-size:0.9em">${formatDateTime(h.timestamp)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('')}
</div>` : ''}

<div class="report-disclaimer">
  <strong>⚠ IMPORTANT DISCLAIMERS</strong><br/>
  1. ForensiTriage is a <strong>decision-support tool</strong>. All evidence priorities displayed in this report were
     <strong>manually assigned by qualified investigators</strong> — the system does not automatically determine or
     recommend priority levels.<br/>
  2. This system <strong>does not replace</strong> qualified forensic scientists, laboratory technicians, or accredited
     forensic procedures.<br/>
  3. Suggested examination types are <strong>informational reference only</strong> and do not constitute confirmed or
     authorised forensic protocols. A qualified forensic scientist must determine the appropriate examination
     method for each item.<br/>
  4. Data is stored in browser localStorage — <strong>NOT suitable for real confidential forensic evidence.</strong><br/>
  5. All scheduling is <strong>proposed order only</strong> and must be confirmed by a forensic laboratory supervisor.<br/>
  6. This report does not constitute a legal document and must not be used as standalone evidence in legal proceedings.<br/>
  <br/>
  <em>Generated by ForensiTriage v1.0 — IBM × NFSU Hackathon prototype. Report date: ${formatDateTime(now.toISOString())}</em>
</div>
    `;
  }

  return { generateReport };
})();
