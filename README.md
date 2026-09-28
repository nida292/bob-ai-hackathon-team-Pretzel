# ForensiTriage — AI-Assisted Crime Scene Evidence Prioritization

> **IBM × NFSU Hackathon — Team Pretzel**

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | Pretzel |
| **Track** | AI |
| **Team Lead** | Nida — nida@nfsu.ac.in |
| **Members** | Palak Keswani, Sneha, Azifa |

---

## 🎯 Problem Statement

Forensic investigators handling complex crime scenes are overwhelmed by large volumes of heterogeneous evidence items and must manually decide examination order under time pressure. This risks degradation of perishable biological or trace evidence before it can be processed, potentially losing critical case value. Investigators at national and state forensic laboratories need a fast, transparent decision-support tool that explains *why* one item needs to be examined before another.

---

## 💡 Solution

**ForensiTriage** is a browser-based decision-support prototype that lets forensic investigators create cases, log evidence items, and instantly receive explainable examination priorities produced by a transparent rule-based scoring engine. Each item receives a priority level (Critical / High / Routine) with a full factor breakdown, recommended examination types, a proposed schedule, and a printable report — all running locally in the browser with zero dependencies.

> **Honesty note:** ForensiTriage uses a deterministic rule-based algorithm, not a trained AI model. IBM Bob (AI coding assistant) was used during development. The app does not call any AI APIs and requires no credentials.

---

## ✨ Key Features

- **Explainable Prioritization Engine:** Scores each evidence item on four named factors — degradation risk, contamination level, investigator urgency, and evidence type forensic value. Classifies as Critical / High / Routine with factor-by-factor breakdown.
- **Full Evidence CRUD:** Add, view, edit and delete evidence across 7 categories (biological, digital, fingerprint/impression, trace, physical, document, other). Live search and multi-field filtering.
- **Manual Priority Override:** Investigators can override any system recommendation with a mandatory written reason. Override is preserved in the audit report.
- **Proposed Examination Schedule:** Evidence ranked by effective priority with recommended examination types per item.
- **Printable PDF Report:** Complete case report including inventory, priority analysis, schedule, overrides, and forensic disclaimers — printable directly from the browser.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | HTML5, CSS3, JavaScript (ES6+) |
| **Frameworks** | None — vanilla JS, no build tools |
| **IBM Technologies** | IBM Bob (AI coding assistant used during development) |
| **Databases** | Browser localStorage (client-side demo persistence) |
| **Other** | No Docker, no server, no paid APIs — open directly in browser |

---

## 📁 Repository Structure

```
├── src/                  # All source code
│   ├── index.html        # Main application entry point
│   ├── styles.css        # All application styles
│   ├── app.js            # Main UI controller and event handling
│   ├── storage.js        # localStorage persistence layer
│   ├── prioritization.js # Rule-based scoring engine
│   ├── reports.js        # Report HTML generator
│   └── README.md
├── docs/                 # Written documentation
│   ├── problem-statement.md
│   ├── solution-overview.md
│   ├── architecture.md
│   └── setup-guide.md
├── demo/                 # Demo artifacts
│   ├── screenshots/
│   └── demo-video-link.txt
├── presentation/
└── submission.yaml
```

---

## ⚡ How to Run

**No installation required. No server needed.**

```bash
# Option 1 — Open directly in your browser (recommended)
# Double-click src/index.html  OR  drag it into Chrome/Edge/Firefox

# Option 2 — Serve locally (avoids any file:// restrictions)
# If you have Python 3 installed:
cd src
python -m http.server 8080
# Then open http://localhost:8080 in your browser

# Option 3 — Using Node.js npx serve
cd src
npx serve .
# Then open the URL shown in the terminal
```

**That's it.** No `.env`, no `npm install`, no Docker.

---

## 🖥️ Demo

| Artifact | Link |
|---|---|
| 📹 Demo Video | [See demo/demo-video-link.txt](demo/demo-video-link.txt) |
| 🌐 Live Demo | [See demo/live-demo-url.txt](demo/live-demo-url.txt) |
| 🖼️ Screenshots | [See demo/screenshots/](demo/screenshots/) |
| 📊 Presentation | [See presentation/](presentation/) |

**Quick demo:** Open `src/index.html`, click **"Load Demo"** on the dashboard. A fictional homicide case with 6 evidence items is loaded automatically.

---

## ⚠️ Known Limitations

- **localStorage only** — not suitable for real confidential forensic evidence; data is cleared if browser storage is reset.
- **Rule weights are prototype constants** — not validated against real forensic caseload data.
- **No authentication or multi-user support** — single-user browser session only.
- **No network features** — data does not sync between devices or browsers.
- **Tested on Chrome and Edge** — minor cosmetic differences possible in Firefox; IE not supported.
- **Not a certified forensic tool** — does not replace qualified forensic scientists or accredited laboratory procedures.

---

## 🏅 What We're Most Proud Of

The **explainable prioritization engine**. Every score is broken into four transparent factors so investigators can understand, challenge, and override every recommendation — reflecting the real-world principle that expert judgement must always take precedence over automated suggestions. The manual override system with mandatory reason capture and full audit trail in the printed report demonstrates responsible AI-adjacent design.

---

## ⚠️ Important Disclaimer

ForensiTriage is a **prototype decision-support tool**. It does not replace qualified forensic experts, determine guilt, or provide legally validated conclusions. All data stored locally — not suitable for real confidential forensic evidence.
