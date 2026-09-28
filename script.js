(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dataSaver = navigator.connection?.saveData === true;
  const hero = document.querySelector('.hero-photo');
  const heroImage = document.querySelector('#hero-image');
  const sea = document.querySelector('.sea-photo');
  const hope = document.querySelector('.hopeful-photo');
  const letter = document.querySelector('#letter');
  const link = document.querySelector('.letter-link');
  const textBlocks = [...document.querySelectorAll('[data-reveal]')];
  const photos = [...document.querySelectorAll('.photograph:not(.hero-photo)')];
  const floatingPhotos = [
    ['.beach-memory', 8], ['.family-memory', 10],
    ['.graduation-photo', 10], ['.family-love', 18], ['.hopeful-photo', 20],
  ].map(([selector, range]) => ({ element: document.querySelector(selector), range }));
  const pendingText = new Set();
  const pendingPhotos = new Set();
  const lastValues = new WeakMap();
  const canMove = () => !reduced.matches && !dataSaver;
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = rect => clamp((innerHeight - rect.top) / (innerHeight + rect.height));
  let frame = 0;
  let textObserver;
  let photoObserver;
  let introTimer;
  let introEnded = false;

  function finishIntro() {
    if (introEnded) return;
    introEnded = true;
    clearTimeout(introTimer);
    if (scrollY > 4 && hero.classList.contains('playing')) {
      hero.classList.add('resuming');
      setTimeout(() => hero.classList.remove('resuming'), 550);
    }
    root.classList.remove('opening-ready', 'opening-playing');
    hero.classList.remove('intro-ready', 'playing');
  }

  // The opening never holds back the page. It is skipped at a restored position.
  if (canMove() && scrollY < 4) {
    root.classList.add('opening-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!introEnded) root.classList.add('opening-playing');
    }));
    introTimer = setTimeout(finishIntro, 1650);
    let heroWindowOpen = true;
    const heroDeadline = setTimeout(() => { heroWindowOpen = false; }, 450);
    const revealHero = () => {
      clearTimeout(heroDeadline);
      if (!heroWindowOpen || introEnded || scrollY > 4 || !heroImage.naturalWidth) return;
      hero.classList.add('intro-ready');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!introEnded) hero.classList.add('playing');
      }));
    };
    if (heroImage.complete) revealHero();
    else heroImage.addEventListener('load', revealHero, { once: true });
  } else introEnded = true;

  function finishBlock(element, instant = false) {
    if (!pendingText.has(element)) return;
    if (!instant) element.classList.add('revealing');
    element.classList.remove('pending');
    pendingText.delete(element);
    textObserver?.unobserve(element);
    if (!instant) setTimeout(() => element.classList.remove('revealing'), 1200);
  }
  function finishPhoto(element, instant = false) {
    if (!pendingPhotos.has(element)) return;
    if (!instant) element.classList.add('photo-entering');
    element.classList.remove('photo-pending');
    pendingPhotos.delete(element);
    photoObserver?.unobserve(element);
    if (!instant) setTimeout(() => element.classList.remove('photo-entering'), 1450);
  }

  if (canMove() && 'IntersectionObserver' in window) {
    textObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) finishBlock(entry.target, entry.boundingClientRect.top < innerHeight * .70);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    photoObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) finishPhoto(entry.target, entry.boundingClientRect.top < innerHeight * .68);
      }
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0 });
    for (const element of textBlocks) {
      if (element.getBoundingClientRect().top > innerHeight * .90) {
        element.classList.add('pending'); pendingText.add(element); textObserver.observe(element);
      }
    }
    for (const element of photos) {
      if (element.getBoundingClientRect().top > innerHeight * .92) {
        element.classList.add('photo-pending'); pendingPhotos.add(element); photoObserver.observe(element);
      }
    }
    root.classList.add('motion-ready');
  }

  function setMotion(element, key, value) {
    let values = lastValues.get(element);
    if (!values) { values = new Map(); lastValues.set(element, values); }
    if (values.get(key) === value) return;
    values.set(key, value);
    element.style.setProperty(key, value);
  }

  function updateScroll() {
    frame = 0;
    if (scrollY > 4) finishIntro();
    for (const element of pendingText) {
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight * .70 || rect.bottom <= 0) finishBlock(element, true);
    }
    for (const element of pendingPhotos) {
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight * .68 || rect.bottom <= 0) finishPhoto(element, true);
    }
    if (!canMove() || document.hidden) return;

    const heroRect = hero.getBoundingClientRect();
    if (heroRect.bottom > 0 && heroRect.top < innerHeight && introEnded) {
      const amount = clamp(-heroRect.top / heroRect.height);
      setMotion(hero, '--hero-y', `${(-6 * amount).toFixed(1)}px`);
      setMotion(hero, '--hero-scale', (1 + .025 * amount).toFixed(3));
    }
    const seaRect = sea.getBoundingClientRect();
    if (seaRect.bottom > -innerHeight && seaRect.top < innerHeight * 2) {
      const amount = progress(seaRect);
      setMotion(sea, '--sea-y', `${(15 - amount * 30).toFixed(1)}px`);
      setMotion(sea, '--sea-scale', (1.012 + Math.sin(amount * Math.PI) * .009).toFixed(3));
    }
    for (const { element, range } of floatingPhotos) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) continue;
      setMotion(element, '--float-y', `${((.5 - progress(rect)) * range).toFixed(1)}px`);
    }
    const hopeRect = hope.getBoundingClientRect();
    if (hopeRect.bottom > -innerHeight && hopeRect.top < innerHeight * 2 && !pendingPhotos.has(hope)) {
      setMotion(hope, '--hope-scale', (1 + .018 * (1 - progress(hopeRect))).toFixed(3));
    }
  }
  function scheduleScroll() { if (!frame) frame = requestAnimationFrame(updateScroll); }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      finishIntro();
      for (const element of [...pendingText]) finishBlock(element, true);
      for (const element of [...pendingPhotos]) finishPhoto(element, true);
    }
    scheduleScroll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      finishIntro();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else scheduleScroll();
  });
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) {
      finishIntro();
      for (const element of [...pendingText]) finishBlock(element, true);
      for (const element of [...pendingPhotos]) finishPhoto(element, true);
      for (const { element } of floatingPhotos) {
        element.style.removeProperty('--float-y');
        lastValues.delete(element);
      }
      for (const [element, keys] of [[hero, ['--hero-y', '--hero-scale']], [sea, ['--sea-y', '--sea-scale']], [hope, ['--hope-scale']]]) {
        for (const key of keys) element.style.removeProperty(key);
        lastValues.delete(element);
      }
    } else scheduleScroll();
  });

  link.addEventListener('click', () => {
    setTimeout(() => letter.focus({ preventScroll: true }), reduced.matches ? 0 : 450);
  });
  document.querySelectorAll('.photograph img').forEach(img => {
    const fail = () => {
      const figure = img.closest('.photograph');
      if (!figure || figure.classList.contains('failed')) return;
      finishPhoto(figure, true);
      figure.classList.add('failed');
      const message = document.createElement('span');
      message.className = 'image-fallback';
      message.setAttribute('role', 'img');
      message.setAttribute('aria-label', img.alt);
      message.textContent = 'This photo could not load.';
      figure.append(message);
      if (img === heroImage) finishIntro();
    };
    if (img.complete && !img.naturalWidth) fail();
    else img.addEventListener('error', fail, { once: true });
  });
  updateScroll();
})();
