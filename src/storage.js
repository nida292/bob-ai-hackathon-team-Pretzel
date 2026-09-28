/**
 * storage.js — localStorage persistence layer for ForensiTriage
 * All data is keyed under "forensitriage_*" to avoid collisions.
 *
 * Priority levels: Critical | High | Medium | Low | Unassigned
 * Priority is MANUALLY set by investigators — never auto-calculated.
 */

const Storage = (() => {
  const KEYS = {
    cases:    'forensitriage_cases',
    evidence: 'forensitriage_evidence',
    settings: 'forensitriage_settings',
  };

  // Valid manual priority levels (no numerical scoring)
  const PRIORITY_LEVELS = ['Critical', 'High', 'Medium', 'Low', 'Unassigned'];

  // Supported crime types (Other allows free-text)
  const CRIME_TYPES = [
    'Murder', 'Theft', 'Assault', 'Robbery',
    'Cybercrime', 'Sexual Offence', 'Missing Person', 'Other',
  ];

  // Supported evidence categories (Other allows free-text)
  const EVIDENCE_CATEGORIES = [
    'Biological', 'Digital', 'Fingerprint / Impression',
    'Trace', 'Physical', 'Document', 'Other',
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('ForensiTriage: corrupted storage for key', key, '— resetting.', e);
      localStorage.removeItem(key);
      return null;
    }
  }

  function _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('ForensiTriage: unable to write localStorage', e);
      throw new Error('Storage full or unavailable. Unable to save data.');
    }
  }

  // ── Cases ─────────────────────────────────────────────────────────────────

  function getCases() {
    return _read(KEYS.cases) || [];
  }

  function saveCase(caseObj) {
    const cases = getCases();
    const now   = new Date().toISOString();
    const idx   = cases.findIndex(c => c.id === caseObj.id);
    if (idx >= 0) {
      cases[idx] = { ...cases[idx], ...caseObj, updatedAt: now };
    } else {
      cases.unshift({ ...caseObj, createdAt: now, updatedAt: now });
    }
    _write(KEYS.cases, cases);
    return caseObj;
  }

  function deleteCase(caseId) {
    const cases = getCases().filter(c => c.id !== caseId);
    _write(KEYS.cases, cases);
    // Also delete evidence for this case
    const evidence = getEvidence().filter(e => e.caseId !== caseId);
    _write(KEYS.evidence, evidence);
  }

  function getCaseById(caseId) {
    return getCases().find(c => c.id === caseId) || null;
  }

  // ── Evidence ──────────────────────────────────────────────────────────────

  function getEvidence(caseId) {
    const all = _read(KEYS.evidence) || [];
    if (!caseId) return all;
    return all.filter(e => e.caseId === caseId);
  }

  function saveEvidence(evidenceObj) {
    const all = _read(KEYS.evidence) || [];
    const now = new Date().toISOString();
    const idx = all.findIndex(e => e.id === evidenceObj.id && e.caseId === evidenceObj.caseId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...evidenceObj, updatedAt: now };
    } else {
      all.push({ ...evidenceObj, createdAt: now, updatedAt: now });
    }
    _write(KEYS.evidence, all);
    return evidenceObj;
  }

  function deleteEvidence(evidenceId, caseId) {
    const all     = _read(KEYS.evidence) || [];
    const filtered = all.filter(e => !(e.id === evidenceId && e.caseId === caseId));
    _write(KEYS.evidence, filtered);
  }

  function getEvidenceById(evidenceId, caseId) {
    return getEvidence(caseId).find(e => e.id === evidenceId) || null;
  }

  function evidenceIdExists(evidenceId, caseId) {
    return getEvidence(caseId).some(e => e.id === evidenceId);
  }

  // ── Manual Priority Changes ────────────────────────────────────────────────
  // Priority is ONLY set by investigators. No automatic assignment.
  // Each change is recorded in evidence.priorityHistory[].

  /**
   * Record a manual priority change on an evidence item.
   * @param {string} evidenceId
   * @param {string} caseId
   * @param {object} change  { newPriority, investigator, reason? }
   * @returns {boolean}
   */
  function recordPriorityChange(evidenceId, caseId, change) {
    const ev = getEvidenceById(evidenceId, caseId);
    if (!ev) return false;

    const previousPriority = ev.priority || 'Unassigned';
    const historyEntry = {
      previousPriority,
      newPriority:    change.newPriority,
      investigator:   change.investigator || 'Unknown',
      reason:         change.reason || '',
      timestamp:      new Date().toISOString(),
    };

    ev.priority        = change.newPriority;
    ev.priorityHistory = [...(ev.priorityHistory || []), historyEntry];
    saveEvidence(ev);
    return true;
  }

  // ── Generators ────────────────────────────────────────────────────────────

  function generateCaseId() {
    const now  = new Date();
    const yy   = String(now.getFullYear()).slice(-2);
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CASE-${yy}${mm}-${rand}`;
  }

  function generateEvidenceId(caseId) {
    const count = getEvidence(caseId).length + 1;
    return `EV-${String(count).padStart(3, '0')}`;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  function getStats() {
    const cases       = getCases();
    const allEvidence = getEvidence();

    // Priority counts — purely from manually-set ev.priority field
    const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Unassigned: 0 };
    allEvidence.forEach(ev => {
      const p = ev.priority || 'Unassigned';
      if (priorityCounts[p] !== undefined) priorityCounts[p]++;
      else priorityCounts['Unassigned']++;
    });

    return {
      totalCases:     cases.length,
      activeCases:    cases.filter(c => c.status === 'Active').length,
      totalEvidence:  allEvidence.length,
      priorityCounts,
    };
  }

  function getStatsByCaseId(caseId) {
    const evidence = getEvidence(caseId);
    const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Unassigned: 0 };
    evidence.forEach(ev => {
      const p = ev.priority || 'Unassigned';
      if (priorityCounts[p] !== undefined) priorityCounts[p]++;
      else priorityCounts['Unassigned']++;
    });
    return { totalEvidence: evidence.length, priorityCounts };
  }

  // ── Demo management ────────────────────────────────────────────────────────

  function getDemoCaseId() {
    const settings = _read(KEYS.settings) || {};
    return settings.demoCaseId || null;
  }

  function setDemoCaseId(id) {
    const settings = _read(KEYS.settings) || {};
    settings.demoCaseId = id;
    _write(KEYS.settings, settings);
  }

  function resetDemoCase() {
    const demoCaseId = getDemoCaseId();
    if (demoCaseId) {
      deleteCase(demoCaseId);
      const settings = _read(KEYS.settings) || {};
      delete settings.demoCaseId;
      _write(KEYS.settings, settings);
    }
  }

  return {
    // Constants
    PRIORITY_LEVELS,
    CRIME_TYPES,
    EVIDENCE_CATEGORIES,

    // Cases
    getCases, saveCase, deleteCase, getCaseById,

    // Evidence
    getEvidence, saveEvidence, deleteEvidence, getEvidenceById, evidenceIdExists,

    // Manual priority
    recordPriorityChange,

    // Demo
    getDemoCaseId, setDemoCaseId, resetDemoCase,

    // ID generators
    generateCaseId, generateEvidenceId,

    // Stats
    getStats, getStatsByCaseId,
  };
})();
