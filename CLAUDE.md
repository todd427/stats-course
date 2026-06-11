# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An open educational resource — "Statistics 101 for Cyberpsychologists" — published at `stats.ucahub.ie`. Every example is anchored to one MSc cyberpsychology dissertation (UCA: Understanding Cyber-Aggression through AI Use, Trust & Personality). All content is static; there is no backend, database, or auth. Deployed to Cloudflare Pages (build command `npm run build`, output dir `dist`).

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (the React course only; see routing note below)
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run lint       # ESLint (flat config in eslint.config.js)
```

There is no test suite.

## Architecture — three independent surfaces, one build

This repo deliberately mixes a React SPA with hand-written static HTML. They do **not** share code or styling systems — only a common color palette copied into each.

1. **The interactive course** — `src/App.jsx` (single ~1300-line file, the whole app). Built by Vite. The Vite entry point is `course.html` at the repo root (renamed from `index.html`, configured via `rollupOptions.input` in `vite.config.js`), which loads `src/main.jsx` → `App.jsx`. So `npm run dev`/`build` only concern the React course.

2. **The textbook** — `public/book.html`, a standalone ~1000-line HTML file (vanilla CSS/JS, KaTeX via CDN). Not processed by Vite — copied verbatim from `public/` into `dist/`.

3. **The dataset guide** — `public/data.html`, same standalone pattern as the book.

`public/index.html` is the **landing page** (also standalone HTML) and is what serves at `/`. Note the resulting two-entry-point subtlety: `public/index.html` is the site root, while the React app lives at `/course.html`. Don't confuse them.

Routing of clean URLs (`/book`, `/data`) to `public/book.html` / `public/data.html` is handled by Cloudflare Pages' automatic clean-URL serving. `public/_redirects` exists but is intentionally empty — a redirect loop was removed (see git history); avoid reintroducing redirects for these paths.

### Inside `src/App.jsx`

Everything is in this one file, top to bottom:
- **Math helpers** (`normalPDF`, `normalCDF`, `tPVal`, `pearsonR`, `linReg`, `ttest2`, …) — statistics computed in-browser, no library.
- **Theme** — the `C` color object and shared inline-style objects (`card`, `mono`, `serif`). Styling is inline-style-based, not CSS files.
- **Reusable components** — `Eq` (KaTeX renderer), `Explainer`, `Quiz`, `Slider`, `StatBox`, `Num`, `Badge`.
- **Module components** `Mod1`…`Mod12` — one per course module, each self-contained with its own data and interactive widgets (Recharts plots, sliders). Note the numbering is not sequential in the sidebar: `Mod12` (Suppression Effects) is slotted between `Mod8` (Hierarchical Regression) and `Mod9` (PLS-SEM) in the `MODULES` array.
- **`MODULES` array** — wires the `ModN` components to titles/icons/subtitles for the sidebar nav. This array, not the `ModN` numbering, defines the on-screen order.
- **`App`** — sidebar + active-module renderer + per-module quiz-pass progress tracking.

To add or edit a module: write/modify a `ModN` component, then register it in the `MODULES` array. Each module's data lives at the top of its own component.

## Data files

`public/data/` holds three files that must stay in sync with each other **and** with every number quoted across `index.html`, `book.html`, `data.html`, and `App.jsx`:

- **`uca_synthetic.csv`** — N=164 rows, 18 columns. The outcome is `hostile_response` (Hostile Response Likelihood, HRL, 1–10). Predictors: 7 multi-item scales (`habitual_use`, `empathy_deficit`, `normalization`, `anonymity`, `moral_disengagement`, `ai_trust`, `ai_disinhibition`), `ai_familiarity` (1–10), and Big Five single-item markers, plus demographics. **Missingness is structural, not random:** the 22 `ai_frequency == "Never"` participants were routed past the AI/cyber-cognition block, so all 8 AI/cyber scales are blank for them (analytic n=142; `ai_trust` n=140; `agreeableness` n=163; hierarchical-regression listwise **n=139**).
- **`make_synthetic.py`** — the generator that produces the CSV. It draws from the **real** dissertation sample's composite correlation matrix / means / SDs (embedded as literals), rescales to Likert ranges, and re-imposes the skip-branch missingness. `SEED = 4` is chosen so the n=164 draw reproduces the reported effects; **do not change the seed casually** — re-run `python make_synthetic.py` (needs numpy) and re-verify if you do. No real participant data is published.
- **`uca_analysis.R`** — annotated `mice` + `lm`/`update` + `pool` + `ggplot2` workflow matching the data guide.

The headline findings the whole resource is built around (and that the synthetic CSV reproduces): moral disengagement dominates HRL (β ≈ .47, p < .001); the AI block adds a non-significant increment (ΔR² ≈ .02, p ≈ .27); and perceived **anonymity is a suppression effect** — null at the zero order (r ≈ −.10) but a significant negative predictor in the multivariate model (β ≈ −.21). The canonical thesis figures live in the sibling `ucahub` repo (`/home/Projects/ucahub`: `tables/`, `quiz/viva-bank.js`, `analysis/`). If you re-ground the numbers again, regenerate from there.

## Notes

- React 19, Vite 8 (beta, pinned via `overrides`), Recharts 3, KaTeX. The course bundles KaTeX from npm; the standalone HTML pages load KaTeX from a CDN.
- The `stats-course/` subdirectory is a leftover (formerly a git submodule, now a plain dir holding only `README`/`LICENSE`/`.gitignore`) — not part of the app.
- Licence: MIT.
