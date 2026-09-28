/**
 * prioritization.js — Rule-based evidence prioritization engine
 *
 * IMPORTANT: This is a deterministic, rule-based scoring prototype.
 * It does NOT use any AI model, machine learning, or statistical inference.
 * Scores are prototype estimates and must be reviewed by qualified forensic personnel.
 */

const Prioritization = (() => {

  // ── Scoring weights (configurable) ────────────────────────────────────────
  const WEIGHTS = {
    degradation:     30,  // biological/perishable material
    contamination:   25,  // evidence contamination risk
    urgency:         25,  // investigator-flagged urgency
    evidenceValue:   20,  // inherent evidence type value for the case
  };

  // Categories that inherently degrade and need rapid examination
  const DEGRADATION_TYPES = new Set(['biological', 'trace']);
  // Categories with highest forensic value (tend to be individuating)
  const HIGH_VALUE_TYPES = new Set(['biological', 'fingerprint', 'digital']);
  // Categories with moderate value
  const MEDIUM_VALUE_TYPES = new Set(['trace', 'physical', 'document']);

  // ── Condition scoring ─────────────────────────────────────────────────────
  const CONDITION_SCORES = {
    'excellent': 0,
    'good':      5,
    'fair':      15,
    'poor':      25,
    'degraded':  30,
  };

  // ── Contamination risk scoring ─────────────────────────────────────────────
  // 0=none, 10=low, 20=moderate, 25=high
  function contaminationScore(level) {
    const map = { 'none': 0, 'low': 10, 'moderate': 20, 'high': 25 };
    return map[level] || 0;
  }

  // ── Urgency scoring ────────────────────────────────────────────────────────
  // 0=routine, 15=normal, 25=urgent
  function urgencyScore(level) {
    const map = { 'routine': 0, 'normal': 10, 'urgent': 25 };
    return map[level] || 10;
  }

  // ── Evidence type value ────────────────────────────────────────────────────
  function evidenceValueScore(type) {
    if (HIGH_VALUE_TYPES.has(type))   return 20;
    if (MEDIUM_VALUE_TYPES.has(type)) return 12;
    return 6; // other
  }

  // ── Degradation score ──────────────────────────────────────────────────────
  function degradationScore(ev) {
    let score = 0;
    // Perishable type
    if (DEGRADATION_TYPES.has(ev.type)) score += 20;
    // Condition factor
    score += (CONDITION_SCORES[ev.condition] || 0);
    // Collection age factor: older collection = more degradation risk
    if (ev.collectionDate) {
      const days = Math.floor((Date.now() - new Date(ev.collectionDate).getTime()) / 86400000);
      if      (days > 30) score += 10;
      else if (days > 7)  score += 5;
      else if (days > 3)  score += 2;
    }
    return Math.min(score, 30); // cap at weight max
  }

  // ── Main scoring function ──────────────────────────────────────────────────
  function computeScore(ev) {
    const degradation   = degradationScore(ev);
    const contamination = contaminationScore(ev.contamination);
    const urgency       = urgencyScore(ev.urgency);
    const evValue       = evidenceValueScore(ev.type);

    const total = degradation + contamination + urgency + evValue;

    return {
      total,
      breakdown: { degradation, contamination, urgency, evidenceValue: evValue },
    };
  }

  // ── Priority classification ────────────────────────────────────────────────
  function classifyPriority(score) {
    if (score >= 55) return 'critical';
    if (score >= 30) return 'high';
    return 'routine';
  }

  // ── Factor explanations ────────────────────────────────────────────────────
  function buildFactors(ev, breakdown) {
    const factors = [];

    if (DEGRADATION_TYPES.has(ev.type)) {
      factors.push(`${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)} evidence is perishable and subject to degradation over time.`);
    }
    if (ev.condition && ev.condition !== 'excellent' && ev.condition !== 'good') {
      factors.push(`Evidence condition is reported as "${ev.condition}", indicating potential quality loss.`);
    }
    if (ev.collectionDate) {
      const days = Math.floor((Date.now() - new Date(ev.collectionDate).getTime()) / 86400000);
      if (days > 7) factors.push(`Evidence collected ${days} days ago — elapsed time increases degradation risk.`);
    }
    if (ev.contamination === 'high') {
      factors.push('High contamination risk noted — rapid examination needed to preserve probative value.');
    } else if (ev.contamination === 'moderate') {
      factors.push('Moderate contamination concern — examination should be prioritized over routine items.');
    }
    if (ev.urgency === 'urgent') {
      factors.push('Investigator has flagged this item as urgent.');
    }
    if (HIGH_VALUE_TYPES.has(ev.type)) {
      factors.push(`${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)} evidence has high individuating forensic value.`);
    }
    if (factors.length === 0) {
      factors.push('Standard evidence item — no acute degradation, contamination, or urgency concerns.');
    }
    return factors;
  }

  // ── Examination recommendations ───────────────────────────────────────────
  const EXAM_RECOMMENDATIONS = {
    biological: [
      'DNA profiling (STR analysis)',
      'Serology — species and blood group determination',
      'Luminescence testing if bloodstain pattern analysis needed',
    ],
    digital: [
      'Forensic imaging (bit-for-bit copy before any analysis)',
      'File system analysis and deleted-file recovery',
      'Timeline and metadata extraction',
      'Encrypted partition / password recovery assessment',
    ],
    fingerprint: [
      'Friction ridge development (powder, cyanoacrylate, or vacuum metal deposition as appropriate to substrate)',
      'AFIS comparison search',
      'Photographs of developed prints before lifting',
    ],
    trace: [
      'Fiber / hair microscopic comparison',
      'SEM-EDX elemental analysis for gunshot residue or soil',
      'Botanical analysis if plant material present',
    ],
    physical: [
      'Toolmark / impression comparison',
      'Fracture-match analysis',
      'Trace evidence collection from surface before handling',
    ],
    document: [
      'Handwriting / typeface comparison',
      'Ink and paper chemistry analysis',
      'Indentation examination (ESDA)',
    ],
    other: [
      'Visual examination and documentation',
      'Consult specialist based on evidence type',
    ],
  };

  function getRecommendations(ev) {
    return EXAM_RECOMMENDATIONS[ev.type] || EXAM_RECOMMENDATIONS.other;
  }

  // ── Full prioritize function ───────────────────────────────────────────────
  /**
   * Takes an array of evidence objects, returns them annotated with priority info,
   * sorted by effective priority (critical → high → routine) then by score descending.
   */
  function prioritizeEvidence(evidenceList) {
    const results = evidenceList.map(ev => {
      const { total, breakdown } = computeScore(ev);
      const computedPriority = classifyPriority(total);
      const effectivePriority = ev.override ? ev.override.priority : computedPriority;
      const factors = buildFactors(ev, breakdown);
      const recommendations = getRecommendations(ev);

      return {
        ...ev,
        _score:             total,
        _computedPriority:  computedPriority,
        _effectivePriority: effectivePriority,
        _breakdown:         breakdown,
        _factors:           factors,
        _recommendations:   recommendations,
      };
    });

    const ORDER = { critical: 0, high: 1, routine: 2 };
    results.sort((a, b) => {
      const pa = ORDER[a._effectivePriority];
      const pb = ORDER[b._effectivePriority];
      if (pa !== pb) return pa - pb;
      return b._score - a._score; // higher score first within same priority
    });

    return results;
  }

  // ── Schedule generation ───────────────────────────────────────────────────
  /**
   * Takes prioritized evidence (output of prioritizeEvidence) and proposes
   * an examination schedule with estimated slot numbers.
   */
  function generateSchedule(prioritized) {
    return prioritized.map((ev, idx) => ({
      ...ev,
      _scheduleOrder: idx + 1,
      _scheduleRationale: buildScheduleRationale(ev, idx + 1),
    }));
  }

  function buildScheduleRationale(ev, order) {
    const p = ev._effectivePriority;
    if (p === 'critical') return `Slot ${order}: Critical priority — examine first to preserve time-sensitive evidence.`;
    if (p === 'high')     return `Slot ${order}: High priority — examine before routine items within available capacity.`;
    return `Slot ${order}: Routine priority — process in standard examination queue.`;
  }

  return {
    prioritizeEvidence,
    generateSchedule,
    classifyPriority,
    computeScore,
    getRecommendations,
    WEIGHTS,
  };
})();
