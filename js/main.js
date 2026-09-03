(function () {
  'use strict';

  var WIPE_ON   = false;
  var DESIGN_W  = 1920;
  var GRASS_VIS = 0.20;
  var GRASS_VIS_M = 0.344;
  var FEET_Y    = 1645;
  var COLS = 18, ROWS = 9, DISPERSAO = 0.35;

  var MOBILE  = function () { return window.matchMedia('(max-width: 900px)').matches; };
  var FLOW    = function () { return window.matchMedia('(max-width: 900px) and (max-height: 620px)').matches; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var root = document.documentElement;
  var scale = 1;

  var hero  = document.getElementById('home');
  var sky   = document.getElementById('sky');
  var band  = document.getElementById('grassband');
  var rider = document.querySelector('.pix--rider');

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var MOB_W = 710, mscale = 1;
  function setScale() {
    scale = root.clientWidth / DESIGN_W;
    root.style.setProperty('--s', scale + 'px');
    mscale = root.clientWidth / MOB_W;
    root.style.setProperty('--m', mscale + 'px');
  }
  setScale();

  var L = { vh: 0, visible: 0, heroH: 0, bandH: 0, stop: 0, hiTop: 0 };

  function layout() {
    if (!band || !hero) return;
    L.vh = window.innerHeight;

    if (MOBILE()) {
      // Figma 710: relvado visivel do y=619 ao fundo do ecra de 1215 (49%),
      // e aterra com o topo em y=1495. O ceu e que estica em ecras mais altos.
      // relvado com o mesmo enquadramento do Figma: 1920 de largura num quadro de 710
      L.bandH = Math.round(526 * mscale);
      L.visible = Math.min(Math.round(L.vh * GRASS_VIS_M), L.bandH);
      band.style.setProperty('--grass-img-w', Math.round(1920 * mscale) + 'px');
      band.style.setProperty('--grass-h', L.visible + 'px');
      // bloco do nome centrado entre a barra de topo e a linha do relvado:
      // e assim que a altura a mais dos ecras altos se reparte (Figma 710:
      // "hi" em 270, nome em 352, ou seja 82 abaixo, bloco de 402 de altura)
      var navM = Math.round(68 * mscale);
      var grassTop0 = L.vh - L.visible;
      var blockH = Math.round(402 * mscale);
      L.hiTop = Math.max(navM + Math.round(40 * mscale),
                         Math.round(navM + (grassTop0 - navM - blockH) / 2));
      root.style.setProperty('--hero-hi', L.hiTop + 'px');

      var anchor = Math.max(Math.round(1495 * mscale),
                            L.vh - L.visible + Math.round(876 * mscale));
      L.heroH = anchor + L.bandH;
      hero.style.height = L.heroH + 'px';
      root.style.setProperty('--hero-anchor', anchor + 'px');
    } else {
      L.bandH = root.clientWidth * 526 / 1920;
      band.style.setProperty('--grass-img-w', '100%');
      L.visible = Math.round(Math.min(L.vh * GRASS_VIS, L.bandH));
      band.style.setProperty('--grass-h', L.visible + 'px');
      L.heroH = Math.round((FEET_Y - 19) * scale + L.visible);
      hero.style.height = L.heroH + 'px';
    }
    band.style.setProperty('--grass-top', (L.heroH - L.visible) + 'px');
    band.style.setProperty('--grass-full', Math.round(L.bandH) + 'px');
    root.style.setProperty('--grass-drop', Math.round(L.bandH - L.visible) + 'px');
    L.stop = L.heroH - L.vh;
  }

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

    var ez = 0;
    if (!landed && L.stop !== Infinity) {
      var N = L.vh * 0.5, u = clamp((y - (L.stop - N)) / N, 0, 1);
      ez = 0.85 * N * u * u * (1 - u);
    }
    if (ez !== lastEase) { lastEase = ez; band.style.setProperty('--grass-ease', ez.toFixed(1) + 'px'); }
  }

  var D_ROWS = 10, D_CELL = 14, D_RADIUS = 6, D_FORCE = 0.35;
  var dith = { el: null, cells: [], noise: [], cols: 0, rows: 0, size: 0,
               t: 0, amp: 0, tgt: 0, mx: -999, my: -999 };

  function buildDither() {
    var clip = band && band.querySelector('.grassband__clip');
    if (!clip) return;
    if (!dith.el) {
      dith.el = document.createElement('div');
      dith.el.className = 'grassdither';
      clip.appendChild(dith.el);
    }
    var size = MOBILE() ? Math.max(4, Math.round(D_CELL * mscale))
                        : Math.max(6, Math.round(D_CELL * scale));
    var rows = MOBILE() ? 7 : D_ROWS;
    var cols = Math.ceil(root.clientWidth / size);
    dith.size = size; dith.cols = cols; dith.rows = rows;
    dith.el.style.top = Math.round(L.bandH - rows * size) + 'px';
    dith.el.style.gridTemplateColumns = 'repeat(' + cols + ',' + size + 'px)';
    dith.el.style.gridAutoRows = size + 'px';
    dith.el.style.width = (cols * size) + 'px';
    dith.el.style.height = (rows * size) + 'px';
    dith.el.innerHTML = '';
    dith.cells = []; dith.noise = [];
    var frag = document.createDocumentFragment();
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = document.createElement('i');
      frag.appendChild(i);
      dith.cells.push({ el: i, c: c, r: r, on: false });
      dith.noise.push(Math.random());
    }
    dith.el.appendChild(frag);
  }

  var dithLast = 0;
  function stepDither() {
    if (!dith.el || !dith.cells.length) return;
    var now = performance.now();
    if (now - dithLast < 40) return;
    dithLast = now;
    var b = dith.el.getBoundingClientRect();
    if (b.bottom < -120 || b.top > window.innerHeight + 120) return;
    dith.t += 0.008;
    dith.amp += (dith.tgt - dith.amp) * 0.045;
    var rows = dith.rows, R = D_RADIUS, S = D_FORCE;
    for (var i = 0; i < dith.cells.length; i++) {
      var o = dith.cells[i], c = o.c, r = o.r;
      var base = (r + 1) / (rows + 1);
      var wob = Math.sin(dith.t + c * 0.22 + r * 0.45) * 0.5 + 0.5;
      var thr = dith.noise[i] * 0.78 + wob * 0.22;
      if (dith.amp > 0.01) {
        var dx = c - dith.mx, dy = r - dith.my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var infl = Math.max(0, 1 - dist / R); infl *= infl;
        base += infl * dith.amp * S * 0.45;
        thr -= infl * dith.amp * S * Math.sin(dith.t * 1.1 - dist * 0.32) * 0.18;
      }
      var on = base > thr;
      if (on !== o.on) { o.on = on; o.el.style.opacity = on ? '1' : '0'; }
    }
  }

  window.addEventListener('pointermove', function (e) {
    if (!dith.el || !dith.size) return;
    var g = dith.el.getBoundingClientRect();
    dith.mx = (e.clientX - g.left) / dith.size;
    dith.my = (e.clientY - g.top) / dith.size;
    dith.tgt = (e.clientY > g.top - 140 && e.clientY < g.bottom + 140) ? 1 : 0;
  }, { passive: true });

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

  var litCells = [], sunItem = null, sunEl = null, sunBox = null;

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
    if (!litCells.length) return;
    var l, r, t, b;
    if (sunItem && sunItem.body) {
      var p = sunItem.body.position, hw = sunItem.w / 2, hh = sunItem.h / 2;
      l = p.x - hw; r = p.x + hw; t = p.y - hh; b = p.y + hh;
    } else if (sunBox) {
      l = sunBox.l; r = sunBox.r; t = sunBox.t; b = sunBox.b;
    } else return;
    for (var i = 0; i < litCells.length; i++) {
      var c = litCells[i];
      var hit = !(r < c.l || l > c.r || b < c.t || t > c.b);
      if (hit !== c.on) { c.on = hit; c.el.classList.toggle('is-lit', hit); }
    }
  }

  var navPix = [], navPixBound = false, navHover = false, navRAF = 0, lastShuffle = 0;
  var FADE = 0.055;
  var SHUFFLE_MS = 1000;

  function buildNavPix() {
    navPix.length = 0;
    [].slice.call(document.querySelectorAll('.nav__pix')).forEach(function (cv) {
      var box = cv.getBoundingClientRect();
      var cell = Math.max(5, MOBILE() ? 17 * mscale : 17 * scale);
      var cols = Math.max(4, Math.round(box.width / cell));
      var rows = Math.max(2, Math.round(box.height / cell));
      cv.width = cols; cv.height = rows;
      var ctx = cv.getContext('2d');
      var right = cv.dataset.side === 'right';
      var n = cols * rows;
      var cur = new Float32Array(n), tgt = new Float32Array(n);

      function density(c) {
        var d = right ? (c + 1) / cols : 1 - c / cols;
        return Math.pow(clamp(d, 0, 1), 3.1) * 0.62;
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
      navPix.forEach(function (p) { p.shuffle(1.35); });
      if (!navRAF) navRAF = requestAnimationFrame(navTick);
    });
    nav.addEventListener('pointerleave', function () {
      navHover = false;
      navPix.forEach(function (p) { p.shuffle(); });
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

  var stack = document.getElementById('stack');
  var cards = [].slice.call(document.querySelectorAll('.card'));
  var SPC = 800, GAP = 240, HOLD = 0.42, stackTop = 0, cardH = [], cardTilt = [], cardFit = [];

  var navPx = 0;
  function navH() {
    var n = document.querySelector('.nav');
    navPx = n ? n.offsetHeight : Math.round(68 * scale);
    return navPx;
  }

  // No computador a altura da janela so muda quando o utilizador a muda.
  // No telemovel muda sozinha durante o scroll (a barra do browser esconde-se),
  // por isso ai usa-se a altura da ultima medicao a serio.
  function stackVH() {
    return MOBILE() ? (L.vh || window.innerHeight) : window.innerHeight;
  }

  function stackLayout() {
    if (!stack || !cards.length) return;
    if (FLOW()) { stack.style.height = ''; stack.style.marginTop = ''; cards.forEach(function (c) { c.style.transform = ''; c.style.width = ''; }); return; }
    var vhRef = stackVH();
    SPC = Math.round(vhRef * 1.2);
    stack.style.height = ((cards.length - 1 + HOLD) * SPC + vhRef) + 'px';
    var vh0 = vhRef, navH0 = navH(), h0 = cards[0].offsetHeight;
    var C0 = Math.max(navH0 * 0.4, navH0 + (vh0 - navH0 - h0) / 2);
    stack.style.marginTop = Math.round(34 * scale - C0) + 'px';
    cardH = cards.map(function (c) { return c.offsetHeight; });
    // se o card nao couber no ecra, encolhe o suficiente para caber e poder
    // ficar mesmo centrado (quanto mais estreito o ecra, mais pequeno o card)
    var margem = Math.round(22 * (MOBILE() ? mscale : scale));
    var cabe = vhRef - navH0 - margem * 2;
    cardFit = cardH.map(function (h) { return (h > cabe && cabe > 0) ? cabe / h : 1; });
    cardTilt = cards.map(function (c) {
      return (getComputedStyle(c).getPropertyValue('--tilt') || '0deg').trim() || '0deg';
    });
    stackTop = stack.getBoundingClientRect().top + window.scrollY;
  }

  function stackScroll() {
    if (!stack || !cards.length || FLOW()) return;
    var vh = stackVH();
    var nav = navPx || navH();
    var u = clamp((window.scrollY - stackTop) / SPC, 0, cards.length - 1);
    var k = Math.floor(u), f = u - k;
    f = f <= HOLD ? 0 : (f - HOLD) / (1 - HOLD);
    var j = k + f * f * (3 - 2 * f);
    var gap = MOBILE() ? 224 * mscale : GAP * scale;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var h0 = cardH[i] || c.offsetHeight;
      var f = cardFit[i] || 1;
      var h = h0 * f;
      var C = Math.max(nav * 0.4, nav + (vh - nav - h) / 2);
      var d = j - i;
      var enter = vh - C + 40;
      var z0 = MOBILE() ? 0.947 : 0.93;
      var z = (d < 0 ? z0 + (1 - z0) * clamp(1 + d, 0, 1) : 1) * f;
      // a escala e feita a partir do centro: compensar para o topo visivel cair em C
      var y = (d >= 0 ? C - d * gap : C + (-d) * enter) - h0 * (1 - z) / 2;
      c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) rotate(' + (cardTilt[i] || '0deg') + ') scale(' + z.toFixed(3) + ')';
    }
  }


  function buildPortraitDither() {
    var host = document.querySelector('.about__portrait-inner');
    if (!host) return;
    var old = host.querySelector('.portdither');
    if (old) old.remove();
    if (MOBILE()) return;
    var w = host.offsetWidth, h = host.offsetHeight;
    if (!w || !h) return;
    var size = Math.max(8, Math.round(21 * scale));
    var cols = Math.max(4, Math.round(w / size));
    var rows = Math.max(4, Math.round(h / size));
    var el = document.createElement('div');
    el.className = 'portdither';
    el.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)';
    el.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < cols * rows; i++) {
      var c = document.createElement('i');
      c.style.setProperty('--d', Math.round(Math.random() * 260));
      frag.appendChild(c);
    }
    el.appendChild(frag);
    host.appendChild(el);
  }

  var A_YEL = [1, 0.89411765, 0.48235294], A_WHT = [1, 1, 1];
  var foot = { c: A_YEL.slice(), t: A_YEL };
  function mailHue() {
    var a = document.getElementById('mail');
    if (!a) return;
    a.addEventListener('mouseenter', function () { foot.t = A_WHT; });
    a.addEventListener('mouseleave', function () { foot.t = A_YEL; });
  }
  function stepFootColor() {
    var cv = document.getElementById('linha-pixel2');
    if (!cv || !cv.setAnimColor) return;
    var d = 0;
    for (var i = 0; i < 3; i++) { d += Math.abs(foot.t[i] - foot.c[i]); foot.c[i] += (foot.t[i] - foot.c[i]) * 0.11; }
    if (d < 0.004) return;
    cv.setAnimColor(foot.c[0], foot.c[1], foot.c[2]);
  }

  function mailCopy() {
    var a = document.getElementById('mail'), tip = document.getElementById('copied');
    if (!a) return;
    var timer = null;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var txt = a.dataset.mail || a.textContent.trim();
      var cx = e.clientX, cy = e.clientY;
      var done = function () {
        if (!tip) return;
        tip.style.left = cx + 'px';
        tip.style.top = cy + 'px';
        tip.classList.add('is-on');
        clearTimeout(timer);
        timer = setTimeout(function () { tip.classList.remove('is-on'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else fallback();
      function fallback() {
        var t = document.createElement('textarea');
        t.value = txt; t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); done(); } catch (err) {}
        document.body.removeChild(t);
      }
    });
  }

  function layoutGreen() {
    var bg = document.getElementById('greenbg');
    var w = document.getElementById('works'), c = document.getElementById('contact');
    if (!bg || !w || !c) return;
    var top = w.getBoundingClientRect().top + window.scrollY;
    var bot = c.getBoundingClientRect().top + window.scrollY;
    bg.style.top = Math.round(top) + 'px';
    bg.style.height = Math.round(bot - top) + 'px';
  }

  function fitFrames() {
    [].slice.call(document.querySelectorAll('.pxframe')).forEach(function (el) {
      var target = MOBILE() ? 15 * mscale : 14 * scale;
      el.style.width = '';                        // medir a largura natural, nao a que ja la esta
      var w = el.offsetWidth;
      if (!w) return;
      var n = Math.max(8, Math.round(w / target));
      if (n % 2) n++;
      var sq = Math.max(2, Math.round(w / n));   // pixeis inteiros: sem falhas nas arestas
      while (n * sq > w && n > 8) n -= 2;         // nunca mais largo que o espaco disponivel
      el.style.width = (n * sq) + 'px';           // largura multipla exacta do quadrado
      el.style.setProperty('--sq', sq + 'px');
      el.style.padding = (sq * 2) + 'px';       // anel de 2 quadrados, igual dos 4 lados
      var inner = el.firstElementChild;
      if (!inner) return;
      inner.style.paddingBottom = '';
      var base = parseFloat(getComputedStyle(inner).paddingBottom) || 0;
      for (var pass = 0; pass < 2; pass++) {
        var h = el.offsetHeight;
        var extra = Math.ceil(h / (sq * 2)) * (sq * 2) - h;
        inner.style.paddingBottom = (base + extra) + 'px';
      }
    });
  }

  var scenes = [];
  function glyphs() { return [].slice.call(document.querySelectorAll('.physics .pix')); }

  function glyphW(el) {
    return MOBILE() && el.dataset.mw ? parseFloat(el.dataset.mw) * mscale
                                     : parseFloat(el.dataset.w) * scale;
  }
  function glyphH(el) {
    return MOBILE() && el.dataset.mh ? parseFloat(el.dataset.mh) * mscale
                                     : parseFloat(el.dataset.h) * scale;
  }

  function glyphHome(el) {
    var a = document.querySelector(el.dataset.anchor || '#home');
    var r = a ? a.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    if (MOBILE() && el.dataset.mx) {
      var off = parseFloat(el.dataset.my) * mscale, my;
      if (el.dataset.mfrom === 'hi') my = L.hiTop + off;                  // segue o nome
      else if (el.dataset.mfrom === 'grass') my = (L.vh - L.visible) + off; // segue o relvado
      else my = off;
      return { x: r.left + parseFloat(el.dataset.mx) * mscale,
               y: r.top + window.scrollY + my };
    }
    return { x: r.left + parseFloat(el.dataset.x) * scale,
             y: r.top + window.scrollY + parseFloat(el.dataset.y) * scale };
  }

  function hostHeight(host) {
    if (host.dataset.bound === 'sky') {
      var w = document.getElementById('works');
      var top = w ? w.getBoundingClientRect().top + window.scrollY : window.innerHeight;
      return Math.max(Math.round(top), window.innerHeight);
    }
    return Math.max(document.body.scrollHeight, window.innerHeight);
  }

  function paintGlyph(el) {
    var w = glyphW(el), h = glyphH(el), p = glyphHome(el);
    var dx = parseFloat(el.dataset.dx) || 0, dy = parseFloat(el.dataset.dy) || 0;
    var x = p.x - w / 2 + dx, y = p.y - h / 2 + dy;
    el.style.transformOrigin = 'center';
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' +
      (parseFloat(el.dataset.rot) || 0) + 'deg)';
    if (el === sunEl) sunBox = { l: x, r: x + w, t: y, b: y + h };
  }

  function placeGlyphs() {
    if (!sunEl) {
      glyphs().forEach(function (el) { if (el.textContent.trim() === 'X') sunEl = el; });
    }
    [].slice.call(document.querySelectorAll('.physics')).forEach(function (host) {
      host.style.height = hostHeight(host) + 'px';
    });
    glyphs().forEach(paintGlyph);
  }

  // Em telemovel nao ha motor de fisica: o glifo segue o dedo e fica onde ficar.
  // Poupa uma actualizacao do mundo em cada frame, que era o que tornava o
  // arrasto lento nos telemoveis.
  function attachTouchDrag() {
    glyphs().forEach(function (el) {
      if (el.dataset.tdrag) return;
      el.dataset.tdrag = '1';
      var sx = 0, sy = 0, ox = 0, oy = 0, on = false;
      el.addEventListener('pointerdown', function (e) {
        if (!MOBILE()) return;
        e.preventDefault();
        on = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add('is-dragging');
        sx = e.clientX; sy = e.clientY;
        ox = parseFloat(el.dataset.dx) || 0; oy = parseFloat(el.dataset.dy) || 0;
      });
      el.addEventListener('pointermove', function (e) {
        if (!on) return;
        el.dataset.dx = ox + (e.clientX - sx);
        el.dataset.dy = oy + (e.clientY - sy);
        paintGlyph(el);
      });
      function off(e) {
        if (!on) return;
        on = false;
        el.classList.remove('is-dragging');
        try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      }
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
    });
  }

  function buildPhysics() {
    if (MOBILE()) { attachTouchDrag(); return; }
    if (typeof Matter === 'undefined') return;
    var Engine = Matter.Engine, World = Matter.World, Bodies = Matter.Bodies;
    sunItem = null;
    scenes = [];

    [].slice.call(document.querySelectorAll('.physics')).forEach(function (host) {
      var W = root.clientWidth, H = hostHeight(host);
      host.style.height = H + 'px';
      if (!W || !H) return;

      var engine = Engine.create();
      engine.enableSleeping = false;
      engine.gravity.x = 0; engine.gravity.y = 0;
      var world = engine.world, t = 400;
      World.add(world, [
        Bodies.rectangle(W / 2, -t / 2, W + t * 2, t, { isStatic: true }),
        Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, { isStatic: true }),
        Bodies.rectangle(-t / 2, H / 2, t, H + t * 2, { isStatic: true }),
        Bodies.rectangle(W + t / 2, H / 2, t, H + t * 2, { isStatic: true })
      ]);

      var items = [].slice.call(host.querySelectorAll('.pix')).map(function (el) {
        var r = el.getBoundingClientRect();
        var w = r.width || glyphW(el);
        var h = r.height || glyphH(el);
        var home = glyphHome(el);
        var body = Bodies.rectangle(
          home.x, home.y, w, h,
          { restitution: 0.62, frictionAir: 0.035, friction: 0.05, density: 0.0015,
            angle: (parseFloat(el.dataset.rot) || 0) * Math.PI / 180 });
        World.add(world, body);
        el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.transformOrigin = 'center';
        var item = { el: el, body: body, w: w, h: h };
        if (el.textContent.trim() === 'X') sunItem = item;
        return item;
      });

      scenes.push({ host: host, engine: engine, world: world, items: items, active: true });
      attachDrag(items);
    });
  }

  function attachDrag(list) {
    list.forEach(function (it) {
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

  function stepPhysics() {
    for (var s = 0; s < scenes.length; s++) {
      var sc = scenes[s];
      Matter.Engine.update(sc.engine, 1000 / 60);
      for (var i = 0; i < sc.items.length; i++) {
        var it = sc.items[i], p = it.body.position;
        it.el.style.transform = 'translate3d(' + (p.x - it.w / 2) + 'px,' + (p.y - it.h / 2) + 'px,0) rotate(' + it.body.angle + 'rad)';
      }
    }
    litUpdate();
  }

  function destroyPhysics() {
    scenes.forEach(function (sc) {
      Matter.World.clear(sc.world, false);
      Matter.Engine.clear(sc.engine);
      sc.items.forEach(function (it) { it.el.style.transform = ''; });
    });
    scenes = []; sunItem = null;
  }

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

  var heroVisible = true;
  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(hero);
  }
  function tick() {
    requestAnimationFrame(tick);
    if (document.hidden) return;
    scene();
    stepFootColor();
    stepDither();
    stackScroll();
    if (WIPE_ON) updateWipe();
    if (scenes.length) stepPhysics(); else litUpdate();
    navSpyUpdate();
    animSpeed();
  }

  function reveals() {
    var targets = [].slice.call(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  var spy = [], spyLast = null;
  function navSpyBuild() {
    spy = [].slice.call(document.querySelectorAll('.nav__links a')).map(function (a) {
      var el = document.querySelector(a.getAttribute('href'));
      return el ? { a: a, el: el, top: 0 } : null;
    }).filter(Boolean);
    navSpyMeasure();
  }
  function navSpyMeasure() {
    spy.forEach(function (x) { x.top = x.el.getBoundingClientRect().top + window.scrollY; });
  }
  function navSpyUpdate() {
    if (!spy.length) return;
    var y = window.scrollY + window.innerHeight * 0.35, best = spy[0];
    for (var i = 0; i < spy.length; i++) if (y >= spy[i].top) best = spy[i];
    if (best === spyLast) return;
    spyLast = best;
    spy.forEach(function (x) { x.a.classList.toggle('is-active', x === best); });
  }

  var animCanvas = document.getElementById('linha-pixel');
  var animTarget = 1, animNow = 1, ANIM_FAST = 3;
  function animHover() {
    var role = document.querySelector('.hero__role');
    if (!animCanvas || !role) return;
    role.addEventListener('mouseenter', function () { animTarget = ANIM_FAST; });
    role.addEventListener('mouseleave', function () { animTarget = 1; });
  }
  function animSpeed() {
    if (!animCanvas || !animCanvas.setAnimSpeed) return;
    if (Math.abs(animTarget - animNow) < 0.01) return;
    animNow += (animTarget - animNow) * 0.09;
    animCanvas.setAnimSpeed(animNow);
  }

  var resizeT, lastVW = root.clientWidth, lastVH = window.innerHeight;
  window.addEventListener('resize', function () {
    // no telemovel a barra do browser aparece e desaparece durante o scroll e
    // dispara resize: se so a altura mudou um pouco, nao se remede nada.
    // No computador remede-se sempre, como antes.
    var vw = root.clientWidth, vh = window.innerHeight;
    var barOnly = MOBILE() && vw === lastVW && Math.abs(vh - lastVH) < 170;
    lastVW = vw; lastVH = vh;
    if (barOnly) return;
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      setScale(); layout();
      destroyPhysics(); placeGlyphs();
      if (!REDUCED) buildPhysics();
      buildWipe(); buildNavPix(); buildDither(); fitFrames(); buildPortraitDither(); stackLayout(); stackScroll();
      layoutGreen();
      navSpyMeasure(); cacheLit(); scene(); updateWipe();
    }, 180);
  });

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  function navMenu() {
    var b = document.getElementById('burger'), panel = document.getElementById('navlinks');
    if (!b || !panel) return;
    function close() { b.classList.remove('is-open'); panel.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); }
    b.addEventListener('click', function () {
      var open = !b.classList.contains('is-open');
      b.classList.toggle('is-open', open);
      panel.classList.toggle('is-open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') close(); });
    window.addEventListener('resize', function () { if (!MOBILE()) close(); });
  }

  function touchPortrait() {
    if (window.matchMedia('(hover: none)').matches === false) return;
    var f = document.querySelector('.about__portrait-frame');
    if (!f) return;
    f.addEventListener('pointerdown', function () {
      if (MOBILE()) return;
      f.classList.add('is-touched');
      setTimeout(function () { f.classList.remove('is-touched'); }, 1400);
    });
  }

  function start() {
    setScale();
    splitLetters();
    layout();
    buildWipe();
    buildNavPix();
    buildDither();
    reveals();
    navSpyBuild();
    animHover();
    riderDrag();
    fitFrames();
    buildPortraitDither();
    mailCopy();
    mailHue();
    navMenu();
    touchPortrait();
    stackLayout();
    stackScroll();
    placeGlyphs();
    if (!REDUCED) buildPhysics();
    cacheLit();
    scene();
    updateWipe();
    layoutGreen();
    requestAnimationFrame(tick);
    window.addEventListener('load', function () { layout(); buildDither(); fitFrames(); buildPortraitDither(); stackLayout(); navSpyMeasure(); cacheLit(); layoutGreen(); destroyPhysics(); placeGlyphs(); if (!REDUCED) buildPhysics(); });
    setTimeout(function () { layout(); buildDither(); fitFrames(); buildPortraitDither(); stackLayout(); navSpyMeasure(); cacheLit(); layoutGreen(); }, 500);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start).catch(start);
  else window.addEventListener('load', start);
})();
