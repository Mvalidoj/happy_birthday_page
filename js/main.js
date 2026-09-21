(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const palette = ['#D6A24E', '#D9A796', '#B0603A', '#8A9A78', '#ECCDA4', '#FAF3E8'];
  const audio = document.querySelector('#birthday-audio');
  const intro = document.querySelector('#intro-screen');
  const main = document.querySelector('#main-content');
  const musicToggle = document.querySelector('#music-toggle');
  const liveRegion = document.querySelector('#live-region');
  const balloonLayers = {
    fondo: document.querySelector('.globos-fondo'),
    frente: document.querySelector('.globos-frente')
  };
  const balloonRateDivider = 6;
  const activeBalloons = [];
  const maxBalloons = () => window.innerWidth < 650 ? 10 : 16;
  let scrollFrame = 0;
  let speedReset = null;
  let lastModalTrigger = null;
  let audioContext = null;
  let activePops = 0;
  let poppedBalloons = 0;
  let milestoneShown = false;
  let photoIndex = 0;
  let photoTrigger = null;
  let photoScrollY = 0;
  let photoTouchStartX = 0;

  const burst = (particleCount = 28, spread = 65) => {
    if (prefersReducedMotion || typeof confetti !== 'function') return;
    confetti({ particleCount, spread, startVelocity: 28, origin: { y: .7 }, colors: palette, disableForReducedMotion: true });
  };

  const randomBetween = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;

  const balloonColors = () => {
    const styles = getComputedStyle(document.documentElement);
    return ['--color-rosa', '--color-terracota', '--color-salvia', '--color-miel', '--color-arena', '--tinte-rosa']
      .map((variable) => styles.getPropertyValue(variable).trim());
  };

  const ensureAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  };

  // Crea un pop corto independiente del audio musical de la página.
  const reproducirPop = () => {
    const context = ensureAudioContext();
    if (!context || activePops >= 4) return;
    activePops += 1;
    const now = context.currentTime;
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const oscillator = context.createOscillator();
    const toneGain = context.createGain();
    const noise = context.createBufferSource();
    const buffer = context.createBuffer(1, context.sampleRate * .09, context.sampleRate);
    const data = buffer.getChannelData(0);
    const variation = randomBetween(.8, 1.2);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = randomBetween(900, 1500) * variation;
    filter.Q.value = 1.2;
    noiseGain.gain.setValueAtTime(.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(.001, now + .08);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(randomBetween(540, 660), now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + .11);
    toneGain.gain.setValueAtTime(.16, now);
    toneGain.gain.exponentialRampToValueAtTime(.001, now + .11);
    noise.connect(filter).connect(noiseGain).connect(context.destination);
    oscillator.connect(toneGain).connect(context.destination);
    noise.start(now); noise.stop(now + .09);
    oscillator.start(now); oscillator.stop(now + .12);
    window.setTimeout(() => { activePops -= 1; }, 140);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(15);
  };

  // Lanza fragmentos del color del globo y los limpia tras la animación.
  const crearFragmentos = (rect, color) => {
    for (let index = 0; index < 9; index += 1) {
      const fragment = document.createElement('i');
      fragment.className = 'globo-fragmento';
      fragment.style.left = `${rect.left + rect.width / 2}px`;
      fragment.style.top = `${rect.top + rect.height * .3}px`;
      fragment.style.background = color;
      fragment.style.clipPath = index % 2 ? 'circle(50%)' : 'polygon(50% 0, 100% 100%, 0 100%)';
      document.body.append(fragment);
      gsap.to(fragment, { x: randomBetween(-90, 90), y: randomBetween(-90, 90), rotation: randomBetween(-220, 220), opacity: 0, duration: .6, ease: 'power2.out', force3D: true, onComplete: () => fragment.remove() });
    }
  };

  const mostrarFrase = (rect) => {
    if (!frasesGlobos.length || Math.random() > .2) return;
    const phrase = document.createElement('span');
    phrase.className = 'frase-globo';
    phrase.textContent = frasesGlobos[Math.floor(Math.random() * frasesGlobos.length)];
    phrase.style.left = `${rect.left + rect.width / 2}px`;
    phrase.style.top = `${rect.top + rect.height * .25}px`;
    phrase.style.transform = 'translateX(-50%)';
    document.body.append(phrase);
    gsap.to(phrase, { y: -60, opacity: 0, duration: .8, ease: 'power1.out', force3D: true, onComplete: () => phrase.remove() });
  };

  const registrarGloboReventado = () => {
    poppedBalloons += 1;
    document.querySelector('#balloon-count').textContent = poppedBalloons;
    if (poppedBalloons === 28 && !milestoneShown) {
      milestoneShown = true;
      if (typeof confetti === 'function') confetti({ particleCount: 160, spread: 110, startVelocity: 42, origin: { y: .65 }, colors: balloonColors(), disableForReducedMotion: true });
      const milestone = document.createElement('div');
      milestone.className = 'balloon-milestone';
      milestone.textContent = '¡28 globos para María Karla!';
      document.body.append(milestone);
      gsap.fromTo(milestone, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: .3, force3D: true });
      window.setTimeout(() => gsap.to(milestone, { opacity: 0, y: -12, duration: .4, onComplete: () => milestone.remove(), force3D: true }), 3200);
    }
  };

  // Retira el globo y conserva el mismo mecanismo de reposición del generador.
  const removeBalloon = (balloon) => {
    if (!balloon || balloon.released) return;
    balloon.released = true;
    balloon.travel.kill();
    balloon.wiggle.kill();
    balloon.element.remove();
    const index = activeBalloons.indexOf(balloon);
    if (index !== -1) activeBalloons.splice(index, 1);
    if (!document.hidden) window.setTimeout(() => spawnBalloon('fondo'), 350);
  };

  // Explota una sola vez, con una versión reducida para movimiento reducido.
  const explotarGlobo = (balloon, event) => {
    if (balloon.exploded || balloon.released) return;
    balloon.exploded = true;
    balloon.wiggle.kill();
    gsap.killTweensOf(balloon.element);
    const rect = balloon.element.getBoundingClientRect();
    reproducirPop();
    registrarGloboReventado();
    if (!prefersReducedMotion) {
      crearFragmentos(rect, balloon.color);
      mostrarFrase(rect);
      if (typeof confetti === 'function') confetti({ particleCount: Math.floor(randomBetween(20, 31)), spread: 70, origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }, colors: balloonColors(), disableForReducedMotion: true });
    }
    gsap.to(balloon.element, { scale: prefersReducedMotion ? .8 : 1.25, duration: prefersReducedMotion ? .05 : .08, ease: 'power2.out', force3D: true, onComplete: () => gsap.to(balloon.element, { scale: 0, opacity: 0, duration: prefersReducedMotion ? .08 : .1, ease: 'power2.in', force3D: true, onComplete: () => removeBalloon(balloon) }) });
  };

  const spawnBalloon = (layerName = 'fondo', startOnScreen = false) => {
    if (document.hidden || typeof gsap === 'undefined' || activeBalloons.length >= maxBalloons()) return;
    const layer = balloonLayers[layerName];
    if (!layer) return;
    const colors = balloonColors();
    const balloon = document.createElement('span');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    const knot = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const string = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const width = randomBetween(40, window.innerWidth < 650 ? 90 : 115);
    const height = width * 1.5;

    balloon.className = 'globo';
    balloon.setAttribute('aria-hidden', 'true');
    balloon.style.left = `${randomBetween(2, 96)}%`;
    balloon.style.width = `${width}px`;
    balloon.style.opacity = randomBetween(.75, 1).toFixed(2);
    svg.setAttribute('viewBox', '0 0 100 150');
    svg.setAttribute('aria-hidden', 'true');
    body.setAttribute('class', 'globo-cuerpo');
    body.setAttribute('cx', '50'); body.setAttribute('cy', '42'); body.setAttribute('rx', '31'); body.setAttribute('ry', '40'); body.setAttribute('fill', color);
    highlight.setAttribute('class', 'globo-brillo');
    highlight.setAttribute('cx', '39'); highlight.setAttribute('cy', '23'); highlight.setAttribute('rx', '7'); highlight.setAttribute('ry', '12');
    knot.setAttribute('class', 'globo-nudo'); knot.setAttribute('d', 'M44 80 L50 91 L56 80 Z'); knot.setAttribute('fill', color);
    string.setAttribute('class', 'globo-hilo'); string.setAttribute('d', 'M50 90 C40 105 60 115 48 130 S54 142 48 150');
    svg.append(body, highlight, knot, string);
    balloon.append(svg);
    layer.append(balloon);

    if (startOnScreen) gsap.set(balloon, { y: randomBetween(-window.innerHeight * .8, 0), force3D: true });
    const travel = prefersReducedMotion ? gsap.timeline({ paused: true }) : gsap.to(balloon, {
      y: -(window.innerHeight + height + 180),
      duration: randomBetween(8, 16),
      ease: 'none',
      force3D: true,
      onComplete: () => removeBalloon(active)
    });
    const wiggle = prefersReducedMotion ? gsap.timeline({ paused: true }) : gsap.to(svg, { x: randomBetween(-24, 24), rotation: randomBetween(-5, 5), duration: randomBetween(1.8, 3.2), repeat: -1, yoyo: true, ease: 'sine.inOut', force3D: true });
    const active = { element: balloon, travel, wiggle, color, exploded: false, released: false };
    activeBalloons.push(active);
    balloon.addEventListener('pointerdown', (event) => explotarGlobo(active, event));
    balloon.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') gsap.to(balloon, { scale: 1.08, duration: .18, ease: 'power2.out', overwrite: true, force3D: true }); });
    balloon.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') gsap.to(balloon, { scale: 1, duration: .18, ease: 'power2.out', overwrite: true, force3D: true }); });
  };

  const balloonBurst = (amount) => {
    if (prefersReducedMotion || document.hidden) return;
    const reducedAmount = Math.max(1, Math.ceil(amount / balloonRateDivider));
    for (let index = 0; index < reducedAmount && activeBalloons.length < maxBalloons(); index += 1) {
      spawnBalloon(index % 4 === 0 ? 'frente' : 'fondo');
    }
  };

  const updateBalloonSpeed = (scrollVelocity) => {
    if (prefersReducedMotion) return;
    const timeScale = Math.min(2.8, 1 + scrollVelocity / 900);
    activeBalloons.forEach(({ travel }) => gsap.to(travel, { timeScale, duration: .25, overwrite: true }));
    if (speedReset) speedReset.kill();
    speedReset = gsap.delayedCall(.45, () => activeBalloons.forEach(({ travel }) => gsap.to(travel, { timeScale: 1, duration: .5, overwrite: true })));
  };

  const initBalloons = () => {
    if (typeof gsap === 'undefined') return;
    const initialAmount = Math.max(1, Math.ceil(4 / balloonRateDivider));
    for (let index = 0; index < initialAmount; index += 1) spawnBalloon(index === 0 ? 'frente' : 'fondo', true);
    window.addEventListener('scroll', () => {
      if (document.hidden || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        const now = performance.now();
        const currentScroll = window.scrollY;
        const elapsed = Math.max(16, now - (initBalloons.lastScrollTime || now));
        const velocity = Math.abs(currentScroll - (initBalloons.lastScrollY || currentScroll)) / elapsed * 1000;
        initBalloons.lastScrollY = currentScroll;
        initBalloons.lastScrollTime = now;
        scrollFrame = 0;
        updateBalloonSpeed(velocity);
        if (velocity > 220) balloonBurst(Math.min(3, Math.ceil(velocity / 700)));
      });
    }, { passive: true });
  };

  const renderPoem = () => {
    document.querySelector('#poem-lines').innerHTML = poemaBienvenida.map((line) => `<span>${line}</span>`).join('');
  };

  const renderFriends = () => {
    const grid = document.querySelector('#friends-grid');
    grid.innerHTML = amigos.map((friend, index) => {
      const isLong = friend.mensaje.length > 112;
      const preview = isLong ? `${friend.mensaje.slice(0, 112).trim()}…` : friend.mensaje;
      return `<article class="friend-card" data-card-index="${index}"><div class="friend-photo"><img src="${friend.foto}" alt="Retrato de ${friend.nombre}" loading="lazy"></div><div><h3>${friend.nombre}</h3><p>${preview}</p>${isLong ? `<button class="read-more" type="button" data-message-index="${index}">Leer más</button>` : ''}</div></article>`;
    }).join('');
  };

  const renderGallery = () => {
    const grid = document.querySelector('#gallery-grid');
    grid.innerHTML = fotosGrupales.map((entry, index) => {
      const photo = typeof entry === 'string' ? { src: entry, alt: 'Foto grupal', pie: '' } : entry;
      return `<button class="gallery-item" type="button" data-photo-index="${index}" aria-label="Abrir foto: ${photo.alt}"><img src="${photo.src}" alt="${photo.alt}" width="800" height="600" loading="lazy"></button>`;
    }).join('');
    const images = [...grid.querySelectorAll('img')];
    Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => image.addEventListener('load', resolve, { once: true })))).then(() => {
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    });
  };

  const normalizePhoto = (entry) => typeof entry === 'string' ? { src: entry, alt: 'Foto grupal', pie: '' } : entry;

  const preloadPhoto = (index) => {
    const photo = fotosGrupales[index];
    if (!photo) return;
    const image = new Image();
    image.src = normalizePhoto(photo).src;
  };

  const updatePhotoViewer = () => {
    const photo = normalizePhoto(fotosGrupales[photoIndex]);
    const image = document.querySelector('#photo-modal-image');
    image.src = photo.src;
    image.alt = photo.alt;
    document.querySelector('#photo-modal-caption').textContent = photo.pie || '';
    document.querySelector('#photo-counter').textContent = `${photoIndex + 1} / ${fotosGrupales.length}`;
    document.querySelector('#photo-prev').disabled = fotosGrupales.length < 2;
    document.querySelector('#photo-next').disabled = fotosGrupales.length < 2;
    preloadPhoto((photoIndex - 1 + fotosGrupales.length) % fotosGrupales.length);
    preloadPhoto((photoIndex + 1) % fotosGrupales.length);
  };

  const abrirVisor = (index, trigger) => {
    photoIndex = index;
    photoTrigger = trigger;
    photoScrollY = window.scrollY;
    const modal = document.querySelector('#photo-modal');
    modal.hidden = false;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${photoScrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.add('no-scroll');
    updatePhotoViewer();
    if (prefersReducedMotion) gsap.set('.photo-viewer', { opacity: 1 });
    else gsap.fromTo('.photo-viewer', { opacity: 0, scale: .8, rotation: -5 }, { opacity: 1, scale: 1, rotation: 0, duration: .65, ease: 'back.out(1.4)' });
    document.querySelector('#photo-modal-close').focus();
  };

  const cerrarVisor = () => {
    const modal = document.querySelector('#photo-modal');
    const finish = () => {
      modal.hidden = true;
      document.body.classList.remove('no-scroll');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, photoScrollY);
      if (photoTrigger) photoTrigger.focus();
    };
    if (prefersReducedMotion) finish();
    else gsap.to('.photo-viewer', { opacity: 0, scale: .8, rotation: 3, duration: .25, onComplete: finish });
  };

  const navegarVisor = (direction) => {
    if (fotosGrupales.length < 2) return;
    photoIndex = (photoIndex + direction + fotosGrupales.length) % fotosGrupales.length;
    updatePhotoViewer();
    if (!prefersReducedMotion) gsap.fromTo('.polaroid', { opacity: .55, x: direction * 18 }, { opacity: 1, x: 0, duration: .25, ease: 'power2.out', force3D: true });
  };

  const trapPhotoFocus = (event) => {
    const modal = document.querySelector('#photo-modal');
    if (modal.hidden || event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled])')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const loadMessages = async () => {
    await Promise.all(amigos.map(async (friend) => {
      const response = await fetch(friend.mensaje);
      if (!response.ok) throw new Error(`No se pudo cargar ${friend.mensaje}`);
      friend.mensaje = (await response.text()).trim();
    }));
  };

  const openMessage = (index, trigger) => {
    const modal = document.querySelector('#message-modal');
    document.querySelector('#modal-title').textContent = amigos[index].nombre;
    document.querySelector('#modal-message').textContent = amigos[index].mensaje;
    lastModalTrigger = trigger;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    document.querySelector('#modal-close').focus();
  };

  const closeMessage = () => {
    const modal = document.querySelector('#message-modal');
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastModalTrigger) lastModalTrigger.focus();
  };

  const animatePage = () => {
    main.classList.remove('is-hidden');
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    const titleLetters = document.querySelector('#hero-title');
    const firstLine = 'Feliz cumpleaños,';
    const secondLine = 'María Karla';
    const letters = (line) => [...line].map((letter) => letter === ' ' ? ' ' : `<span class="hero-letter">${letter}</span>`).join('');
    titleLetters.innerHTML = `${letters(firstLine)}<br><span>${letters(secondLine)}</span>`;
    gsap.from('.hero-letter', { y: 35, opacity: 0, stagger: .035, duration: .7, ease: 'back.out(1.5)' });
    gsap.from('.age-number', { scale: 0, rotation: -12, duration: 1.1, delay: .45, ease: 'bounce.out' });
    gsap.from('.poem-lines span', { scrollTrigger: { trigger: '#poema', start: 'top 75%' }, y: 25, opacity: 0, stagger: .22, duration: .7, ease: 'power2.out' });
    ['#poema', '#deseo', '#juntos', '#carta'].forEach((sectionSelector) => {
      ScrollTrigger.create({
        trigger: sectionSelector,
        start: 'top 78%',
        once: true,
        onEnter: () => { burst(18, 55); balloonBurst(Math.floor(randomBetween(3, 6))); }
      });
    });
    gsap.utils.toArray('.friend-card').forEach((card, index) => {
      const effects = [{ x: -65, rotation: -6 }, { y: 55, rotation: 3 }, { x: 65, rotation: 6 }, { scale: .7, rotation: -8 }, { y: -45, rotation: 4 }, { x: -45, rotation: 7 }];
      gsap.from(card, { scrollTrigger: { trigger: card, start: 'top 86%', once: true, onEnter: () => { burst(14, 48); balloonBurst(3); } }, ...effects[index % effects.length], opacity: 0, duration: .8, ease: 'back.out(1.3)' });
    });
    if (!prefersReducedMotion) gsap.to('.sun', { y: 35, scrollTrigger: { trigger: '.hero', scrub: true, start: 'top top', end: 'bottom top' } });
    ScrollTrigger.batch('.gallery-item', { start: 'top 88%', once: true, onEnter: (items) => { gsap.from(items, { y: 25, opacity: 0, stagger: .12, duration: .6 }); burst(18, 55); } });
  };

  const startSurprise = () => {
    intro.classList.add('is-opening');
    if (typeof gsap !== 'undefined') gsap.to(intro, { opacity: 0, duration: .8, onComplete: () => { intro.remove(); } }); else intro.remove();
    animatePage();
    initBalloons();
    audio.volume = .45;
    audio.play().then(() => updateMusicButton(true)).catch(() => updateMusicButton(false));
    burst(70, 90);
  };

  const updateMusicButton = (isPlaying) => {
    musicToggle.setAttribute('aria-pressed', String(isPlaying));
    musicToggle.setAttribute('aria-label', isPlaying ? 'Pausar música' : 'Activar música');
    musicToggle.textContent = isPlaying ? 'Ⅱ' : '♪';
  };

  document.querySelector('#open-gift').addEventListener('click', () => { ensureAudioContext(); startSurprise(); });
  musicToggle.addEventListener('click', () => { if (audio.paused) { audio.play().then(() => updateMusicButton(true)); } else { audio.pause(); updateMusicButton(false); } });
  document.querySelector('#friends-grid').addEventListener('click', (event) => { const button = event.target.closest('[data-message-index]'); if (button) openMessage(Number(button.dataset.messageIndex), button); });
  document.querySelector('#gallery-grid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-photo-index]');
    if (button) abrirVisor(Number(button.dataset.photoIndex), button);
  });
  document.querySelector('#modal-close').addEventListener('click', closeMessage);
  document.querySelector('[data-close-modal]').addEventListener('click', closeMessage);
  document.querySelector('#photo-modal-close').addEventListener('click', cerrarVisor);
  document.querySelector('[data-close-photo-modal]').addEventListener('click', cerrarVisor);
  document.querySelector('#photo-prev').addEventListener('click', () => navegarVisor(-1));
  document.querySelector('#photo-next').addEventListener('click', () => navegarVisor(1));
  document.querySelector('#photo-modal').addEventListener('touchstart', (event) => { photoTouchStartX = event.changedTouches[0].clientX; }, { passive: true });
  document.querySelector('#photo-modal').addEventListener('touchend', (event) => {
    const distance = event.changedTouches[0].clientX - photoTouchStartX;
    if (Math.abs(distance) > 45) navegarVisor(distance < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', (event) => {
    const modal = document.querySelector('#message-modal');
    const photoModal = document.querySelector('#photo-modal');
    if (!modal.hidden) {
      if (event.key === 'Escape') closeMessage();
      if (event.key === 'Tab') {
        const focusable = modal.querySelectorAll('button');
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
        if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
      }
      return;
    }
    if (!photoModal.hidden) {
      if (event.key === 'Escape') cerrarVisor();
      if (event.key === 'ArrowLeft') navegarVisor(-1);
      if (event.key === 'ArrowRight') navegarVisor(1);
      trapPhotoFocus(event);
    }
  });
  document.querySelector('#cake-button').addEventListener('click', (event) => { const button = event.currentTarget; if (button.classList.contains('blown')) return; button.classList.add('blown'); document.querySelector('#wish-message').textContent = '¡Deseo enviado con la próxima ola!'; liveRegion.textContent = 'Las velas se han apagado'; burst(120, 100); });
  document.querySelector('#envelope').addEventListener('click', (event) => { const envelope = event.currentTarget; const paper = document.querySelector('#letter-paper'); envelope.classList.toggle('is-open'); const isOpen = envelope.classList.contains('is-open'); envelope.setAttribute('aria-expanded', String(isOpen)); if (isOpen) { paper.hidden = false; document.querySelector('#dedication').textContent = dedicatoria; if (typeof gsap !== 'undefined') gsap.from(paper, { y: 20, opacity: 0, duration: .7 }); } });
  window.addEventListener('resize', () => { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); });
  window.addEventListener('orientationchange', () => { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); });

  if (!prefersReducedMotion) {
    let lastSpark = 0;
    document.addEventListener('pointermove', (event) => { const now = performance.now(); if (now - lastSpark < 100) return; lastSpark = now; const spark = document.createElement('i'); spark.className = 'spark'; spark.style.left = `${event.clientX}px`; spark.style.top = `${event.clientY}px`; document.body.append(spark); if (typeof gsap !== 'undefined') gsap.to(spark, { y: -16, scale: 0, opacity: 0, duration: .55, onComplete: () => spark.remove() }); else setTimeout(() => spark.remove(), 600); });
  }

  const initializePage = async () => {
    let messagesReady = true;
    try {
      await loadMessages();
    } catch (error) {
      messagesReady = false;
      console.error('No se pudieron cargar los mensajes. Abre la página desde un servidor local o GitHub Pages.', error);
    }
    renderPoem();
    if (messagesReady) {
      renderFriends();
    } else {
      document.querySelector('#friends-grid').innerHTML = '<p class="message-loading-error">No se pudieron cargar los mensajes. Comprueba que la página se está ejecutando desde GitHub Pages o un servidor local.</p>';
    }
    renderGallery(); updateMusicButton(false);
  };

  initializePage();
})();
