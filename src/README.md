# ForensiTriage — Source Code

All application source code lives in this directory. No build step is required.

## Files

| File | Purpose |
|---|---|
| `index.html` | Application entry point — HTML structure, navigation, view containers, modal |
| `styles.css` | All styles — dark forensic theme, responsive layout, print stylesheet |
| `app.js` | Main UI controller — navigation, event delegation, form handling, rendering all views |
| `storage.js` | localStorage persistence layer — CRUD for cases and evidence, ID generation, demo management |
| `prioritization.js` | Rule-based scoring engine — computes scores, classifies priorities, generates examination recommendations and schedule rationale |
| `reports.js` | Printable report generator — produces self-contained HTML report from case + prioritized evidence |

## How to Run

Open `index.html` directly in Chrome, Edge or Firefox. No server or build step required.

```bash
# Quick start with Python
python -m http.server 8080
# Open http://localhost:8080
```

## Architecture

```
index.html
  └── loads: storage.js → prioritization.js → reports.js → app.js
```

Each module is a self-contained IIFE (Immediately Invoked Function Expression) that exposes a public object (`Storage`, `Prioritization`, `Reports`, `App`). `app.js` wires them all together.

## Notes

- No third-party libraries or frameworks
- No network requests — entirely offline-capable
- No build tools — edit and refresh
- All user input is HTML-escaped before DOM insertion (XSS protection)
- localStorage keys are all prefixed `forensitriage_` to avoid collisions
