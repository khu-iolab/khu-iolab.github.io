# Research Graphical Abstract Gallery Design

## Goal

Improve `research.html` by replacing synthetic graphical-abstract iframes with real paper-figure galleries that use existing research assets.

## Scope

- Update `research.html` only for the research-page presentation and local gallery behavior.
- Update `lang.js` only for bilingual English/Korean labels, captions, and metadata.
- Reuse existing files under `figures/about/...`.
- Do not add a build step, external library, or React/Vite dependency.

## Content Model

Each research tab includes a `paper-ga-gallery` component with:

- A small bilingual header: "Graphical Abstracts" / "Selected paper figures".
- One featured figure displayed with `object-fit: contain`.
- A caption with paper-specific title and journal/year metadata.
- Thumbnail buttons for tabs with multiple candidate figures.
- A direct "Open full-size" link for reading detailed paper figures.

## Initial Asset Mapping

- Logistics: `L1.png`, `L2.png`, `11_converted.png`
- Network: `NO1.png`, `NO2.png`
- Production: `PO2.png`
- Next-gen: `NGO1.png`

## Interaction

Thumbnail buttons update the featured image, alt text, title, metadata, and full-size link within the same active research panel.

If JavaScript fails, the first figure remains visible because it is present in the HTML.

## Responsive Behavior

On desktop, the gallery stays in the left column below research tags. On mobile, the existing grid stacks, and the gallery appears before the simulation block. Image areas use responsive height constraints instead of a fixed iframe height.

## Accessibility

- Featured images have descriptive `alt` text.
- Thumbnail buttons use `aria-label` and `aria-pressed`.
- Captions remain visible text rather than image-only information.

## Bilingual Requirements

All new visible labels and captions are represented in both English and Korean via `lang.js`, following the repository rule that content changes must be made in both language versions.
