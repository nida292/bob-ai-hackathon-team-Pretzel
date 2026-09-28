/**
 * storage.js — localStorage persistence layer for ForensiTriage
 * All data is keyed under "forensitriage_*" to avoid collisions.
 */

const Storage = (() => {
  const KEYS = {
    cases:    'forensitriage_cases',
    evidence: 'forensitriage_evidence',
    settings: 'forensitriage_settings',
  };

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
    const idx = cases.findIndex(c => c.id === caseObj.id);
    if (idx >= 0) {
      cases[idx] = { ...cases[idx], ...caseObj, updatedAt: new Date().toISOString() };
    } else {
      cases.unshift({ ...caseObj, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
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
    const idx = all.findIndex(e => e.id === evidenceObj.id && e.caseId === evidenceObj.caseId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...evidenceObj, updatedAt: new Date().toISOString() };
    } else {
      all.push({ ...evidenceObj, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    _write(KEYS.evidence, all);
    return evidenceObj;
  }

  function deleteEvidence(evidenceId, caseId) {
    const all = _read(KEYS.evidence) || [];
    const filtered = all.filter(e => !(e.id === evidenceId && e.caseId === caseId));
    _write(KEYS.evidence, filtered);
  }

  function getEvidenceById(evidenceId, caseId) {
    return getEvidence(caseId).find(e => e.id === evidenceId) || null;
  }

  function evidenceIdExists(evidenceId, caseId) {
    return getEvidence(caseId).some(e => e.id === evidenceId);
  }

  // ── Overrides ─────────────────────────────────────────────────────────────
  // Overrides are stored on the evidence object itself as evidenceObj.override

  function setOverride(evidenceId, caseId, overrideData) {
    const ev = getEvidenceById(evidenceId, caseId);
    if (!ev) return false;
    ev.override = overrideData;
    saveEvidence(ev);
    return true;
  }

  function clearOverride(evidenceId, caseId) {
    const ev = getEvidenceById(evidenceId, caseId);
    if (!ev) return false;
    delete ev.override;
    saveEvidence(ev);
    return true;
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

  // ── Generators ────────────────────────────────────────────────────────────

  function generateCaseId() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CASE-${yy}${mm}-${rand}`;
  }

  function generateEvidenceId(caseId) {
    // Count existing evidence in this case
    const count = getEvidence(caseId).length + 1;
    return `EV-${String(count).padStart(3, '0')}`;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  function getStats() {
    const cases = getCases();
    const allEvidence = getEvidence();
    return {
      totalCases:    cases.length,
      activeCases:   cases.filter(c => c.status === 'active').length,
      totalEvidence: allEvidence.length,
    };
  }

  return {
    getCases, saveCase, deleteCase, getCaseById,
    getEvidence, saveEvidence, deleteEvidence, getEvidenceById, evidenceIdExists,
    setOverride, clearOverride,
    getDemoCaseId, setDemoCaseId, resetDemoCase,
    generateCaseId, generateEvidenceId,
    getStats,
  };
})();
