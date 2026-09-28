# Solution Overview

## What We Built

**ForensiTriage** is a browser-based decision-support prototype for forensic evidence prioritization. It helps investigators create and manage criminal cases, catalogue evidence items with relevant metadata, and receive transparent examination priority recommendations — all without a server, database, or internet connection.

> **AI Honesty Note:** ForensiTriage uses a deterministic **rule-based scoring algorithm**. It is not powered by a trained machine learning model, neural network, or AI API. IBM Bob (an AI coding assistant) was used during development to help write code. The finished application itself runs no AI inference. Priority scores are clearly labelled as rule-based prototype estimates.

## How It Works

1. **Create a case** — Enter case title, crime type, incident date, location, and investigator name. A unique case ID is auto-generated.
2. **Add evidence** — Log each evidence item with type (biological, digital, fingerprint, trace, physical, document, other), condition, contamination risk, urgency, and collection details.
3. **Run prioritization** — The rule-based engine scores each item across four factors and classifies it as Critical, High, or Routine.
4. **Review priorities** — Each priority card shows the score breakdown, contributing factors, and recommended examination types. Expand any card for full detail.
5. **Override if needed** — An investigator can override the recommended priority with a mandatory written reason. The override is logged with timestamp and investigator name.
6. **View proposed schedule** — Evidence is ranked in suggested examination order with rationale for each slot.
7. **Generate a report** — A printable report summarises the entire case, priorities, schedule, overrides, and appropriate disclaimers. Print to PDF from any browser.

## Architecture Diagram

See [`architecture.md`](architecture.md) for the detailed diagram.

```
[Investigator / Browser]
        │
        ▼
[ForensiTriage — src/index.html]
        │
  ┌─────┴────────┐
  │              │
[app.js]    [storage.js]
(UI + events)  (localStorage)
  │
  ├── [prioritization.js]  ← Rule-based scoring engine
  └── [reports.js]         ← Printable report generator
```

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Vanilla HTML/CSS/JS, no framework | Maximises simplicity, zero dependency risk, runs from file:// without a build step — critical for a 2-day hackathon |
| Rule-based scoring, not ML | Transparent, auditable, reproducible and does not require training data, model hosting, or API credentials |
| Four-factor scoring model | Degradation + contamination + urgency + evidence value mirrors real forensic triage logic; each factor is independently adjustable |
| localStorage persistence | Sufficient for demo purposes, no backend required, zero setup for evaluators |
| Manual override with mandatory reason | Reflects real forensic workflow: expert judgement must always be expressible and documented |
| Browser print for reports | PDF generation without libraries; works in every browser |
| Dark forensic theme | Professional appearance appropriate for the domain |

## IBM Technologies Used

- **IBM Bob:** AI coding assistant used during development to help implement, test, and document the application. The finished application itself does not call any IBM API or AI service at runtime — all logic is local and deterministic.

## What Is and Is Not "AI"

| Component | Type | Notes |
|---|---|---|
| Priority scoring | Rule-based algorithm | Deterministic; same inputs always produce same outputs |
| Factor explanations | Template-based text | String lookup from computed values |
| Examination recommendations | Lookup table | Keyed by evidence category |
| Schedule generation | Sort by priority + score | Pure sorting algorithm |
| IBM Bob assistance | AI (development-time only) | Used to write this codebase; not running at application runtime |
