/**
 * reports.js — Report generation for ForensiTriage
 * Generates printable HTML reports from case + prioritized evidence data.
 */

const Reports = (() => {

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

  function priorityLabel(p) {
    const labels = { critical: 'CRITICAL', high: 'HIGH', routine: 'ROUTINE' };
    return labels[p] || p.toUpperCase();
  }

  function priorityColor(p) {
    const colors = { critical: '#f85149', high: '#e3b341', routine: '#3fb950' };
    return colors[p] || '#8b949e';
  }

  // ── Main report generator ─────────────────────────────────────────────────
  function generateReport(caseObj, prioritized) {
    const now = new Date();
    const overrides = prioritized.filter(e => e.override);

    return `
<div class="report-header">
  <h2>ForensiTriage — Evidence Priority Report</h2>
  <div class="case-id-header">${escapeHtml(caseObj.id)}</div>
  <div class="report-meta">Report generated: ${formatDateTime(now.toISOString())}</div>
  ${caseObj.isDemo ? '<div style="margin-top:0.5rem;"><span style="background:#2d2000;color:#e3b341;border:1px solid #5a4000;padding:0.2rem 0.6rem;border-radius:4px;font-size:0.75rem;font-weight:700;">⚠ DEMO DATA — FICTIONAL</span></div>' : ''}
</div>

<div class="report-section">
  <h3>1. Case Information</h3>
  <table class="report-table">
    <tbody>
      <tr><th>Case ID</th><td>${escapeHtml(caseObj.id)}</td><th>Status</th><td>${escapeHtml(caseObj.status || '—')}</td></tr>
      <tr><th>Title</th><td colspan="3">${escapeHtml(caseObj.title)}</td></tr>
      <tr><th>Crime Type</th><td>${escapeHtml(caseObj.crimeType)}</td><th>Incident Date</th><td>${formatDate(caseObj.incidentDate)}</td></tr>
      <tr><th>Location</th><td>${escapeHtml(caseObj.location)}</td><th>Investigator</th><td>${escapeHtml(caseObj.investigator)}</td></tr>
      <tr><th>Description</th><td colspan="3">${escapeHtml(caseObj.description)}</td></tr>
      <tr><th>Case Created</th><td>${formatDateTime(caseObj.createdAt)}</td><th>Last Updated</th><td>${formatDateTime(caseObj.updatedAt)}</td></tr>
    </tbody>
  </table>
</div>

<div class="report-section">
  <h3>2. Evidence Inventory (${prioritized.length} items)</h3>
  <table class="report-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Evidence ID</th>
        <th>Name</th>
        <th>Type</th>
        <th>Condition</th>
        <th>Collection Date</th>
        <th>Effective Priority</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      ${prioritized.map((ev, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-family:monospace;font-size:0.8em">${escapeHtml(ev.id)}</td>
        <td>${escapeHtml(ev.name)}</td>
        <td>${escapeHtml(ev.type)}</td>
        <td>${escapeHtml(ev.condition || '—')}</td>
        <td>${formatDate(ev.collectionDate)}</td>
        <td style="color:${priorityColor(ev._effectivePriority)};font-weight:700">${priorityLabel(ev._effectivePriority)}${ev.override ? ' (override)' : ''}</td>
        <td>${ev._score}/100</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="report-section">
  <h3>3. Priority Analysis</h3>
  <p style="font-size:0.8em;color:var(--text-muted);margin-bottom:0.75rem;">
    Scores are produced by a deterministic rule-based algorithm. They are prototype estimates only.
    Maximum possible score: 100. Critical ≥ 55, High ≥ 30, Routine &lt; 30.
  </p>
  ${prioritized.map(ev => `
  <div style="margin-bottom:1rem;padding:0.75rem;border:1px solid var(--border);border-left:4px solid ${priorityColor(ev._effectivePriority)};border-radius:4px;background:var(--surface2);">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.4rem;">
      <strong>${escapeHtml(ev.name)}</strong>
      <span style="font-family:monospace;font-size:0.8em;color:var(--text-muted)">${escapeHtml(ev.id)}</span>
    </div>
    <div style="margin-bottom:0.4rem;">
      <span style="color:${priorityColor(ev._effectivePriority)};font-weight:700">${priorityLabel(ev._effectivePriority)}</span>
      &nbsp;| Score: ${ev._score}/100 &nbsp;|
      Degradation: ${ev._breakdown.degradation} &nbsp;|
      Contamination: ${ev._breakdown.contamination} &nbsp;|
      Urgency: ${ev._breakdown.urgency} &nbsp;|
      Evidence Value: ${ev._breakdown.evidenceValue}
    </div>
    <ul style="margin:0.3rem 0 0.5rem 1.2rem;font-size:0.82em;">
      ${ev._factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
    </ul>
    <div style="font-size:0.82em;"><strong>Recommended Examinations:</strong>
      <ul style="margin:0.3rem 0 0 1.2rem;">
        ${ev._recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
    </div>
    ${ev.override ? `
    <div style="margin-top:0.5rem;padding:0.4rem 0.6rem;background:#2d1f3d;border-radius:4px;font-size:0.8em;color:#c4a0ff;">
      <strong>Manual Override:</strong> Priority changed from ${priorityLabel(ev._computedPriority)} to ${priorityLabel(ev.override.priority)}.
      Reason: ${escapeHtml(ev.override.reason)} (by ${escapeHtml(ev.override.by)} on ${formatDateTime(ev.override.at)})
    </div>` : ''}
  </div>`).join('')}
</div>

<div class="report-section">
  <h3>4. Proposed Examination Schedule</h3>
  <p style="font-size:0.8em;color:var(--text-muted);margin-bottom:0.75rem;">
    Proposed order only — does not reflect laboratory capacity, staff availability, or instrument scheduling.
    Final schedule must be confirmed by a qualified forensic supervisor.
  </p>
  <table class="report-table">
    <thead>
      <tr><th>Order</th><th>Evidence ID</th><th>Name</th><th>Priority</th><th>Rationale</th></tr>
    </thead>
    <tbody>
      ${prioritized.map((ev, i) => `
      <tr>
        <td style="text-align:center;font-weight:700">${i + 1}</td>
        <td style="font-family:monospace;font-size:0.8em">${escapeHtml(ev.id)}</td>
        <td>${escapeHtml(ev.name)}</td>
        <td style="color:${priorityColor(ev._effectivePriority)};font-weight:700">${priorityLabel(ev._effectivePriority)}</td>
        <td style="font-size:0.82em;">${escapeHtml(ev._scheduleRationale || '')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

${overrides.length > 0 ? `
<div class="report-section">
  <h3>5. Manual Priority Overrides</h3>
  <p style="font-size:0.8em;color:var(--text-muted);margin-bottom:0.75rem;">
    The following evidence items had their system-recommended priority manually overridden.
  </p>
  <table class="report-table">
    <thead>
      <tr><th>Evidence ID</th><th>Name</th><th>System Recommended</th><th>Overridden To</th><th>Reason</th><th>Override By</th><th>Date</th></tr>
    </thead>
    <tbody>
      ${overrides.map(ev => `
      <tr>
        <td style="font-family:monospace;font-size:0.8em">${escapeHtml(ev.id)}</td>
        <td>${escapeHtml(ev.name)}</td>
        <td style="color:${priorityColor(ev._computedPriority)}">${priorityLabel(ev._computedPriority)}</td>
        <td style="color:${priorityColor(ev.override.priority)};font-weight:700">${priorityLabel(ev.override.priority)}</td>
        <td>${escapeHtml(ev.override.reason)}</td>
        <td>${escapeHtml(ev.override.by)}</td>
        <td>${formatDateTime(ev.override.at)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="report-disclaimer">
  <strong>⚠ IMPORTANT DISCLAIMERS</strong><br/>
  1. ForensiTriage is a <strong>decision-support prototype</strong> using deterministic rule-based logic, not a trained AI or validated forensic tool.<br/>
  2. Priority scores are estimates produced by a rule-based algorithm. They <strong>do not represent validated probabilities</strong> or legally accepted forensic conclusions.<br/>
  3. This system <strong>does not replace</strong> qualified forensic scientists, laboratory technicians, or accredited forensic procedures.<br/>
  4. Recommendations listed are <strong>suggested examination types only</strong> and do not constitute confirmed or authorised forensic protocols.<br/>
  5. Data is stored in browser localStorage — <strong>NOT suitable for real confidential forensic evidence</strong>.<br/>
  6. All scheduling is <strong>proposed order only</strong> and must be confirmed by a forensic laboratory supervisor.<br/>
  <br/>
  <em>Generated by ForensiTriage v1.0 — IBM × NFSU Hackathon prototype. Report date: ${formatDateTime(now.toISOString())}</em>
</div>
    `;
  }

  return { generateReport };
})();
