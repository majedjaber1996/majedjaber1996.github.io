/* =========================================================
   ui.js — all interactive behaviour, one exported init per feature.
   Every function is safe to call when its markup is absent.
   ========================================================= */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- storage helpers (never throw) ---------- */
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }
};

/* ---------- theme ---------- */
export function initTheme() {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const saved = store.get('mj-theme');

  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  btn?.addEventListener('click', () => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = root.dataset.theme === 'auto' ? (systemDark ? 'dark' : 'light') : root.dataset.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('mj-theme', next);
    btn.setAttribute('title', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
}

/* ---------- sticky header shadow + scroll progress + back to top ---------- */
export function initScrollChrome() {
  const header = document.getElementById('siteHeader');
  const bar = document.getElementById('progressBar');
  const toTop = document.getElementById('toTop');
  let frame = 0;

  const update = () => {
    frame = 0;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header?.classList.toggle('is-stuck', y > 6);
    if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    toTop?.classList.toggle('is-visible', y > 600);
  };

  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  update();
}

/* ---------- mobile menu ---------- */
export function initMobileNav() {
  const nav = document.getElementById('mainNav');
  const toggle = document.getElementById('navToggle');
  if (!nav || !toggle) return;

  const close = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------- scroll-spy: highlight the section in view ---------- */
export function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('[data-nav]'));
  if (!links.length) return;

  const map = new Map();
  links.forEach((link) => {
    const target = document.getElementById(link.dataset.nav);
    if (target) map.set(target, link);
  });
  if (!map.size) return;

  const setActive = (el) => {
    links.forEach((l) => l.classList.remove('is-active'));
    map.get(el)?.classList.add('is-active');
  };

  const sections = Array.from(map.keys());
  let frame = 0;

  const update = () => {
    frame = 0;
    const header = document.getElementById('siteHeader');
    const line = window.scrollY + (header?.offsetHeight || 68) + window.innerHeight * 0.22;

    let current = sections[0];
    for (const section of sections) {
      if (section.offsetTop <= line) current = section;
    }

    // at the very bottom, always light up the last section
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    setActive(current);
  };

  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', () => { if (!frame) frame = requestAnimationFrame(update); });
  update();
}

/* ---------- reveal on scroll ---------- */
export function initReveal(scope = document) {
  const items = scope.querySelectorAll('.reveal:not(.is-in)');
  if (!items.length) return;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });

  items.forEach((el) => observer.observe(el));
}

/* ---------- count-up numbers ---------- */
export function initCounters(scope = document) {
  const nodes = scope.querySelectorAll('[data-target]');
  if (!nodes.length) return;

  const run = (el) => {
    const target = Number(el.dataset.target) || 0;
    const suffix = el.dataset.suffixText || '';
    if (prefersReduced) { el.textContent = target + suffix; return; }

    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: .4 });

  nodes.forEach((el) => observer.observe(el));
}

/* ---------- expandable cards ---------- */
export function initAccordions(scope = document) {
  // group by section so each timeline opens its own first item
  const groups = new Map();
  scope.querySelectorAll('[data-accordion]').forEach((card) => {
    const key = card.closest('section')?.id || '_';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  });

  groups.forEach((cards) => {
    cards.forEach((card, index) => {
      const button = card.querySelector('button[aria-expanded]');
      const body = card.querySelector('.timeline-body');
      if (!button || !body) return;

      const setOpen = (open) => {
        button.setAttribute('aria-expanded', String(open));
        body.hidden = !open;
      };

      setOpen(index === 0);
      button.addEventListener('click', () => {
        setOpen(button.getAttribute('aria-expanded') !== 'true');
      });
    });
  });
}

/* ---------- typed headline ---------- */
export function initTyped(phrases) {
  const el = document.getElementById('typedText');
  if (!el || !Array.isArray(phrases) || !phrases.length) return;

  if (prefersReduced) { el.textContent = phrases[0]; return; }

  let phrase = 0;
  let char = 0;
  let deleting = false;

  const tick = () => {
    const text = phrases[phrase];
    char += deleting ? -1 : 1;
    el.textContent = text.slice(0, char);

    let delay = deleting ? 38 : 68;
    if (!deleting && char === text.length) { deleting = true; delay = 1500; }
    else if (deleting && char === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 320; }

    setTimeout(tick, delay);
  };
  tick();
}

/* ---------- filter + search for a section ---------- */
export function initFilter(sectionId, categories = []) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const group = section.querySelector('[data-filter-group]');
  const input = section.querySelector('input[type="search"]');
  const empty = section.querySelector('.empty-state');
  const items = Array.from(section.querySelectorAll('[data-cats]'));
  if (!items.length) return;

  // build the category pills from the template inside the group
  const tpl = group?.querySelector('template');
  if (tpl && categories.length) {
    const frag = document.createDocumentFragment();
    categories.forEach((cat) => {
      const clone = tpl.content.cloneNode(true);
      const pill = clone.querySelector('button');
      if (!pill) return;
      pill.textContent = cat;
      pill.dataset.filter = cat.toLowerCase();
      frag.appendChild(pill);
    });
    tpl.replaceWith(frag);
  }

  let activeCat = 'all';

  const apply = () => {
    const query = (input?.value || '').trim().toLowerCase();
    let shown = 0;

    items.forEach((item) => {
      const cats = (item.dataset.cats || '').split('|');
      const matchCat = activeCat === 'all' || cats.includes(activeCat);
      const matchText = !query || (item.dataset.text || '').includes(query);
      const visible = matchCat && matchText;
      item.classList.toggle('is-hidden', !visible);
      if (visible) shown += 1;
    });

    if (empty) empty.hidden = shown !== 0;
  };

  group?.addEventListener('click', (e) => {
    const pill = e.target.closest('[data-filter]');
    if (!pill) return;
    group.querySelectorAll('[data-filter]').forEach((p) => p.classList.remove('is-active'));
    pill.classList.add('is-active');
    activeCat = pill.dataset.filter;
    apply();
  });

  input?.addEventListener('input', apply);
  apply();
}

/* ---------- copy email ---------- */
export function initCopyEmail() {
  const btn = document.getElementById('copyEmail');
  if (!btn) return;
  const label = btn.querySelector('span');
  const original = label?.textContent || 'Copy';

  btn.addEventListener('click', async () => {
    const email = btn.dataset.email || '';
    try {
      await navigator.clipboard.writeText(email);
      if (label) label.textContent = 'Copied';
    } catch {
      if (label) label.textContent = email;
    }
    setTimeout(() => { if (label) label.textContent = original; }, 1800);
  });
}

/* ---------- avatar fallback: monogram if the image is missing ---------- */
export function initAvatar(initials = '') {
  const img = document.querySelector('.avatar');
  if (!img) return;

  const swap = () => {
    if (!img.parentNode) return;
    const mono = document.createElement('div');
    mono.className = 'avatar-mono';
    mono.setAttribute('aria-hidden', 'true');
    mono.textContent = initials;
    img.replaceWith(mono);
  };

  if (img.complete && img.naturalWidth === 0) swap();
  img.addEventListener('error', swap, { once: true });
}

/* ---------- footer year ---------- */
export function initYear() {
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

/* ---------- jump to the hash once fragments exist ---------- */
export function honourHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
}
