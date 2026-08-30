/* =========================================================
   PORTFOLIO — LUIS PEREIRA
   1. escala global (--s)
   2. cenário do hero: céu fixo, relvado fixo no fundo do ecrã
      (só o topo aparece; cresce mesmo antes dos WORKS)
   3. transição de pixéis entre o hero e os WORKS
   4. pixéis aleatórios e reactivos no header
   5. molduras xadrez sem quadrados cortados
   6. Matter.js no sol e no smiley
   ========================================================= */
(function () {
  'use strict';

  var DESIGN_W = 1920;
  var MOBILE = function () { return window.matchMedia('(max-width: 860px)').matches; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var scale = 1;

  var hero = document.getElementById('home');
  var sky = document.getElementById('sky');
  var band = document.getElementById('grassband');
  var wipeSection = document.getElementById('pxwipe');

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function setScale() {
    scale = root.clientWidth / DESIGN_W;
    root.style.setProperty('--s', scale + 'px');
  }
  setScale();

  /* ---------------------------------------------------------
     1. CENÁRIO: cor do texto do hero + relvado
     --------------------------------------------------------- */
  var INK_A = [0x26, 0x26, 0x26];     // #262626
  var INK_B = [0xf9, 0xff, 0xf9];     // #f9fff9
  var lastInk = -1;

  function scene() {
    var y = window.scrollY;
    var vh = window.innerHeight;

    /* letras do hero passam a branco com o scroll */
    var t = clamp(y / (vh * 0.55), 0, 1);
    var q = Math.round(t * 100);
    if (q !== lastInk) {
      lastInk = q;
      root.style.setProperty('--hero-ink', 'rgb(' +
        Math.round(lerp(INK_A[0], INK_B[0], t)) + ',' +
        Math.round(lerp(INK_A[1], INK_B[1], t)) + ',' +
        Math.round(lerp(INK_A[2], INK_B[2], t)) + ')');
    }

    if (!band || !hero) return;

    /* relvado: fixo no fundo, só o topo à vista. Como está preso ao ecrã
       e o transform só muda no fim, não treme durante o scroll todo. */
    var bandH = band.offsetHeight;
    var minVisible = Math.min(vh * 0.20, bandH);
    var heroH = hero.offsetHeight;
    var growStart = heroH - vh * 1.15;
    var growLen = vh * 0.95;
    var g = clamp((y - growStart) / growLen, 0, 1);
    var visible = lerp(minVisible, bandH, g);
    root.style.setProperty('--grass-y', (bandH - visible).toFixed(1) + 'px');
  }

  /* ---------------------------------------------------------
     2. TRANSIÇÃO DE PIXÉIS
        18 x 9 quadrados. Cada um recebe uma pontuação que mistura
        a diagonal (col+lin)/2 com um valor aleatório fixo; DISPERSAO
        define o peso do aleatório. 0 = diagonal limpa, 1 = puro caos.
        0 -> 50%: acendem por ordem crescente. 50 -> 100%: apagam-se
        pela mesma ordem, revelando o painel que trocou a meio.
     --------------------------------------------------------- */
  var COLS = 18, ROWS = 9, DISPERSAO = 0.35;
  var wipe = { el: null, cells: [], order: [], state: [], live: false, key: '' };

  // 18 x 9 no ecra largo (16:9 da quadrados praticamente certos). Em retrato
  // recalcula-se para as celulas continuarem quadradas em vez de tiras altas.
  function wipeGrid() {
    var vw = root.clientWidth, vh = window.innerHeight;
    if (vw >= 861) return { c: 18, r: 9 };
    var c = 8;
    return { c: c, r: Math.max(6, Math.min(30, Math.round(c * vh / vw))) };
  }

  function buildWipe() {
    var g = wipeGrid();
    COLS = g.c; ROWS = g.r;
    var key = COLS + 'x' + ROWS;
    if (wipe.el && wipe.key === key) return;
    if (wipe.el) wipe.el.remove();
    wipe.cells = []; wipe.order = []; wipe.state = []; wipe.live = false; wipe.key = key;

    var el = document.createElement('div');
    el.className = 'pxwipe-grid';
    el.style.gridTemplateColumns = 'repeat(' + COLS + ',1fr)';
    el.style.gridTemplateRows = 'repeat(' + ROWS + ',1fr)';

    var scored = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var i = document.createElement('i');
        el.appendChild(i);
        wipe.cells.push(i);
        var diag = (c / (COLS - 1) + r / (ROWS - 1)) / 2;
        scored.push({ k: wipe.cells.length - 1, s: diag * (1 - DISPERSAO) + Math.random() * DISPERSAO });
      }
    }
    scored.sort(function (a, b) { return a.s - b.s; });
    wipe.order = new Array(wipe.cells.length);
    for (var n = 0; n < scored.length; n++) wipe.order[scored[n].k] = n / (scored.length - 1);
    wipe.state = wipe.cells.map(function () { return false; });

    document.body.appendChild(el);
    wipe.el = el;
  }

  function updateWipe() {
    if (!wipe.el || !wipeSection) return;
    var vh = window.innerHeight;
    var top = wipeSection.offsetTop;
    var len = wipeSection.offsetHeight || vh;
    var p = (window.scrollY - top) / len;

    var live = p > -0.06 && p < 1.06;
    if (live !== wipe.live) { wipe.live = live; wipe.el.classList.toggle('is-live', live); }

    var covered = p >= 0.5;
    if (sky) sky.classList.toggle('is-off', covered);
    if (band) band.classList.toggle('is-off', covered);
    if (!live) {
      if (p >= 1) for (var z = 0; z < wipe.cells.length; z++) if (wipe.state[z]) { wipe.state[z] = false; wipe.cells[z].classList.remove('on'); }
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
     3. PIXÉIS DO HEADER — aleatórios, e reagem ao rato
     --------------------------------------------------------- */
  var navPix = [];
  var navPixBound = false;

  function buildNavPix() {
    navPix.length = 0;
    var canvases = [].slice.call(document.querySelectorAll('.nav__pix'));
    canvases.forEach(function (cv) {
      // celulas sempre quadradas: derivadas da caixa real do canvas
      var box = cv.getBoundingClientRect();
      var cell = Math.max(6, (MOBILE() ? 11 : 17 * scale));
      var cols = Math.max(4, Math.round(box.width / cell));
      var rows = Math.max(2, Math.round(box.height / cell));
      cv.width = cols; cv.height = rows;          // 1 pixel do canvas = 1 quadrado
      var ctx = cv.getContext('2d');
      var right = cv.dataset.side === 'right';
      var state = new Array(cols * rows);

      function density(c) {
        var d = right ? (c + 1) / cols : 1 - c / cols;   // mais denso na ponta
        return Math.pow(clamp(d, 0, 1), 1.9);
      }
      function reset() {
        for (var r = 0; r < rows; r++)
          for (var c = 0; c < cols; c++)
            state[r * cols + c] = Math.random() < density(c) * 0.95;
      }
      function draw() {
        ctx.clearRect(0, 0, cols, rows);
        ctx.fillStyle = '#262626';
        for (var r = 0; r < rows; r++)
          for (var c = 0; c < cols; c++)
            if (state[r * cols + c]) ctx.fillRect(c, r, 1, 1);
      }
      reset(); draw();
      navPix.push({ cv: cv, cols: cols, rows: rows, state: state, density: density, draw: draw, reset: reset });
    });

    var nav = document.getElementById('nav');
    if (!nav || navPixBound) return;
    navPixBound = true;
    var queued = false, mx = 0, my = 0;

    nav.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; if (!queued) { queued = true; requestAnimationFrame(stir); } });
    nav.addEventListener('pointerleave', function () { navPix.forEach(function (p) { p.reset(); p.draw(); }); });

    function stir() {
      queued = false;
      navPix.forEach(function (p) {
        var r = p.cv.getBoundingClientRect();
        var cx = (mx - r.left) / r.width * p.cols;
        var cy = (my - r.top) / r.height * p.rows;
        var R = 4.5, touched = false;
        for (var y = 0; y < p.rows; y++) {
          for (var x = 0; x < p.cols; x++) {
            var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
            if (d > R) continue;
            touched = true;
            var boost = 1 + (1 - d / R) * 1.6;
            p.state[y * p.cols + x] = Math.random() < clamp(p.density(x) * boost, 0, 0.95);
          }
        }
        if (touched) p.draw();
      });
    }
  }

  /* ---------------------------------------------------------
     4. MOLDURAS XADREZ — nenhum quadrado cortado
        O lado do quadrado passa a ser largura/N (N inteiro) e a altura
        é arredondada para um múltiplo exacto desse lado.
     --------------------------------------------------------- */
  function fitFrames() {
    [].slice.call(document.querySelectorAll('.pxframe')).forEach(function (el) {
      var target = MOBILE() ? 9 : 14 * scale;
      var w = el.offsetWidth;
      if (!w) return;
      var n = Math.max(8, Math.round(w / target));
      var sq = w / n;
      el.style.setProperty('--sq', sq + 'px');
      el.style.padding = sq + 'px';
      for (var pass = 0; pass < 2; pass++) {
        var h = el.offsetHeight;
        var extra = Math.ceil(h / sq) * sq - h;
        el.style.paddingBottom = (sq + extra) + 'px';
      }
    });
  }

  /* ---------------------------------------------------------
     5. MATTER.JS — sol e smiley
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
    physics.engine.gravity.x = 0;
    physics.engine.gravity.y = 0;
    physics.world = physics.engine.world;

    var W = hero.clientWidth, H = hero.clientHeight, t = 400;
    World.add(physics.world, [
      Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
      Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, { isStatic: true }),
      Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, { isStatic: true })
    ]);

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
      return { el: el, body: body, w: w, h: h };
    });

    attachDrag();
    physics.active = true;
  }

  function attachDrag() {
    physics.items.forEach(function (it) {
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
  }

  function destroyPhysics() {
    if (!physics.world) return;
    Matter.World.clear(physics.world, false);
    Matter.Engine.clear(physics.engine);
    physics.items.forEach(function (it) { it.el.style.transform = ''; });
    physics.items = []; physics.active = false;
  }

  /* ---------------------------------------------------------
     6. LOOP
     --------------------------------------------------------- */
  var heroVisible = true;
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(hero);
  }

  function tick() {
    scene();
    updateWipe();
    if (physics.active && heroVisible) { Matter.Engine.update(physics.engine, 1000 / 60); renderPhysics(); }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------
     7. REVEALS + NAV
     --------------------------------------------------------- */
  function reveals() {
    var targets = [].slice.call(document.querySelectorAll('.card, .reveal'));
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
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
     8. ARRANQUE
     --------------------------------------------------------- */
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      setScale(); destroyPhysics(); placeGlyphs();
      if (!REDUCED) buildPhysics();
      buildWipe(); buildNavPix(); fitFrames(); scene(); updateWipe();
    }, 180);
  });

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  function start() {
    setScale();
    buildWipe();
    buildNavPix();
    reveals();
    navSpy();
    fitFrames();
    placeGlyphs();
    if (!REDUCED) buildPhysics();
    scene();
    updateWipe();
    requestAnimationFrame(tick);
    window.addEventListener('load', fitFrames);
    setTimeout(fitFrames, 400);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start).catch(start);
  else window.addEventListener('load', start);
})();
