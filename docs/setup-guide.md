# Setup Guide

> **ForensiTriage requires no installation, no server, and no dependencies.**

## Prerequisites

| Requirement | Details |
|---|---|
| **Web Browser** | Chrome 90+, Edge 90+, Firefox 88+, or Safari 14+ |
| **No other software needed** | No Node.js, Python, Docker, or database required to run the application |

> **Optional** — if you want to serve over HTTP instead of opening the file directly:
> - Python 3 (any version), **or**
> - Node.js (for `npx serve`)

## Environment Variables

None. ForensiTriage makes no network requests and requires no API keys or configuration.

## Installation

There is nothing to install.

```bash
# Clone the repository
git clone https://github.com/[your-org]/bob-ai-hackathon-team-Pretzel.git
cd bob-ai-hackathon-team-Pretzel
```

All source code is in the `src/` directory.

## Running the Application

### Option 1 — Open directly (simplest)

```bash
# On Windows — double-click src/index.html, OR:
start src/index.html

# On macOS
open src/index.html

# On Linux
xdg-open src/index.html
```

### Option 2 — Python local server (recommended to avoid any file:// edge cases)

```bash
cd src
python -m http.server 8080
```
Then open **http://localhost:8080** in your browser.

### Option 3 — Node.js serve

```bash
cd src
npx serve .
```
Then open the URL shown in the terminal (usually **http://localhost:3000**).

## Quick Demo

Once the application is open in your browser:

1. Click **"Load Demo"** on the dashboard (or the "Load Demo" quick-action button).
2. A fictional homicide case ("Riverside Apartment Homicide") with 6 evidence items is loaded automatically.
3. Click **"Priorities"** in the navigation to see the rule-based prioritization results.
4. Click any priority card to expand it and see score breakdown, factors, and examination recommendations.
5. Click **"Schedule"** to see the proposed examination order.
6. Click **"Report"** and then **"Print / Save as PDF"** to generate a printable report.
7. Click **"Reset Demo"** on the dashboard to remove the demo data (your own cases are unaffected).

## Running Tests

There is no automated test runner. Manual testing steps are documented in [`docs/solution-overview.md`](solution-overview.md).

To manually verify the application:
1. Open `src/index.html` in Chrome/Edge.
2. Open browser DevTools (F12) and check the Console tab for errors.
3. Load the demo case and navigate through all views.
4. Create a new case, add evidence, and verify prioritization.
5. Test form validation by submitting empty required fields.
6. Test search and filter on the Evidence view.
7. Apply a priority override and verify it appears in the report.
8. Print the report and verify layout.

## Troubleshooting

| Issue | Solution |
|---|---|
| Blank page when opening `index.html` | Ensure all 4 JS files (`app.js`, `storage.js`, `prioritization.js`, `reports.js`) are in the same `src/` folder as `index.html` |
| "localStorage is not available" error | Enable localStorage in browser settings; some browsers block it in private/incognito mode |
| Old data appears after pulling new code | Open DevTools → Application → Local Storage → clear `forensitriage_*` keys |
| Print layout looks wrong | Use Chrome or Edge for best print/PDF output; Firefox may render slightly differently |
| JS errors in console | Ensure you are opening `index.html` from the `src/` directory, not a parent folder |

## Data Persistence Notes

- All data is stored in the browser's **localStorage** under keys prefixed `forensitriage_`.
- Data persists between browser sessions until localStorage is cleared.
- Data is **not** shared between different browsers or devices.
- **⚠ Warning:** localStorage is not encrypted and not suitable for real confidential forensic evidence.
