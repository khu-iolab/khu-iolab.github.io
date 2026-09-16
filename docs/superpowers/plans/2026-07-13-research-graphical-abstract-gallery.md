# Research Graphical Abstract Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generated graphical-abstract iframes in `research.html` with real paper-figure galleries using existing assets.

**Architecture:** Keep the static HTML page and inline research-page CSS/JS pattern. The gallery is semantic HTML rendered by default, with a small progressive-enhancement script for thumbnail switching.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, existing `lang.js` translation helper.

## Global Constraints

- No build step or package install.
- Reuse existing assets under `figures/about`.
- Make all new visible text available in both English and Korean.
- Do not modify unrelated pages.

---

### Task 1: Replace Graphical Abstract Markup

**Files:**
- Modify: `research.html`

**Interfaces:**
- Consumes: Existing research tab structure and image assets.
- Produces: `.paper-ga-gallery` elements consumed by Task 3 JavaScript.

- [ ] **Step 1: Replace each `.research-ga-wrap` iframe block with `.paper-ga-gallery` markup**

Use `figure.paper-ga-feature`, `img.paper-ga-image`, and thumbnail buttons with `data-ga-*` attributes.

- [ ] **Step 2: Keep a default featured image in each tab**

The first image in each gallery must be present in HTML so the page still works without JavaScript.

### Task 2: Add Gallery Styling

**Files:**
- Modify: `research.html`

**Interfaces:**
- Consumes: `.paper-ga-gallery`, `.paper-ga-feature`, `.paper-ga-thumbs`, `.paper-ga-thumb`.
- Produces: Responsive figure presentation.

- [ ] **Step 1: Replace old `.research-ga-wrap` and `.ga-iframe` CSS**

Add styles for the gallery header, image canvas, caption, open link, and thumbnail strip.

- [ ] **Step 2: Add mobile adjustments**

Set compact image heights and horizontally scrollable thumbnails under `@media (max-width: 768px)`.

### Task 3: Add Thumbnail Switching

**Files:**
- Modify: `research.html`

**Interfaces:**
- Consumes: `button.paper-ga-thumb[data-ga-src][data-ga-title][data-ga-meta][data-ga-alt]`.
- Produces: Updated featured image, caption, link, and active thumbnail state.

- [ ] **Step 1: Add local vanilla JavaScript below the existing tab code**

For each gallery, attach click handlers to thumbnail buttons.

- [ ] **Step 2: Preserve accessibility state**

Set `aria-pressed="true"` on the active thumbnail and `false` on the others.

### Task 4: Add Bilingual Strings

**Files:**
- Modify: `lang.js`

**Interfaces:**
- Consumes: Existing `applyLang` support for `data-i18n`.
- Produces: Translation keys for labels, captions, metadata, links, and thumbnail labels.

- [ ] **Step 1: Add English keys under `translations.en`**

Add `research.ga.*` keys for shared labels and all gallery captions.

- [ ] **Step 2: Add Korean keys under `translations.ko`**

Add matching Korean keys for every English key.

### Task 5: Verify Static Page

**Files:**
- Verify: `research.html`

**Interfaces:**
- Consumes: Browser rendering and existing static-server behavior.
- Produces: Confirmed page behavior.

- [ ] **Step 1: Inspect changed files**

Run `git diff -- research.html lang.js`.

- [ ] **Step 2: Serve the static site**

Run `python -m http.server 8000` from the repository root if no server is already running.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8000/research.html`, switch each research tab, click gallery thumbnails, and toggle EN/KO.
