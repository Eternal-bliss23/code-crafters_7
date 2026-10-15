# Change log — RPL Assessor

A record of the UI/UX and feature changes made to this project, newest first.

---

## Session: Government-style redesign + About page polish

### 1. Government (GIGW / india.gov.in) visual theme
- **`src/styles.css`** — full restyle to an Indian government-portal look:
  - Palette: navy header/nav (`#003366`), tricolour accent (saffron `#ff9933` / white / green `#138808`), chakra blue, square corners, blue links.
  - Font: **Open Sans** (Google Fonts import) with a system fallback.
  - New layout classes: top utility bar (`.gov-utility`) with a **Skip to main content** link (`.skip-link`) and working **Text size A- / A / A+** controls; tricolour ribbon (`.tricolor`); government footer (`.gov-footer`) with columns and a "Go to top" link.
  - Kept all existing class names and the inline-referenced tokens (`--green`, `--green-bg`, `--red`, `--red-bg`, `--slate-100`, etc.).
- **`src/App.tsx`** — added the utility bar, header tools, tricolour ribbon and govt footer; added a `fontScale` state applied to `document.body.style.zoom` for the text-size controls.
- **`index.html`** — `theme-color` changed to `#003366`.
- **Honesty:** no State Emblem is used and the utility bar + footer state that this is a *demonstration interface, not an official Government of India website*.

### 2. Removed tinted "highlighter" callouts
- **`src/styles.css`** — `.callout` variants no longer paint a background colour; sentences render as plain text with only a thin semantic left rule (navy / amber / red / blue) to keep warning meaning.

### 3. About page typography
- **`src/styles.css`** — added a `.doc` scope on the About page: paragraphs, lists and callouts set to a clear **16px / 1.7 line-height** using the default app font (previous serif "diplomatic" experiment was reverted).
- **`src/components/About.tsx`**
  - Added the `doc` class; removed the old inline `font-size: 14` on the lists.
  - Bold labels (e.g. **"Supports (the tool does this):"**, **"Engines:"**, **"Offline:"**, **"Sync:"**, **"Data:"**) now render on **their own line** (CSS: `.doc .callout > strong`, `.doc li > strong:first-child { display: block; }`).
  - Capitalised the descriptions that follow those labels: "Interview structure…", "Judging competence…", "Mapping…", "Simulated…", "Qualification-pack content…".

### 4. Clearer Dashboard naming
- **`src/components/Dashboard.tsx`** — the worker form card renamed from **"Start a new assessment"** to **"Register a worker for assessment"**, to distinguish it from the assessor sign-in.

---

## Session: Assessor sign-in (session gate)

- **`src/data/geo.ts`** *(new)* — full all-India list of 28 States + 8 UTs with districts, plus `districtsFor`, `formatLocation`, `parseLocation`.
- **`src/components/StateDistrict.tsx`** *(new)* — `StateDistrictSelects`, a cascading State/UT → District selector.
- **`src/components/Login.tsx`** *(new)* — assessor sign-in (name, ID, State/UT, District); calls `actions.signIn`.
- **`src/state.tsx`** — added `AssessorSession`, `signIn` / `signOut`, session persisted in `localStorage` (`rpl_assessor_session`, synchronous init), exposed `session` on the app context.
- **`src/App.tsx`** — gates the app behind a session (shows `<Login />` when signed out); header shows the assessor name · district and a **Sign out** button.
- **`src/components/Dashboard.tsx`**, **`src/components/SelfDeclaration.tsx`** — worker "District / location" now uses the cascading selects, stored as `"District, State"`.
- **`src/app.smoke.test.tsx`** — asserts the shell text and the sign-in screen when there is no session.

---

## Verification

- `npm run typecheck` — clean.
- `npm run test` — 15/15 passing.

---

## How to run (from VS Code)

1. **Open the folder:** VS Code → *File ▸ Open Folder…* → choose the `rpl-assessor` folder.
2. **Open the terminal:** *Terminal ▸ New Terminal* (or `` Ctrl+` ``).
3. **Install dependencies** (first time only):
   ```powershell
   npm install
   ```
4. **Start the dev server:**
   ```powershell
   npm run dev
   ```
5. **Open the app:** Ctrl+Click the printed URL (default **http://localhost:5173**), or open it in a browser.
6. **Stop the server:** press `` Ctrl+C `` in the terminal.

### If PowerShell blocks npm
If you see *"npm.ps1 cannot be loaded because running scripts is disabled"*:
- Pick **Command Prompt** in the terminal dropdown (the `+` / caret next to the terminal tab), or
- Run the `.cmd` shim instead:
  ```powershell
  npm.cmd run dev
  ```
- Or, once, in the terminal:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```

### Other useful scripts
| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test` | Run the Vitest unit + smoke tests |
| `npm run typecheck` | Type-check only |
