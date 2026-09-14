# majedjaber1996.github.io

Personal portfolio — plain HTML, CSS and JavaScript. No build step, no framework, no dependencies.
Live at **https://majedjaber1996.github.io**

## How it is put together

```
index.html                  shell: <head>, header/nav, empty section slots, footer
.nojekyll                   tells GitHub Pages to serve files as-is
profile.png                 portrait used in the hero — NOT included in the update bundle,
                            keep your own copy (if it's missing, the hero shows an "MJ" monogram)

assets/css/style.css        the whole design system (tokens → components → sections)
assets/js/app.js            entry point: loads data, loads fragments, wires interactions
assets/js/bind.js           ~120-line template engine (data-bind / data-list / …)
assets/js/ui.js             every interaction, one init function each
assets/js/icons.js          inline SVG icon set

sections/hero.html          one fragment per section — markup only, no content
sections/about.html
sections/experience.html
sections/education.html
sections/projects.html
sections/publications.html
sections/teaching.html
sections/skills.html
sections/contact.html

data/profile.json           the content — this is what you edit
data/experience.json
data/education.json
data/projects.json
data/publications.json
data/teaching.json
data/skills.json
```

**The split:** `sections/*.html` is *shape*, `data/*.json` is *content*.
Adding a publication means one JSON object. You should almost never touch HTML again.

## Editing content

### Add a publication
`data/publications.json` — newest first:

```json
{
  "title": "Paper title",
  "authors": "M. Jaber et al.",
  "venue": "Conference or journal, city, country",
  "type": "Journal",
  "year": 2026,
  "links": [{ "label": "Paper", "url": "https://…" }]
}
```

`type` drives the filter pills automatically — a new type creates a new pill.

### Add a project
`data/projects.json`:

```json
{
  "title": "Project name",
  "role": "Owner",
  "org": "Where",
  "featured": true,
  "year": "2026",
  "categories": ["AI", "Security"],
  "summary": "One sentence.",
  "points": ["bullet", "bullet"],
  "stack": ["Python", "PyTorch"],
  "links": [{ "label": "Code", "url": "https://…" }]
}
```

`categories` build the filter pills. `featured: true` adds the badge. `points`, `stack` and
`links` can be empty arrays — the blocks disappear on their own.

### Add a job
`data/experience.json`. Set `"current": true` on the present role (green dot + "Current" badge).

### Add a degree
`data/education.json` — same timeline style as Experience. Set `"highest": true` on the
top qualification (green dot + "PhD" badge). Each entry takes `degree`, `org`, `place`,
`start`, `end`, `summary` and `tags`.

### Enable the Download CV button
Drop `cv.pdf` in the repo root and set `"cv": "cv.pdf"` in `data/profile.json`.
Leave it `""` and the button stays hidden.

### Reorder or remove a section
Edit the slot list in `index.html` (`<div data-fragment="…">`) and the nav links above it.
To add a brand-new section: create `sections/<name>.html`, add a slot, add one line to
`SECTIONS` in `assets/js/app.js`.

## The template attributes

Used inside `sections/*.html`, handled by `assets/js/bind.js`:

| Attribute | Effect |
|---|---|
| `data-list="key"` | repeat the child `<template>` once per array item |
| `data-bind="path"` | set text content — `.` means the item itself |
| `data-bind-<attr>="path"` | set any attribute: `data-bind-href`, `data-bind-src`, `data-bind-aria-label`, … |
| `data-icon="path"` | inject an inline SVG by name (`github`, `linkedin`, `scholar`, `orcid`, `link`) |
| `data-show="path"` | remove the element when the value is falsy |
| `data-toggle-class="field:cls"` | add `cls` when `field` is truthy |
| `data-counter="path"` | animate the number up when it scrolls into view |
| `class="reveal"` | fade/slide in on scroll (auto-staggered inside lists) |

## Interactions

Light/dark toggle (remembers your choice) · sticky nav with active-section highlight ·
scroll progress bar · mobile menu · scroll-reveal animations · animated counters ·
expandable experience cards · filter + search on projects and publications ·
copy-email button · back-to-top · typed headline.

All of it respects `prefers-reduced-motion`, and the page prints cleanly.

## Running it locally

The sections are fetched at runtime, so `file://` will not work — use a server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

Push to `main`. GitHub Pages serves `majedjaber1996.github.io` from the repo root
automatically. `.nojekyll` keeps Jekyll out of the way.

## Accessibility & SEO notes

- Skip link, focus-visible outlines, `aria-expanded` on every toggle, labelled icon buttons
- Open Graph + Twitter card meta, `Person` JSON-LD, canonical URL
- `<noscript>` fallback with contact links, since content is loaded by JS
