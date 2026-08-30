/* =========================================================
   PORTFOLIO — LUIS PEREIRA

   1. escala global (--s)
   2. cenario: ceu fixo + relvado preso ao fundo do ecra que
      "aterra" quando o boneco chega ao PORTUGAL
   3. letras individuais reactivas em todos os titulos
   4. sol (glifo X) acende as letras do hero por onde passa
   5. pixeis do header: aleatorios, com menos densidade,
      a mudar de segundo a segundo enquanto o rato la esta
   6. molduras xadrez de 2 quadrados, sem cortes
   7. Matter.js no sol e no smiley; boneco arrastavel com mola
   ========================================================= */
(function () {
  'use strict';

  var WIPE_ON   = false;   // transicao de pixeis entre hero e works (desligada)
  var DESIGN_W  = 1920;
  var GRASS_VIS = 0.20;    // fraccao do ecra ocupada pelo relvado
  var FEET_Y    = 1645;    // onde os pes do boneco param (unidades do Figma)
  var COLS = 18, ROWS = 9, DISPERSAO = 0.35;

  var MOBILE  = function () { return window.matchMedia('(max-width: 860px)').matches; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var scale = 1;

  var hero  = document.getElementById('home');
  var sky   = document.getElementById('sky');
  var band  = document.getElementById('grassband');
  var rider = document.querySelector('.pix--rider');

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function setScale() {
    scale = root.clientWidth / DESIGN_W;
    root.style.setProperty('--s', scale + 'px');
  }
  setScale();

  /* ---------------------------------------------------------
     1. LAYOUT DO HERO E DO RELVADO
        O hero tem exactamente a altura que faz o boneco parar
        sobre o PORTUGAL: heroH = (FEET_Y - 19) * s + visivel
     --------------------------------------------------------- */
  var L = { vh: 0, visible: 0, heroH: 0, bandH: 0, stop: 0 };

  function layout() {
    if (!band || !hero) return;
    L.vh = window.innerHeight;
    L.bandH = root.clientWidth * 526 / 1920;          // altura natural do relvado.png
    L.visible = Math.round(Math.min(L.vh * GRASS_VIS, L.bandH));
    band.style.setProperty('--grass-h', L.visible + 'px');

    if (MOBILE()) {
      hero.style.height = '';
      band.style.removeProperty('--grass-top');
      band.style.setProperty('--grass-ease', '0px');
      band.classList.remove('is-landed');
      L.heroH = hero.offsetHeight;
      L.stop = Infinity;
      return;
    }
    L.heroH = Math.round((FEET_Y - 19) * scale + L.visible);
    hero.style.height = L.heroH + 'px';
    band.style.setProperty('--grass-top', (L.heroH - L.visible) + 'px');
    L.stop = L.heroH - L.vh;
  }

  /* ---------------------------------------------------------
     2. SCROLL: cor do texto + aterragem do relvado
     --------------------------------------------------------- */
  var INK_A = [0x26, 0x26, 0x26], INK_B = [0xf9, 0xff, 0xf9];
  var lastInk = -1, landed = false, lastEase = -1;

  function scene() {
    var y = window.scrollY;

    var t = clamp(y / (L.vh * 0.55 || 500), 0, 1);
    var q = Math.round(t * 100);
    if (q !== lastInk) {
      lastInk = q;
      root.style.setProperty('--hero-ink', 'rgb(' +
        Math.round(lerp(INK_A[0], INK_B[0], t)) + ',' +
        Math.round(lerp(INK_A[1], INK_B[1], t)) + ',' +
        Math.round(lerp(INK_A[2], INK_B[2], t)) + ')');
    }

    if (!band) return;
    var isLanded = y >= L.stop;
    if (isLanded !== landed) { landed = isLanded; band.classList.toggle('is-landed', isLanded); }

    /* travagem amortecida: na ultima meia-tela antes de aterrar o relvado
       abranda progressivamente ate ficar parado na pagina, em vez de passar
       de "colado ao ecra" para "parado" de um golpe.
       ease = k * N * u^2 * (1-u)  ->  velocidade relativa passa de 1 a 1-k */
    var ez = 0;
    if (!landed && L.stop !== Infinity) {
      var N = L.vh * 0.5, u = clamp((y - (L.stop - N)) / N, 0, 1);
      ez = 0.85 * N * u * u * (1 - u);
    }
    if (ez !== lastEase) { lastEase = ez; band.style.setProperty('--grass-ease', ez.toFixed(1) + 'px'); }
  }

  /* ---------------------------------------------------------
     3. LETRAS INDIVIDUAIS
     --------------------------------------------------------- */
  var TITLES = '.hero__hi, .hero__name, .hero__iam, .hero__role, .hero__basedin,' +
               '.hero__country, .works__title, .card__title, .about__title, .contact__mail';

  function splitLetters() {
    [].slice.call(document.querySelectorAll(TITLES)).forEach(function (el) {
      if (el.dataset.split) return;
      el.dataset.split = '1';
      var text = el.textContent;
      el.textContent = '';
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'w';
        part.split('').forEach(function (c) {
          var sp = document.createElement('span');
          sp.className = 'ch';
          sp.textContent = c;
          w.appendChild(sp);
        });
        el.appendChild(w);
      });
    });
  }

  /* ---------------------------------------------------------
     4. O SOL ACENDE AS LETRAS DO HERO
        Rectangulos das letras em coordenadas de pagina, em cache;
        so o rectangulo do sol e lido a cada frame.
     --------------------------------------------------------- */
  var litCells = [], sunItem = null;

  function cacheLit() {
    litCells = [].slice.call(document.querySelectorAll('.hero__hi .ch, .hero__name .ch'))
      .map(function (el) {
        var r = el.getBoundingClientRect();
        return { el: el, on: false,
                 l: r.left, r: r.right,
                 t: r.top + window.scrollY, b: r.bottom + window.scrollY };
      });
  }

  function litUpdate() {
    if (!sunItem || !litCells.length) return;
    var p = sunItem.body.position, hw = sunItem.w / 2, hh = sunItem.h / 2;
    var l = p.x - hw, r = p.x + hw, t = p.y - hh, b = p.y + hh;   // ja em coords de pagina
    for (var i = 0; i < litCells.length; i++) {
      var c = litCells[i];
      var hit = !(r < c.l || l > c.r || b < c.t || t > c.b);
      if (hit !== c.on) { c.on = hit; c.el.classList.toggle('is-lit', hit); }
    }
  }

  /* ---------------------------------------------------------
     5. PIXEIS DO HEADER
        Menos densidade, novo sorteio de segundo a segundo
        enquanto o rato esta no header, com fade suave.
     --------------------------------------------------------- */
  var navPix = [], navPixBound = false, navHover = false, navRAF = 0, lastShuffle = 0;
  var FADE = 0.055;          // suavidade da passagem entre sorteios
  var SHUFFLE_MS = 1000;

  function buildNavPix() {
    navPix.length = 0;
    [].slice.call(document.querySelectorAll('.nav__pix')).forEach(function (cv) {
      var box = cv.getBoundingClientRect();
      var cell = Math.max(6, MOBILE() ? 11 : 17 * scale);
      var cols = Math.max(4, Math.round(box.width / cell));
      var rows = Math.max(2, Math.round(box.height / cell));
      cv.width = cols; cv.height = rows;
      var ctx = cv.getContext('2d');
      var right = cv.dataset.side === 'right';
      var n = cols * rows;
      var cur = new Float32Array(n), tgt = new Float32Array(n);

      function density(c) {
        var d = right ? (c + 1) / cols : 1 - c / cols;
        return Math.pow(clamp(d, 0, 1), 3.1) * 0.62;   // mais vazios
      }
      function shuffle(boost) {
        for (var r = 0; r < rows; r++)
          for (var c = 0; c < cols; c++)
            tgt[r * cols + c] = Math.random() < density(c) * (boost || 1) ? 1 : 0;
      }
      function draw() {
        ctx.clearRect(0, 0, cols, rows);
        for (var i = 0; i < n; i++) {
          if (cur[i] < 0.02) continue;
          ctx.fillStyle = 'rgba(38,38,38,' + cur[i].toFixed(3) + ')';
          ctx.fillRect(i % cols, (i / cols) | 0, 1, 1);
        }
      }
      shuffle(); cur.set(tgt); draw();
      navPix.push({ cv: cv, cols: cols, rows: rows, cur: cur, tgt: tgt, n: n, shuffle: shuffle, draw: draw });
    });

    var nav = document.getElementById('nav');
    if (!nav || navPixBound) return;
    navPixBound = true;

    nav.addEventListener('pointerenter', function () {
      navHover = true;
      lastShuffle = performance.now();
      navPix.forEach(function (p) { p.shuffle(1.35); });   // sorteio imediato
      if (!navRAF) navRAF = requestAnimationFrame(navTick);
    });
    nav.addEventListener('pointerleave', function () {
      navHover = false;
      navPix.forEach(function (p) { p.shuffle(); });        // volta ao repouso
      if (!navRAF) navRAF = requestAnimationFrame(navTick);
    });
  }

  function navTick(now) {
    navRAF = 0;
    if (navHover && now - lastShuffle >= SHUFFLE_MS) {
      lastShuffle = now;
      navPix.forEach(function (p) { p.shuffle(1.35); });
    }
    var moving = false;
    navPix.forEach(function (p) {
      var changed = false;
      for (var i = 0; i < p.n; i++) {
        var d = p.tgt[i] - p.cur[i];
        if (Math.abs(d) > 0.004) { p.cur[i] += d * FADE * 6; changed = true; }
        else if (p.cur[i] !== p.tgt[i]) { p.cur[i] = p.tgt[i]; changed = true; }
      }
      if (changed) { p.draw(); moving = true; }
    });
    if (navHover || moving) navRAF = requestAnimationFrame(navTick);
  }

  /* ---------------------------------------------------------
     5b. PILHA DOS WORKS
        O painel fica preso ao ecra durante (N-1) x SPC de scroll.
        j = quantos cards ja chegaram (continuo). O card mais recente
        fica centrado; os anteriores empilham-se GAP acima, saindo do
        ecra por cima; os seguintes esperam por baixo da dobra.
     --------------------------------------------------------- */
  var stack = document.getElementById('stack');
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var SPC = 800, GAP = 240, stackTop = 0;

  function stackLayout() {
    if (!stack || !cards.length) return;
    if (MOBILE()) { stack.style.height = ''; cards.forEach(function (c) { c.style.transform = ''; }); return; }
    SPC = Math.round(window.innerHeight * 0.8);
    stack.style.height = ((cards.length - 1) * SPC + window.innerHeight) + 'px';
    stackTop = stack.getBoundingClientRect().top + window.scrollY;   // coords de pagina
  }

  function stackScroll() {
    if (!stack || !cards.length || MOBILE()) return;
    var vh = window.innerHeight;
    var navH = 68 * scale;
    var j = clamp((window.scrollY - stackTop) / SPC, 0, cards.length - 1);
    var gap = GAP * scale;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var h = c.offsetHeight;
      var C = Math.max(navH * 0.4, navH + (vh - navH - h) / 2);
      var d = j - i;
      var enter = vh - C + 40;
      var y = d >= 0 ? C - d * gap : C + (-d) * enter;
      c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(var(--tilt))';
    }
  }

  /* ---------------------------------------------------------
     6. MOLDURAS XADREZ (anel de 2 quadrados, sem cortes)
     --------------------------------------------------------- */
  function fitFrames() {
    [].slice.call(document.querySelectorAll('.pxframe')).forEach(function (el) {
      var target = MOBILE() ? 8 : 14 * scale;
      var w = el.offsetWidth;
      if (!w) return;
      var n = Math.max(8, Math.round(w / target));
      if (n % 2) n++;                              // par: o xadrez fecha certo
      var sq = w / n;
      el.style.setProperty('--sq', sq + 'px');
      el.style.padding = (sq * 2) + 'px';
      for (var pass = 0; pass < 2; pass++) {
        var h = el.offsetHeight;
        var extra = Math.ceil(h / (sq * 2)) * (sq * 2) - h;
        el.style.paddingBottom = (sq * 2 + extra) + 'px';
      }
    });
  }

  /* ---------------------------------------------------------
     7. MATTER.JS — sol e smiley
     --------------------------------------------------------- */
  var physics = { engine: null, items: [], world: null, active: false };
  function glyphs() { return [].slice.call(document.querySelectorAll('#physics .pix')); }

  function placeGlyphs() {
    glyphs().forEach(function (el) {
      var w = parseFloat(el.dataset.w) * scale, h = parseFloat(el.dataset.h) * scale;
      var x = parseFloat(el.dataset.x) * scale, y = parseFloat(el.dataset.y) * scale;
      el.style.transformOrigin = 'center';
      el.style.transform = 'translate3d(' + (x - w / 2) + 'px,' + (y - h / 2) + 'px,0) rotate(' +
        (parseFloat(el.dataset.rot) || 0) + 'deg)';
    });
  }

  function buildPhysics() {
    if (typeof Matter === 'undefined' || !hero || MOBILE()) return;
    var Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies;
    physics.engine = Engine.create();
    physics.engine.gravity.x = 0; physics.engine.gravity.y = 0;
    physics.world = physics.engine.world;

    var W = hero.clientWidth, H = hero.clientHeight, t = 400;
    World.add(physics.world, [
      Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, { isStatic: true })
    ]);

    sunItem = null;
    physics.items = glyphs().map(function (el) {
      var r = el.getBoundingClientRect();
      var w = r.width || parseFloat(el.dataset.w) * scale;
      var h = r.height || parseFloat(el.dataset.h) * scale;
      var body = Bodies.rectangle(
        parseFloat(el.dataset.x) * scale, parseFloat(el.dataset.y) * scale, w, h,
        { restitution: 0.62, frictionAir: 0.035, friction: 0.05, density: 0.0015,
          angle: (parseFloat(el.dataset.rot) || 0) * Math.PI / 180 });
      World.add(physics.world, body);
      el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.transformOrigin = 'center';
      var item = { el: el, body: body, w: w, h: h };
      if (el.textContent.trim() === 'X') sunItem = item;
      return item;
    });

    attachDrag();
    physics.active = true;
  }

  function attachDrag() {
    physics.items.forEach(function (it) {
      if (it.el.dataset.drag) return;
      it.el.dataset.drag = '1';
      var last = null, lastT = 0, vx = 0, vy = 0, offX = 0, offY = 0, dragging = false;

      it.el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        dragging = true;
        it.el.setPointerCapture(e.pointerId);
        it.el.classList.add('is-dragging');
        var host = it.el.parentElement.getBoundingClientRect();
        offX = it.body.position.x - (e.clientX - host.left);
        offY = it.body.position.y - (e.clientY - host.top);
        last = { x: e.clientX, y: e.clientY }; lastT = performance.now();
        Matter.Body.setStatic(it.body, true);
      });
      it.el.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var host = it.el.parentElement.getBoundingClientRect();
        var now = performance.now(), dt = Math.max(now - lastT, 8);
        vx = (e.clientX - last.x) / dt * 14; vy = (e.clientY - last.y) / dt * 14;
        last = { x: e.clientX, y: e.clientY }; lastT = now;
        Matter.Body.setPosition(it.body, { x: e.clientX - host.left + offX, y: e.clientY - host.top + offY });
      });
      function release(e) {
        if (!dragging) return;
        dragging = false;
        it.el.classList.remove('is-dragging');
        try { it.el.releasePointerCapture(e.pointerId); } catch (err) {}
        Matter.Body.setStatic(it.body, false);
        Matter.Body.setVelocity(it.body, { x: vx, y: vy });
        Matter.Body.setAngularVelocity(it.body, (vx + vy) * 0.004);
      }
      it.el.addEventListener('pointerup', release);
      it.el.addEventListener('pointercancel', release);
    });
  }

  function renderPhysics() {
    for (var i = 0; i < physics.items.length; i++) {
      var it = physics.items[i], p = it.body.position;
      it.el.style.transform = 'translate3d(' + (p.x - it.w / 2) + 'px,' + (p.y - it.h / 2) + 'px,0) rotate(' + it.body.angle + 'rad)';
    }
    litUpdate();
  }

  function destroyPhysics() {
    if (!physics.world) return;
    Matter.World.clear(physics.world, false);
    Matter.Engine.clear(physics.engine);
    physics.items.forEach(function (it) { it.el.style.transform = ''; });
    physics.items = []; physics.active = false; sunItem = null;
  }

  /* ---------------------------------------------------------
     8. BONECO — arrastavel, volta ao lugar com mola
     --------------------------------------------------------- */
  function riderDrag() {
    if (!rider) return;
    var dragging = false, sx = 0, sy = 0;
    rider.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      rider.setPointerCapture(e.pointerId);
      rider.classList.add('is-dragging');
    });
    rider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      rider.style.setProperty('--rx', (e.clientX - sx) + 'px');
      rider.style.setProperty('--ry', (e.clientY - sy) + 'px');
    });
    function back(e) {
      if (!dragging) return;
      dragging = false;
      rider.classList.remove('is-dragging');
      try { rider.releasePointerCapture(e.pointerId); } catch (err) {}
      rider.style.setProperty('--rx', '0px');
      rider.style.setProperty('--ry', '0px');
    }
    rider.addEventListener('pointerup', back);
    rider.addEventListener('pointercancel', back);
  }

  /* ---------------------------------------------------------
     9. PASTA DOS WORKS — abre e fecha ao passar o rato
     --------------------------------------------------------- */
  function folderToy() {
    var f = document.querySelector('.works__folder');
    if (!f) return;
    var OPEN = '\\', SHUT = '[', timer = null, flip = false;
    f.addEventListener('pointerenter', function () {
      if (timer) return;
      timer = setInterval(function () { flip = !flip; f.textContent = flip ? SHUT : OPEN; }, 240);
    });
    f.addEventListener('pointerleave', function () {
      clearInterval(timer); timer = null; flip = false; f.textContent = OPEN;
    });
    f.addEventListener('click', function () {
      var c = document.querySelector('.card');
      if (c) window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - L.vh * 0.12, behavior: 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     10. TRANSICAO DE PIXEIS (desligada: WIPE_ON = false)
     --------------------------------------------------------- */
  var wipe = { el: null, cells: [], order: [], state: [], live: false, key: '' };
  var wipeSection = document.getElementById('pxwipe');

  function wipeGrid() {
    var vw = root.clientWidth, vh = window.innerHeight;
    if (vw >= 861) return { c: 18, r: 9 };
    return { c: 8, r: Math.max(6, Math.min(30, Math.round(8 * vh / vw))) };
  }
  function buildWipe() {
    if (!WIPE_ON || !wipeSection) return;
    var g = wipeGrid(); COLS = g.c; ROWS = g.r;
    var key = COLS + 'x' + ROWS;
    if (wipe.el && wipe.key === key) return;
    if (wipe.el) wipe.el.remove();
    wipe.cells = []; wipe.order = []; wipe.state = []; wipe.live = false; wipe.key = key;
    var el = document.createElement('div');
    el.className = 'pxwipe-grid';
    el.style.gridTemplateColumns = 'repeat(' + COLS + ',1fr)';
    el.style.gridTemplateRows = 'repeat(' + ROWS + ',1fr)';
    var scored = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var i = document.createElement('i');
      el.appendChild(i); wipe.cells.push(i);
      var diag = (c / (COLS - 1) + r / (ROWS - 1)) / 2;
      scored.push({ k: wipe.cells.length - 1, s: diag * (1 - DISPERSAO) + Math.random() * DISPERSAO });
    }
    scored.sort(function (a, b) { return a.s - b.s; });
    wipe.order = new Array(wipe.cells.length);
    for (var n = 0; n < scored.length; n++) wipe.order[scored[n].k] = n / (scored.length - 1);
    wipe.state = wipe.cells.map(function () { return false; });
    document.body.appendChild(el);
    wipe.el = el;
  }
  function updateWipe() {
    if (!WIPE_ON || !wipe.el || !wipeSection) return;
    var top = wipeSection.offsetTop, len = wipeSection.offsetHeight || window.innerHeight;
    var p = (window.scrollY - top) / len;
    var live = p > -0.06 && p < 1.06;
    if (live !== wipe.live) { wipe.live = live; wipe.el.classList.toggle('is-live', live); }
    var covered = p >= 0.5;
    if (sky) sky.classList.toggle('is-off', covered);
    if (band) band.classList.toggle('is-off', covered);
    if (!live) {
      if (p >= 1) for (var z = 0; z < wipe.cells.length; z++)
        if (wipe.state[z]) { wipe.state[z] = false; wipe.cells[z].classList.remove('on'); }
      return;
    }
    var a = p * 2, b = (p - 0.5) * 2;
    for (var i = 0; i < wipe.cells.length; i++) {
      var t = wipe.order[i];
      var on = p < 0.5 ? (a >= t) : (b < t);
      if (on !== wipe.state[i]) { wipe.state[i] = on; wipe.cells[i].classList.toggle('on', on); }
    }
  }

  /* ---------------------------------------------------------
     11. LOOP
     --------------------------------------------------------- */
  var heroVisible = true;
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(hero);
  }
  function tick() {
    scene();
    stackScroll();
    updateWipe();
    if (physics.active && heroVisible) { Matter.Engine.update(physics.engine, 1000 / 60); renderPhysics(); }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------
     12. REVEALS + NAV
     --------------------------------------------------------- */
  function reveals() {
    var targets = [].slice.call(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }
  function navSpy() {
    var links = [].slice.call(document.querySelectorAll('.nav__links a'));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + x.target.id); });
      });
    }, { threshold: 0.4 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------------------------------------------------------
     13. ARRANQUE
     --------------------------------------------------------- */
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      setScale(); layout();
      destroyPhysics(); placeGlyphs();
      if (!REDUCED) buildPhysics();
      buildWipe(); buildNavPix(); fitFrames(); stackLayout(); stackScroll();
      cacheLit(); scene(); updateWipe();
    }, 180);
  });

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  function start() {
    setScale();
    splitLetters();
    layout();
    buildWipe();
    buildNavPix();
    reveals();
    navSpy();
    folderToy();
    riderDrag();
    fitFrames();
    stackLayout();
    stackScroll();
    placeGlyphs();
    if (!REDUCED) buildPhysics();
    cacheLit();
    scene();
    updateWipe();
    requestAnimationFrame(tick);
    window.addEventListener('load', function () { layout(); fitFrames(); stackLayout(); cacheLit(); });
    setTimeout(function () { layout(); fitFrames(); stackLayout(); cacheLit(); }, 500);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start).catch(start);
  else window.addEventListener('load', start);
})();
