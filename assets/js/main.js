(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Start ---------- */
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Motyw ---------- */
  const themeBtn = $('[data-theme-toggle]');
  const setTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    // restart animacji ikony
    themeBtn.querySelectorAll('svg').forEach(s => { s.style.animation = 'none'; s.offsetHeight; s.style.animation = ''; });
  };
  const toggleTheme = () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(() => setTheme(next));
    else setTheme(next);
  };
  themeBtn.addEventListener('click', toggleTheme);

  /* ---------- Nawigacja: stan przewinięcia, ukrywanie, postęp ---------- */
  const nav = $('[data-nav]');
  const progress = $('.progress');
  let lastY = scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('is-scrolled', y > 20);
    const goingDown = y > lastY && y > 400;
    nav.classList.toggle('is-hidden', goingDown && !nav.classList.contains('is-open'));
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Menu mobilne ---------- */
  const menuBtn = $('[data-menu-toggle]');
  const closeMenu = () => { nav.classList.remove('is-open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('.nav__links a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Aktywna sekcja + "pigułka" w nawigacji ---------- */
  const links = $$('[data-section-link]');
  const pill = $('.nav__pill');
  const linksWrap = $('.nav__links');

  const movePill = (link) => {
    if (!link) { linksWrap.style.setProperty('--pill-o', 0); return; }
    linksWrap.style.setProperty('--pill-x', `${link.offsetLeft}px`);
    linksWrap.style.setProperty('--pill-w', `${link.offsetWidth}px`);
    linksWrap.style.setProperty('--pill-o', 1);
  };

  let activeLink = null;
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const link = links.find(l => l.dataset.sectionLink === entry.target.id) || null;
      links.forEach(l => l.classList.toggle('is-active', l === link));
      activeLink = link;
      movePill(link);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['top', ...links.map(l => l.dataset.sectionLink)].forEach(id => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
  });
  addEventListener('resize', () => movePill(activeLink));

  links.forEach(l => {
    l.addEventListener('mouseenter', () => movePill(l));
  });
  linksWrap.addEventListener('mouseleave', () => movePill(activeLink));

  /* ---------- Animacje wejścia ---------- */
  const revealEls = $$('.reveal');
  // Delikatne opóźnienie dla elementów w tej samej grupie
  const groups = new Map();
  revealEls.forEach(el => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    groups.set(parent, i + 1);
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => revealObserver.observe(el));

  /* ---------- Liczniki ---------- */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      counterObserver.unobserve(el);
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const start = performance.now();
      const dur = 1600;
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => counterObserver.observe(el));

  /* ---------- Rotator (efekt pisania) ---------- */
  const rotator = $('[data-rotator]');
  if (rotator && !reduceMotion) {
    const words = JSON.parse(rotator.dataset.rotator);
    let wi = 0, ci = words[0].length, deleting = true;
    const tick = () => {
      const word = words[wi];
      if (deleting) {
        ci--;
        rotator.textContent = word.slice(0, ci);
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
        setTimeout(tick, 35);
      } else {
        const next = words[wi];
        ci++;
        rotator.textContent = next.slice(0, ci);
        if (ci === next.length) { deleting = true; setTimeout(tick, 2200); }
        else setTimeout(tick, 70);
      }
    };
    setTimeout(tick, 3200);
  }

  /* ---------- Zegar (czas w Polsce) ---------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
    const update = () => (clock.textContent = fmt.format(new Date()));
    update();
    setInterval(update, 15000);
  }

  /* ---------- Efekty kursora ---------- */
  if (finePointer && !reduceMotion) {
    // Światło w tle
    let mx = innerWidth / 2, my = innerHeight / 3, raf = null;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        root.style.setProperty('--mx', `${mx}px`);
        root.style.setProperty('--my', `${my}px`);
        raf = null;
      });
    }, { passive: true });

    // Podświetlenie kart
    $$('.spotlight-card').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--x', `${e.clientX - r.left}px`);
        card.style.setProperty('--y', `${e.clientY - r.top}px`);
      });
    });

    // Pochylenie 3D
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    // Magnetyczne przyciski
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Toast ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  };

  /* ---------- Kopiowanie e-maila ---------- */
  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email);
      toast('✓ Skopiowano adres e-mail');
    } catch (e) {
      location.href = `mailto:${email}`;
    }
  };
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      copyEmail(btn.dataset.copy);
      const hint = $('[data-copy-hint]', btn);
      if (hint) {
        hint.textContent = 'Skopiowano!';
        setTimeout(() => (hint.textContent = 'Kliknij, aby skopiować'), 2000);
      }
    });
  });

  /* ---------- Paleta poleceń (Ctrl/⌘ + K) ---------- */
  const cmdk = $('[data-cmdk]');
  const input = $('[data-cmdk-input]');
  const list = $('[data-cmdk-list]');
  const email = $('[data-copy]')?.dataset.copy;
  const go = (id) => () => document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

  const commands = [
    { group: 'Nawigacja', icon: '↑', label: 'Start', run: go('top') },
    { group: 'Nawigacja', icon: '◎', label: 'O mnie', run: go('o-mnie') },
    { group: 'Nawigacja', icon: '◆', label: 'Projekty', run: go('projekty') },
    { group: 'Nawigacja', icon: '↗', label: 'Doświadczenie', run: go('doswiadczenie') },
    { group: 'Nawigacja', icon: '✉', label: 'Kontakt', run: go('kontakt') },
    { group: 'Akcje', icon: '◐', label: 'Przełącz motyw', hint: 'jasny / ciemny', run: toggleTheme },
    { group: 'Akcje', icon: '⧉', label: 'Skopiuj e-mail', hint: email, run: () => copyEmail(email) },
    { group: 'Linki', icon: '⌥', label: 'GitHub', hint: 'github.com', run: () => open('https://github.com/przemyslawbudzich', '_blank', 'noopener') },
  ];

  let filtered = commands;
  let selected = 0;
  let lastFocus = null;

  const render = () => {
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<li class="cmdk__empty">Brak wyników</li>';
      return;
    }
    let group = null;
    filtered.forEach((cmd, i) => {
      if (cmd.group !== group) {
        group = cmd.group;
        const g = document.createElement('li');
        g.className = 'cmdk__group';
        g.textContent = group;
        g.setAttribute('role', 'presentation');
        list.appendChild(g);
      }
      const li = document.createElement('li');
      li.className = 'cmdk__item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === selected));
      li.innerHTML = `<span aria-hidden="true">${cmd.icon}</span><span></span>${cmd.hint ? '<small></small>' : ''}`;
      li.children[1].textContent = cmd.label;
      if (cmd.hint) li.querySelector('small').textContent = cmd.hint;
      li.addEventListener('mousemove', () => { if (selected !== i) { selected = i; updateSel(); } });
      li.addEventListener('click', () => runCmd(cmd));
      list.appendChild(li);
    });
  };
  const updateSel = () => {
    $$('.cmdk__item', list).forEach((el, i) => {
      el.setAttribute('aria-selected', String(i === selected));
      if (i === selected) el.scrollIntoView({ block: 'nearest' });
    });
  };
  const openCmdk = () => {
    lastFocus = document.activeElement;
    cmdk.hidden = false;
    input.value = '';
    filtered = commands; selected = 0;
    render();
    input.focus();
    document.body.style.overflow = 'hidden';
  };
  const closeCmdk = () => {
    cmdk.hidden = true;
    document.body.style.overflow = '';
    lastFocus?.focus?.();
  };
  const runCmd = (cmd) => { closeCmdk(); setTimeout(cmd.run, 50); };

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    filtered = commands.filter(c => (c.label + ' ' + c.group + ' ' + (c.hint || '')).toLowerCase().includes(q));
    selected = 0;
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selected = (selected + 1) % Math.max(filtered.length, 1); updateSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = (selected - 1 + filtered.length) % Math.max(filtered.length, 1); updateSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) runCmd(filtered[selected]); }
  });
  $$('[data-cmdk-open]').forEach(b => b.addEventListener('click', openCmdk));
  $$('[data-cmdk-close]').forEach(b => b.addEventListener('click', closeCmdk));

  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cmdk.hidden ? openCmdk() : closeCmdk();
    } else if (e.key === 'Escape') {
      if (!cmdk.hidden) closeCmdk();
      else closeMenu();
    }
  });

  // Na Macu pokaż ⌘ zamiast Ctrl
  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    $$('kbd').forEach(k => { k.textContent = k.textContent.replace('Ctrl', '⌘'); });
  }
})();
