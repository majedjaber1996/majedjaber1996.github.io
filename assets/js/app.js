/* =========================================================
   app.js — entry point
   1. fetch the JSON data files
   2. fetch every section fragment from /sections and inject it
   3. render each fragment against its data scope
   4. wire the interactions
   ========================================================= */

import { render } from './bind.js';
import * as ui from './ui.js';

/* ---------- which fragment gets which data ---------- */
const SECTIONS = [
  { name: 'hero',         scope: (d) => d.profile },
  { name: 'about',        scope: (d) => d.profile },
  { name: 'experience',   scope: (d) => ({ experience: d.experience }) },
  { name: 'education',    scope: (d) => ({ education: d.education }) },
  { name: 'projects',     scope: (d) => ({ projects: d.projects }) },
  { name: 'publications', scope: (d) => ({ publications: d.publications }) },
  { name: 'teaching',     scope: (d) => ({ teaching: d.teaching }) },
  { name: 'skills',       scope: (d) => ({ skills: d.skills }) },
  { name: 'contact',      scope: (d) => d.profile }
];

const DATA_FILES = ['profile', 'experience', 'education', 'projects', 'publications', 'teaching', 'skills'];

/* ---------- helpers ---------- */
const json = (name) =>
  fetch(`data/${name}.json`, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`data/${name}.json → ${r.status}`);
    return r.json();
  });

const html = (name) =>
  fetch(`sections/${name}.html`, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(`sections/${name}.html → ${r.status}`);
    return r.text();
  });

const period = (o) => [o.start, o.end].filter(Boolean).join(' • ');
const lower = (v) => String(v ?? '').toLowerCase();
const uniq = (arr) => Array.from(new Set(arr));

/* ---------- derive the fields the templates expect ---------- */
function prepare(data) {
  const p = data.profile;
  p.mailtoHref = p.email ? `mailto:${p.email}` : '';
  p.mailtoAltHref = p.emailAlt ? `mailto:${p.emailAlt}` : '';
  p.avatarAlt = `Portrait of ${p.name}`;
  p.cvHref = p.cv || '';

  data.experience.forEach((o) => { o.period = period(o); });
  data.education.forEach((o) => { o.period = period(o); });

  data.projects.forEach((o) => {
    o.categories = o.categories || [];
    o.catsAttr = o.categories.map(lower).join('|');
    o.searchText = lower([o.title, o.role, o.org, o.summary, (o.stack || []).join(' '), (o.points || []).join(' '), o.year].join(' '));
  });

  data.publications.forEach((o) => {
    o.catsAttr = lower(o.type);
    o.searchText = lower([o.title, o.venue, o.type, o.authors, o.year].join(' '));
  });

  return {
    projectCategories: uniq(data.projects.flatMap((o) => o.categories)).sort(),
    publicationTypes: uniq(data.publications.map((o) => o.type)).sort()
  };
}

/* ---------- load one section into its slot ---------- */
async function mount(section, data) {
  const slot = document.querySelector(`[data-fragment="${section.name}"]`);
  if (!slot) return;

  slot.innerHTML = '<div class="frag-loading" aria-hidden="true"></div>';
  try {
    slot.innerHTML = await html(section.name);
    render(slot, section.scope(data));
  } catch (err) {
    console.error('[portfolio] section failed:', section.name, err);
    slot.innerHTML =
      `<div class="frag-error">The “${section.name}” section could not be loaded. ` +
      `If you opened this file directly from disk, run it through a local server instead ` +
      `(<code>python3 -m http.server</code>).</div>`;
  }
}

/* ---------- boot ---------- */
async function boot() {
  ui.initTheme();
  ui.initMobileNav();
  ui.initScrollChrome();
  ui.initYear();

  let data;
  try {
    const loaded = await Promise.all(DATA_FILES.map(json));
    data = Object.fromEntries(DATA_FILES.map((name, i) => [name, loaded[i]]));
  } catch (err) {
    console.error('[portfolio] data failed to load:', err);
    document.getElementById('main').innerHTML =
      '<div class="wrap"><div class="frag-error">Content failed to load. ' +
      'Open this site through a web server (not a <code>file://</code> path).</div></div>';
    return;
  }

  const meta = prepare(data);

  // fragments are fetched in parallel, each injected into its own slot
  await Promise.all(SECTIONS.map((section) => mount(section, data)));

  // CV button only appears when a CV path is set in data/profile.json
  document.querySelectorAll('[data-cv-btn]').forEach((btn) => {
    if (data.profile.cvHref) btn.hidden = false;
  });

  ui.initAvatar(data.profile.initials);
  ui.initReveal();
  ui.initCounters();
  ui.initAccordions();
  ui.initTyped(data.profile.typed);
  ui.initFilter('projects', meta.projectCategories);
  ui.initFilter('publications', meta.publicationTypes);
  ui.initCopyEmail();
  ui.initScrollSpy();
  ui.honourHash();

  document.body.dataset.ready = 'true';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
