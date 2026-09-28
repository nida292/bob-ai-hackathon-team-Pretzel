/**
 * prioritization.js — Evidence examination recommendations for ForensiTriage
 *
 * IMPORTANT: This module contains NO scoring logic, NO automatic priority
 * assignment, and NO numerical risk calculations.
 *
 * Priority is MANUALLY assigned by qualified forensic investigators only.
 * This module only provides suggested examination types per evidence category
 * as a reference resource — these are NOT binding protocols.
 */

const Prioritization = (() => {

  // Priority display order for sorting in tables / queues
  const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3, Unassigned: 4 };

  /**
   * Sort a list of evidence objects by their manually-set priority.
   * Within the same priority, sort by updatedAt descending.
   * @param {Array} evidenceList
   * @returns {Array} sorted copy
   */
  function sortByPriority(evidenceList) {
    return [...evidenceList].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority || 'Unassigned'];
      const pb = PRIORITY_ORDER[b.priority || 'Unassigned'];
      if (pa !== pb) return pa - pb;
      // Within same priority: most recently updated first
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }

  // ── Suggested examination types by evidence category ──────────────────────
  // These are reference suggestions only. They do NOT determine priority.
  const EXAM_SUGGESTIONS = {
    'Biological': [
      'DNA profiling (STR analysis)',
      'Serology — species and blood group determination',
      'Luminescence testing if bloodstain pattern analysis needed',
    ],
    'Digital': [
      'Forensic imaging (bit-for-bit copy before any analysis)',
      'File system analysis and deleted-file recovery',
      'Timeline and metadata extraction',
      'Encrypted partition / password recovery assessment',
    ],
    'Fingerprint / Impression': [
      'Friction ridge development (powder, cyanoacrylate, or vacuum metal deposition as appropriate to substrate)',
      'AFIS comparison search',
      'Photographs of developed prints before lifting',
    ],
    'Trace': [
      'Fibre / hair microscopic comparison',
      'SEM-EDX elemental analysis for gunshot residue or soil',
      'Botanical analysis if plant material present',
    ],
    'Physical': [
      'Toolmark / impression comparison',
      'Fracture-match analysis',
      'Trace evidence collection from surface before handling',
    ],
    'Document': [
      'Handwriting / typeface comparison',
      'Ink and paper chemistry analysis',
      'Indentation examination (ESDA)',
    ],
    'Other': [
      'Visual examination and documentation',
      'Consult specialist based on evidence category',
    ],
  };

  /**
   * Return suggested examination types for a given evidence category.
   * Suggestions are informational only — they do NOT assign priority.
   * @param {string} category
   * @returns {string[]}
   */
  function getSuggestions(category) {
    if (!category) return EXAM_SUGGESTIONS['Other'];
    // Handle custom "Other — <text>" categories
    if (category.startsWith('Other')) return EXAM_SUGGESTIONS['Other'];
    return EXAM_SUGGESTIONS[category] || EXAM_SUGGESTIONS['Other'];
  }

  /**
   * Generate a proposed examination schedule from a sorted evidence list.
   * The schedule simply preserves the investigator-set priority order.
   * It carries NO automatic prioritization logic.
   * @param {Array} sortedEvidence  — already sorted by priority
   * @returns {Array} evidence with _scheduleOrder added
   */
  function generateSchedule(sortedEvidence) {
    return sortedEvidence.map((ev, idx) => ({
      ...ev,
      _scheduleOrder:    idx + 1,
      _scheduleRationale: buildRationale(ev, idx + 1),
    }));
  }

  function buildRationale(ev, order) {
    const p = ev.priority || 'Unassigned';
    if (p === 'Critical')   return `Slot ${order}: Critical — requires immediate examination as assigned by investigator.`;
    if (p === 'High')       return `Slot ${order}: High — examine before medium and low priority items.`;
    if (p === 'Medium')     return `Slot ${order}: Medium — process after critical and high priority items.`;
    if (p === 'Low')        return `Slot ${order}: Low — process in standard examination queue.`;
    return `Slot ${order}: Priority not yet assigned — schedule position pending investigator review.`;
  }

  return {
    PRIORITY_ORDER,
    sortByPriority,
    getSuggestions,
    generateSchedule,
  };
})();
