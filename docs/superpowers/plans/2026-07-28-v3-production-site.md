# IO-LAB v3.0 Production Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the IO-LABweb_v.3.0 design-canvas drafts (`.dc.html`) into a production static site inside the khu-iolab.github.io repo (the `IO-LABweb_v.2.0` folder), replacing the live v2.0 site.

**Architecture:** Each `.dc.html` file is a self-contained design template: presentation HTML inside `<x-dc>` with `sc-if`/`sc-for` template tags, plus a `data-dc-script` script whose `renderVals()` holds all data. Conversion = expand each template statically with its own data, wrap in a proper HTML5 shell, and replace React tab state with a small vanilla-JS tab switcher. No build step, no runtime dependency — plain HTML/CSS/JS on GitHub Pages.

**Tech Stack:** Static HTML5 + inline CSS (as designed) + vanilla JS (tabs only). Google Fonts CDN. Spline embed iframe (home hero). Python 3 for the link-integrity checker.

**Repo root:** `G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0` (git remote: `khu-iolab/khu-iolab.github.io`, branch `main`)
**Design source:** `G:\내 드라이브\4.lab\0. website\IO-LABweb_v.3.0`

---

## Shared Conversion Spec (applies to every page task)

### Page mapping

| Source (v3.0) | Output (repo root) | `<title>` | Tabs |
|---|---|---|---|
| home.dc.html | index.html | `IO-LAB · 지능형 최적화 연구실 | 경희대학교` | none |
| members.dc.html | members.html | `구성원 · IO-LAB` | advisor / members |
| research.dc.html | research.html | `연구분야 · IO-LAB` | logistics / network / production / nextgen |
| publications.dc.html | publications.html | `논문 · IO-LAB` | none (sc-for only) |
| projects.dc.html | projects.html | `연구과제 · IO-LAB` | none |
| courses.dc.html | courses.html | `교육자료 · IO-LAB` | none |
| community.dc.html | community.html | `커뮤니티 · IO-LAB` | news / photos / contact |

`IO-LAB Home.dc.html` and `IO-LAB Home - Refinements.dc.html` are earlier exploration canvases — **do not convert them**.

### Output shell (exact)

Every output page is:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>[per-page title from table]</title>
<link rel="icon" type="image/png" href="figures/io-lab-icon-navy-transparent.png">
[entire contents of the source file's <helmet>…</helmet> block: the font <link> tags and the <style> block, verbatim]
</head>
<body>
[converted page markup]
[tab <script> — only on pages with tabs]
</body>
</html>
```

### Conversion rules

1. **Strip the canvas runtime.** Remove: `<script src="./support.js">`, the `<x-dc>`/`</x-dc>` wrapper, the `<helmet>` wrapper tags (keep the contents, moved into `<head>`), and the entire `<script type="text/x-dc" data-dc-script …>…</script>` block.
2. **Drop `data-screen-label` attributes** (design-canvas metadata). Keep everything else about each element verbatim — inline styles are the design; do not "clean up", reformat, or restyle.
3. **`sc-if` blocks:**
   - On tab pages, each `sc-if value="{{ showX }}"` wraps a tab panel. Unwrap it (remove the `<sc-if>`/`</sc-if>` tags, keep contents) and put `data-tab-panel="X"` on the panel's outermost `<div>`. The panel whose tab is the page's initial `state.tab` stays visible; every other panel additionally gets `style` prefixed with `display:none;` (prepend to the existing inline style).
   - `sc-if value="{{ heroSpline }}"` and `{{ showRecruiting }}` on index.html default to `true`: unwrap and keep contents.
4. **`sc-for` loops:** expand statically. The loop data is in the same file's `renderVals()`. For each item, emit one copy of the loop body with every `{{ item.field }}` replaced by the item's value. JS style objects (e.g. `coverStyle`, badge `style`) become inline CSS strings: camelCase → kebab-case, numbers unitless where the JS had them (e.g. `fontWeight: 600` → `font-weight:600`), `backgroundImage: 'url("…")'` → `background-image:url('…')`. Escape `&` as `&amp;` in text content.
5. **Tab buttons:** replace `data-active="{{ xActive }}"` with `data-active="true"` (initial tab) or `data-active="false"`, remove `onClick="{{ setX }}"`, and add `data-tab="X"` where `X` matches the panel's `data-tab-panel`.
6. **Tab script (exact — append before `</body>` on members/research/community only):**

```html
<script>
document.querySelectorAll('.pg-tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.pg-tab').forEach(function (b) {
      b.setAttribute('data-active', String(b === btn));
    });
    var name = btn.getAttribute('data-tab');
    document.querySelectorAll('[data-tab-panel]').forEach(function (p) {
      p.style.display = (p.getAttribute('data-tab-panel') === name) ? '' : 'none';
    });
  });
});
</script>
```

7. **Links:** every internal `href="X.dc.html"` → `href="X.html"`, except `home.dc.html` → `index.html`. External links (`http…`), `mailto:`, and the Spline iframe stay verbatim.
8. **Do not translate, reword, add, or remove content.** The design text is final. Keep the EN|KO pill exactly as designed (static).
9. **Encoding:** UTF-8, no BOM (agents on Windows: write with the Write tool, not PowerShell redirection).

### Definition of done per page

`python scripts/check_v3_site.py` reports no errors for that page, and a manual `grep` shows no `sc-`, `x-dc`, `{{`, `data-dc-script`, or `support.js` remnants.

---

### Task 1: Copy v3.0 figures into the repo

**Files:**
- Create/overwrite: `figures/**` (from `IO-LABweb_v.3.0/figures/**`, 66 files, ~58 MB)

- [ ] **Step 1: Copy the tree** (PowerShell)

```powershell
robocopy "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.3.0\figures" "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0\figures" /E /NFL /NDL
```

Expected: exit code 0–3 (robocopy success codes), 66 files considered.

- [ ] **Step 2: Verify the 24 referenced images exist in the repo**

```bash
cd "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0"
for f in figures/io-lab-icon-white-transparent.png figures/io-lab-icon-navy-transparent.png figures/journal/TRE.jpg figures/photo/dinner.png; do [ -f "$f" ] && echo OK "$f" || echo MISSING "$f"; done
```

Expected: all OK.

- [ ] **Step 3: Commit**

```bash
git add figures && git commit -m "chore: import v3.0 figure assets"
```

---

### Task 2: Add the site integrity checker (failing first)

**Files:**
- Create: `scripts/check_v3_site.py`

- [ ] **Step 1: Write the checker**

```python
"""Integrity check for the v3.0 production pages."""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "members.html", "research.html", "publications.html",
         "projects.html", "courses.html", "community.html"]
REDIRECTS = ["team.html", "news.html", "photos.html", "contact.html"]
LEFTOVERS = ["<x-dc", "<sc-", "data-dc-script", "support.js", "{{"]

def check_page(name, html, errors):
    for bad in LEFTOVERS:
        if bad in html:
            errors.append(f"{name}: leftover canvas artifact {bad!r}")
    if "<title>" not in html:
        errors.append(f"{name}: missing <title>")
    if '<html lang="ko">' not in html:
        errors.append(f"{name}: missing <html lang=\"ko\">")
    refs = re.findall(r'(?:href|src)="([^"]+)"', html)
    refs += re.findall(r"url\(['\"]?([^'\")]+)['\"]?\)", html)
    for url in refs:
        if url.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        target = url.split("#")[0]
        if target and not (ROOT / target).exists():
            errors.append(f"{name}: broken local ref {url}")

def main():
    errors = []
    for name in PAGES + REDIRECTS:
        path = ROOT / name
        if not path.exists():
            errors.append(f"{name}: file missing")
            continue
        check_page(name, path.read_text(encoding="utf-8"), errors)
    for name in REDIRECTS:
        path = ROOT / name
        if path.exists() and "http-equiv=\"refresh\"" not in path.read_text(encoding="utf-8"):
            errors.append(f"{name}: expected a meta-refresh redirect stub")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print(f"OK: {len(PAGES)} pages + {len(REDIRECTS)} redirects clean")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it — expect failure (pages not converted yet)**

```bash
cd "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0" && python scripts/check_v3_site.py
```

Expected: FAIL — old pages exist but contain no `lang="ko"` shell / redirect stubs missing (index.html etc. may pass some checks; the run must exit 1 overall, e.g. `courses.html: file missing`).

- [ ] **Step 3: Commit**

```bash
git add scripts/check_v3_site.py && git commit -m "test: add v3.0 site integrity checker"
```

---

### Task 3: Convert home.dc.html → index.html (reference page)

**Files:**
- Read: `G:\내 드라이브\4.lab\0. website\IO-LABweb_v.3.0\home.dc.html`
- Overwrite: `index.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `index.html`** applying the Shared Conversion Spec: shell with title `IO-LAB · 지능형 최적화 연구실 | 경희대학교`; helmet contents into `<head>`; unwrap both `sc-if` blocks (heroSpline, showRecruiting — both default true, keep contents); no tabs, no tab script; rewrite the 7 internal links (`members/research/publications/projects/courses/community.dc.html` → `.html`, logo link `home.dc.html` → `index.html`).
- [ ] **Step 3: Verify no canvas artifacts**

```bash
grep -c 'sc-\|x-dc\|{{\|support.js\|data-dc-script\|\.dc\.html' index.html
```

Expected: `0` (grep exits 1).

- [ ] **Step 4: Commit**

```bash
git add index.html && git commit -m "feat: v3.0 home page (index.html)"
```

---

### Task 4: Convert members.dc.html → members.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\members.dc.html`
- Overwrite: `members.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `members.html`** per the spec. Tabs: `advisor` (initial, visible) and `members` (hidden, `display:none;` prepended). Expand the `undergrads` sc-for with the 9 members from `renderVals()` (fields `m.name`, `m.dept`, `m.photo`). Append the tab script.
- [ ] **Step 3: Verify**

```bash
grep -c 'sc-\|{{\|\.dc\.html' members.html   # expect 0
grep -c 'data-tab-panel' members.html          # expect 2
```

- [ ] **Step 4: Commit** — `git add members.html && git commit -m "feat: v3.0 members page"`

---

### Task 5: Convert research.dc.html → research.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\research.dc.html`
- Overwrite: `research.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `research.html`** per the spec. Four tab panels: `logistics` (initial, visible), `network`, `production`, `nextgen` (hidden). Four `.pg-tab` buttons get `data-tab` + `data-active`. No sc-for loops on this page. Append the tab script.
- [ ] **Step 3: Verify**

```bash
grep -c 'sc-\|{{\|\.dc\.html' research.html   # expect 0
grep -c 'data-tab-panel' research.html          # expect 4
```

- [ ] **Step 4: Commit** — `git add research.html && git commit -m "feat: v3.0 research page"`

---

### Task 6: Convert publications.dc.html → publications.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\publications.dc.html`
- Overwrite: `publications.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `publications.html`** per the spec. No tabs. Expand four sc-for groups from `renderVals()`: `workingPapers` (3), `intlYears` (nested: 6 year groups, 15 papers total — apply `journalCover()` = the 76×100px cover style with each paper's `cover` image), `confPapers` (6), `presentations` (5 — apply `logoCover()` = the 96×64px contain-fit style). Badge objects render as `<span style="[badge style as CSS]">[label]</span>`.
- [ ] **Step 3: Verify**

```bash
grep -c 'sc-\|{{\|\.dc\.html' publications.html      # expect 0
grep -o 'figures/journal/[^"'\'')]*' publications.html | wc -l   # expect ≥ 15
```

- [ ] **Step 4: Commit** — `git add publications.html && git commit -m "feat: v3.0 publications page"`

---

### Task 7: Convert projects.dc.html → projects.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\projects.dc.html`
- Overwrite: `projects.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `projects.html`** per the spec. No tabs. Expand `ongoing` (4) and `completed` (8) sc-for loops including nested `p.badges` / `p.logos` loops.
- [ ] **Step 3: Verify** — `grep -c 'sc-\|{{\|\.dc\.html' projects.html` expect 0.
- [ ] **Step 4: Commit** — `git add projects.html && git commit -m "feat: v3.0 projects page"`

---

### Task 8: Convert courses.dc.html → courses.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\courses.dc.html`
- Overwrite (new file): `courses.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `courses.html`** per the spec. No tabs, no sc-for (fully static content: IE315000 / IE105000 sections).
- [ ] **Step 3: Verify** — `grep -c 'sc-\|{{\|\.dc\.html' courses.html` expect 0.
- [ ] **Step 4: Commit** — `git add courses.html && git commit -m "feat: v3.0 courses page"`

---

### Task 9: Convert community.dc.html → community.html

**Files:**
- Read: `…\IO-LABweb_v.3.0\community.dc.html`
- Overwrite: `community.html`

- [ ] **Step 1: Read the source file fully.**
- [ ] **Step 2: Write `community.html`** per the spec. Tabs: `news` (initial, visible), `photos`, `contact` (hidden). Expand `news` (5 items) and `photos` (6 items) sc-for loops. Append the tab script.
- [ ] **Step 3: Verify**

```bash
grep -c 'sc-\|{{\|\.dc\.html' community.html   # expect 0
grep -c 'data-tab-panel' community.html          # expect 3
```

- [ ] **Step 4: Commit** — `git add community.html && git commit -m "feat: v3.0 community page"`

---

### Task 10: Redirect stubs + remove superseded v2.0 assets

**Files:**
- Overwrite: `team.html`, `news.html`, `photos.html`, `contact.html` (redirect stubs)
- Delete: `styles.css`, `script.js`, `lang.js`, `news-data.js`

- [ ] **Step 1: Write the four redirect stubs.** Template (adjust target per file — team→members.html, news→community.html, photos→community.html, contact→community.html):

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=members.html">
<link rel="canonical" href="members.html">
<title>IO-LAB</title>
</head>
<body><a href="members.html">이동 중… members.html</a></body>
</html>
```

- [ ] **Step 2: Delete the old runtime files** (lang.js has an uncommitted modification — deletion supersedes it):

```bash
git rm -f styles.css script.js lang.js news-data.js
```

- [ ] **Step 3: Commit**

```bash
git add team.html news.html photos.html contact.html
git commit -m "feat: redirect stubs for retired v2.0 pages; drop v2.0 runtime"
```

Leave untouched: `google320048c14df536f3.html`, `domain.txt`, `.gitignore`, `QR/`, `learningmaterials/`, `figures/` extras, docs, tests (stale v2.0 tests noted in final summary).

---

### Task 11: Full verification

- [ ] **Step 1: Run the checker**

```bash
cd "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0" && python scripts/check_v3_site.py
```

Expected: `OK: 7 pages + 4 redirects clean`, exit 0.

- [ ] **Step 2: Serve locally and spot-check HTTP 200 + visual sanity**

```bash
cd "G:\내 드라이브\4.lab\0. website\IO-LABweb_v.2.0" && python -m http.server 8931
```

Then `curl -s -o /dev/null -w "%{http_code} " http://localhost:8931/{index,members,research,publications,projects,courses,community}.html` — expect seven `200`s. Open `http://localhost:8931/` in the browser and click through the nav and every tab.

- [ ] **Step 3: Commit any fixes** found during verification.

---

### Task 12: Push to production

- [ ] **Step 1: Review what will ship**

```bash
git log --oneline origin/main..HEAD && git status --short
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Verify live** — fetch `https://khu-iolab.github.io/` after ~1 min (GitHub Pages build) and confirm the new hero renders (`Intelligent Optimization Lab.` heading present, no `support.js` reference).
