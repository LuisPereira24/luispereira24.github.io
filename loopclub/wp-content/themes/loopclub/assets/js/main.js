/* ============================================================
   LOOP — comportamento (vanilla, sem dependências)
   ============================================================ */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Fade-in no scroll ---- */
    function initReveal() {
        var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
        if (!els.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    var delay = el.getAttribute('data-reveal-delay');
                    if (delay) el.style.transitionDelay = delay + 'ms';
                    el.classList.add('is-visible');
                    io.unobserve(el);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

        els.forEach(function (el) { io.observe(el); });
    }

    /* ---- Menu mobile (aria-expanded) ---- */
    function initNav() {
        var toggle = document.querySelector('[data-nav-toggle]');
        var panel  = document.getElementById('site-menu');
        if (!toggle || !panel) return;

        function setOpen(open) {
            toggle.setAttribute('aria-expanded', String(open));
            panel.classList.toggle('is-open', open);
            document.body.classList.toggle('nav-open', open);
        }

        toggle.addEventListener('click', function () {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        panel.addEventListener('click', function (e) {
            if (e.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                setOpen(false);
                toggle.focus();
            }
        });
    }

    /* ---- Header: inverte ao entrar na zona clara ---- */
    function initHeaderScroll() {
        var header = document.querySelector('[data-header]');
        if (!header) return;

        var hero = document.querySelector('.hero');
        var headerH = header.offsetHeight || 96;

        var onScroll = function () {
            var past;
            if (hero) {
                // inverte quando a base do herói cruza o fundo do header
                past = hero.getBoundingClientRect().bottom <= headerH + 1;
            } else {
                past = window.scrollY > 24;
            }
            header.classList.toggle('is-scrolled', past);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', function () {
            headerH = header.offsetHeight || 96;
            onScroll();
        }, { passive: true });
    }

    /* ---- Arrasto lateral (fallback nativo do Archive) ---- */
    function attachDragScroll(el) {
        var down = false, startX = 0, startLeft = 0, moved = false;
        el.addEventListener('pointerdown', function (e) {
            if (el.scrollWidth <= el.clientWidth) return;   // nada a arrastar
            down = true; moved = false;
            startX = e.clientX; startLeft = el.scrollLeft;
            el.classList.add('is-dragging');
        });
        el.addEventListener('pointermove', function (e) {
            if (!down) return;
            var dx = e.clientX - startX;
            if (Math.abs(dx) > 3) moved = true;
            el.scrollLeft = startLeft - dx;
        });
        var end = function () { down = false; el.classList.remove('is-dragging'); };
        el.addEventListener('pointerup', end);
        el.addEventListener('pointerleave', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('click', function (e) { if (moved) e.preventDefault(); }, true);
    }

    /* ---- Scroll horizontal fixado (pinned) accionado pelo scroll vertical ----
       Reutilizável por qualquer secção que siga o padrão [data-hscroll] >
       [data-hscroll-sticky] > [data-hscroll-track] (+ [data-hscroll-bar]
       opcional). Ao chegar à secção, o scroll vertical passa a mover a pista
       para o lado durante vários painéis; depois a secção liberta e o scroll
       segue para baixo. Usado pelo Archive (home) e pela timeline (about). */
    function initHscroll() {
        var sections = Array.prototype.slice.call(document.querySelectorAll('[data-hscroll]'));
        sections.forEach(function (sec) {
            var sticky = sec.querySelector('[data-hscroll-sticky]');
            var track  = sec.querySelector('[data-hscroll-track]');
            var bar    = sec.querySelector('[data-hscroll-bar]');
            if (!sticky || !track) return;

            var enabled = false, maxShift = 0, ticking = false;

            /* O scroll horizontal fixado é um requisito de layout (o utilizador é
               obrigado a percorrer a pista de lado antes de continuar), por isso
               é accionado em qualquer desktop ≥992px. Não depende de reduceMotion:
               é posição ligada ao scroll, não animação automática. Abaixo de 992px
               (e em toque) cai para o scroll horizontal nativo. */
            var canPin = function () {
                return window.matchMedia('(min-width: 992px)').matches;
            };

            function measure() {
                if (canPin()) {
                    enabled = true;
                    sec.classList.add('is-pinned');
                    track.style.transform = 'none';
                    maxShift = Math.max(0, track.scrollWidth - sticky.clientWidth);
                    // altura da secção = ecrã + distância horizontal a percorrer
                    sec.style.height = (window.innerHeight + maxShift) + 'px';
                    render();
                } else {
                    enabled = false;
                    sec.classList.remove('is-pinned');
                    sec.style.height = '';
                    track.style.transform = '';
                    if (bar) bar.style.width = '';
                }
            }

            function render() {
                if (!enabled) return;
                var top = sec.getBoundingClientRect().top;      // 0 no topo, negativo ao descer
                var progress = maxShift > 0 ? (-top) / maxShift : 0;
                progress = Math.min(1, Math.max(0, progress));
                track.style.transform = 'translate3d(' + (-progress * maxShift) + 'px,0,0)';
                if (bar) bar.style.width = (progress * 100) + '%';
            }

            function onScroll() {
                if (!enabled || ticking) return;
                ticking = true;
                requestAnimationFrame(function () { render(); ticking = false; });
            }

            attachDragScroll(sticky);              // arrasto no modo fallback
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', measure);
            window.addEventListener('load', measure);

            // Re-medir quando cada imagem da pista acaba de carregar: as dimensões
            // reais podem mudar a largura da pista e, com ela, a altura da secção.
            Array.prototype.forEach.call(track.querySelectorAll('img'), function (img) {
                if (!img.complete) img.addEventListener('load', measure, { once: true });
            });
            // Re-medir após as fontes assentarem (a intro usa a display font).
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

            measure();
        });
    }

    /* ---- Parallax nas secções verdes (About) ----
       A coluna de texto desloca-se dentro da altura da imagem ao lado —
       nunca passa o topo nem o fundo dela. delta = altura da imagem menos
       altura do texto (o "espaço livre" que o texto pode percorrer); a
       posição é uma função contínua do progresso de scroll da própria
       secção (0 quando a secção entra pelo fundo do ecrã, 1 quando sai pelo
       topo), por isso os dois painéis parecem alinhados nos extremos do
       scroll e desfasados a meio — sempre a seguir o movimento do
       utilizador com fluidez. Desactivado com prefers-reduced-motion. */
    function initParallax() {
        var sections = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
        if (!sections.length || reduceMotion) return;

        var items = sections.map(function (sec) {
            return {
                sec: sec,
                text: sec.querySelector('.about-split__text'),
                media: sec.querySelector('.about-split__media'),
                delta: 0,
            };
        }).filter(function (it) { return it.text && it.media; });
        if (!items.length) return;

        /* Abaixo de 992px o grid de 2 colunas (texto+imagem) colapsa para
           1 coluna (ver about.css) — texto e imagem empilham-se, deixam de
           ter alturas comparáveis, e o delta deixava de fazer sentido,
           arrastando o texto para cima/baixo de secções vizinhas. Desligado
           nessa gama: o texto fica estático, como as restantes secções. */
        var canRun = function () {
            return window.matchMedia('(min-width: 992px)').matches;
        };

        var ticking = false;

        function measure() {
            items.forEach(function (it) {
                it.delta = canRun() ? Math.max(0, it.media.offsetHeight - it.text.offsetHeight) : 0;
            });
        }

        function render() {
            var vh = window.innerHeight;
            var active = canRun();
            items.forEach(function (it) {
                if (!active) { it.text.style.transform = ''; return; }
                var rect = it.sec.getBoundingClientRect();
                var progress = (vh - rect.top) / (vh + rect.height);
                progress = Math.max(0, Math.min(1, progress));
                it.text.style.transform = 'translate3d(0,' + (it.delta * progress).toFixed(1) + 'px,0)';
            });
        }

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () { render(); ticking = false; });
        }

        function remeasure() { measure(); render(); }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', remeasure);
        window.addEventListener('load', remeasure);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

        remeasure();
    }

    /* ---- Loja: filtros (categoria/cor/preço), ordenação, acordeão ---- */
    function initShop() {
        var root = document.querySelector('[data-shop]');
        if (!root) return;

        var cards       = Array.prototype.slice.call(root.querySelectorAll('.product-card'));
        var collections = Array.prototype.slice.call(root.querySelectorAll('[data-collection]'));
        var countEl     = root.querySelector('[data-shop-count]');
        var emptyEl     = root.querySelector('[data-shop-empty]');
        var absMin      = parseInt(root.getAttribute('data-price-min'), 10);
        var absMax      = parseInt(root.getAttribute('data-price-max'), 10);

        var state = { categories: [], colors: [], min: absMin, max: absMax, sort: 'newest' };

        function fmtPrice(v) { return v + ',00€'; }

        function sorter(a, b) {
            switch (state.sort) {
                case 'price-asc':  return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
                case 'price-desc': return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
                case 'name':       return a.dataset.name.localeCompare(b.dataset.name);
                default:           return (+a.dataset.index) - (+b.dataset.index);   // newest = ordem de autoria
            }
        }

        function apply() {
            var visible = 0;
            cards.forEach(function (card) {
                var okCat   = state.categories.length === 0 || state.categories.indexOf(card.dataset.category) >= 0;
                var okColor = state.colors.length === 0 || state.colors.indexOf(card.dataset.color) >= 0;
                var p       = parseFloat(card.dataset.price);
                var okPrice = p >= state.min && p <= state.max;
                var show    = okCat && okColor && okPrice;
                card.hidden = !show;
                if (show) visible++;
            });

            // Ordena dentro de cada colecção e esconde as que ficam vazias.
            collections.forEach(function (col) {
                var grid  = col.querySelector('[data-grid]');
                var items = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
                items.sort(sorter).forEach(function (it) { grid.appendChild(it); });
                col.hidden = !items.some(function (it) { return !it.hidden; });
            });

            if (countEl) countEl.textContent = visible;
            if (emptyEl) emptyEl.hidden = visible !== 0;
        }

        /* Categorias (multi-selecção) — "ALL" é um atalho que limpa a selecção;
           qualquer categoria específica alterna independentemente, e a última
           a ser desmarcada devolve automaticamente ao estado "ALL". */
        var catBtns = Array.prototype.slice.call(root.querySelectorAll('[data-filter="category"] .filter-opt'));
        function paintCatBtns() {
            var none = state.categories.length === 0;
            catBtns.forEach(function (b) {
                var on = b.dataset.value === 'all' ? none : state.categories.indexOf(b.dataset.value) >= 0;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', String(on));
            });
        }
        catBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var val = btn.dataset.value;
                if (val === 'all') {
                    state.categories = [];
                } else {
                    var i = state.categories.indexOf(val);
                    if (i >= 0) state.categories.splice(i, 1); else state.categories.push(val);
                }
                paintCatBtns();
                apply();
            });
        });

        /* Cores (multi-selecção) */
        var colBtns = Array.prototype.slice.call(root.querySelectorAll('[data-filter="color"] .filter-swatch'));
        colBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var v = btn.dataset.value;
                var i = state.colors.indexOf(v);
                if (i >= 0) state.colors.splice(i, 1); else state.colors.push(v);
                btn.setAttribute('aria-pressed', String(i < 0));
                apply();
            });
        });

        /* Preço (range duplo) */
        var pf = root.querySelector('[data-price]');
        if (pf) {
            var minIn  = pf.querySelector('[data-price-input="min"]');
            var maxIn  = pf.querySelector('[data-price-input="max"]');
            var fill   = pf.querySelector('[data-price-fill]');
            var outMin = pf.querySelector('[data-price-out="min"]');
            var outMax = pf.querySelector('[data-price-out="max"]');

            var pct = function (v) { return (v - absMin) / (absMax - absMin) * 100; };
            var paint = function () {
                fill.style.left  = pct(state.min) + '%';
                fill.style.width = (pct(state.max) - pct(state.min)) + '%';
                outMin.textContent = fmtPrice(state.min);
                outMax.textContent = fmtPrice(state.max);
                // O thumb mínimo sobe de camada perto do topo para não ficar preso.
                minIn.style.zIndex = state.min > absMax - (absMax - absMin) * 0.15 ? '4' : '3';
            };
            minIn.addEventListener('input', function () {
                state.min = Math.min(parseInt(minIn.value, 10), state.max);
                minIn.value = state.min;
                paint(); apply();
            });
            maxIn.addEventListener('input', function () {
                state.max = Math.max(parseInt(maxIn.value, 10), state.min);
                maxIn.value = state.max;
                paint(); apply();
            });
            pf._reset = function () {
                state.min = absMin; state.max = absMax;
                minIn.value = absMin; maxIn.value = absMax;
                paint();
            };
            paint();
        }

        /* Ordenação — dropdown custom (sem select nativo, mais clean) */
        var sortWrap    = root.querySelector('[data-sort]');
        var sortBtn, sortMenu, sortCurrent, sortOpts = [];
        function updateSortUI(val, label) {
            state.sort = val;
            if (sortCurrent && label != null) sortCurrent.textContent = label;
            sortOpts.forEach(function (o) {
                var on = o.dataset.value === val;
                o.classList.toggle('is-selected', on);
                o.setAttribute('aria-selected', String(on));
            });
        }
        function openSort(open) {
            if (!sortMenu) return;
            sortMenu.hidden = !open;
            sortBtn.setAttribute('aria-expanded', String(open));
            sortWrap.classList.toggle('is-open', open);
        }
        if (sortWrap) {
            sortBtn     = sortWrap.querySelector('[data-sort-btn]');
            sortMenu    = sortWrap.querySelector('[data-sort-menu]');
            sortCurrent = sortWrap.querySelector('[data-sort-current]');
            sortOpts    = Array.prototype.slice.call(sortWrap.querySelectorAll('.sort__opt'));

            sortBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openSort(sortMenu.hidden);
            });
            sortOpts.forEach(function (o) {
                o.addEventListener('click', function () {
                    updateSortUI(o.dataset.value, o.textContent);
                    apply();
                    openSort(false);
                    sortBtn.focus();
                });
            });
            document.addEventListener('click', function (e) {
                if (!sortWrap.contains(e.target)) openSort(false);
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && !sortMenu.hidden) { openSort(false); sortBtn.focus(); }
            });
        }

        /* Altura da barra sticky -> var CSS (posiciona a gaveta de filtros no mobile) */
        var shopBar = root.querySelector('[data-shop-bar]');
        function setBarH() {
            if (shopBar) root.style.setProperty('--shop-bar-h', shopBar.offsetHeight + 'px');
        }
        setBarH();
        window.addEventListener('resize', setBarH);

        /* Toggle da sidebar (mobile) */
        var ftBtn = root.querySelector('[data-filter-toggle]');
        if (ftBtn) {
            var icon = ftBtn.querySelector('.shop-bar__filter-icon');
            ftBtn.addEventListener('click', function () {
                var open = root.classList.toggle('is-filters-open');
                ftBtn.setAttribute('aria-expanded', String(open));
                if (icon) icon.textContent = open ? '×' : '+';
            });
        }

        /* Limpar tudo */
        function resetAll() {
            state.categories = [];
            state.colors = [];
            state.sort = 'newest';
            paintCatBtns();
            colBtns.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
            updateSortUI('newest', 'NEWEST');
            if (pf && pf._reset) pf._reset();
            apply();
        }
        Array.prototype.forEach.call(root.querySelectorAll('[data-filter-reset]'), function (b) {
            b.addEventListener('click', resetAll);
        });

        apply();
    }

    /* ---- Journal: mini-carrossel da featured story (setas + índice) ---- */
    function initJournalFeature() {
        var sec = document.querySelector('[data-feature]');
        var dataEl = document.getElementById('feature-data');
        if (!sec || !dataEl) return;

        var items;
        try { items = JSON.parse(dataEl.textContent); } catch (e) { return; }
        if (!items || items.length < 2) return;   // nada para ciclar

        var i = 0;
        var els = {
            bg:       sec.querySelector('[data-feature-bg]'),
            category: sec.querySelector('[data-feature-category]'),
            title:    sec.querySelector('[data-feature-title]'),
            text:     sec.querySelector('[data-feature-text]'),
            date:     sec.querySelector('[data-feature-date]'),
            byline:   sec.querySelector('[data-feature-byline]'),
            link:     sec.querySelector('[data-feature-link]'),
            cardLink: sec.querySelector('[data-feature-card-link]'),
            index:    sec.querySelector('[data-feature-index]'),
        };

        function paint() {
            var it = items[i];
            if (els.bg) els.bg.src = it.bgUrl;
            els.category.textContent = it.category;
            els.title.textContent = it.title;
            els.text.textContent = it.text;
            els.date.textContent = it.date;
            els.byline.textContent = it.byline;
            els.link.href = it.href;
            if (els.cardLink) els.cardLink.href = it.href;
            els.index.textContent = it.index;
        }

        function go(dir) {
            i = (i + dir + items.length) % items.length;
            if (reduceMotion) { paint(); return; }
            sec.classList.add('is-fading');
            window.setTimeout(function () {
                paint();
                sec.classList.remove('is-fading');
            }, 260);
        }

        var prev = sec.querySelector('[data-feature-prev]');
        var next = sec.querySelector('[data-feature-next]');

        /* Avanço automático — é mesmo um carrossel: a imagem/história muda
           sozinha de X em X tempo. Qualquer clique manual reinicia o temporizador
           para não "saltar" logo a seguir a uma interação do utilizador. */
        var intervalMs = parseInt(sec.dataset.featureInterval, 10) || 6000;
        var timer = null;
        function restartTimer() {
            if (timer) window.clearInterval(timer);
            timer = window.setInterval(function () { go(1); }, intervalMs);
        }
        function manualGo(dir) { go(dir); restartTimer(); }

        if (prev) prev.addEventListener('click', function () { manualGo(-1); });
        if (next) next.addEventListener('click', function () { manualGo(1); });
        restartTimer();

        /* Pausa em hover/foco (acessibilidade + não competir com a leitura). */
        sec.addEventListener('mouseenter', function () { if (timer) window.clearInterval(timer); });
        sec.addEventListener('mouseleave', restartTimer);
        sec.addEventListener('focusin', function () { if (timer) window.clearInterval(timer); });
        sec.addEventListener('focusout', restartTimer);
    }

    /* ---- Journal: filtro de categoria + pesquisa por título ---- */
    function initJournalFilters() {
        var root = document.querySelector('[data-journal]');
        if (!root) return;

        var grids = Array.prototype.slice.call(root.querySelectorAll('.journal-grid'));
        var primaryGrid = grids[0];
        var newsStrip = root.querySelector('.journal-news-strip');
        var emptyEl = root.querySelector('[data-journal-empty]');
        var state = { categories: [], query: '' };

        // A faixa de newsletter a meio da listagem é só decorativa — não deve
        // impedir que TODOS os cartões de uma categoria subam para o topo da
        // página ao filtrar. Guarda a posição original de cada célula (grelha +
        // vizinho seguinte) para poder restaurar o layout de 2 grupos quando o
        // filtro volta a "ALL".
        var home = Array.prototype.slice.call(root.querySelectorAll('.journal-grid .cell')).map(function (cell) {
            return { cell: cell, parent: cell.parentNode, next: cell.nextSibling };
        });

        function restoreLayout() {
            home.forEach(function (h) { h.parent.insertBefore(h.cell, h.next); h.cell.hidden = false; });
            grids.forEach(function (g) { g.hidden = false; });
            if (newsStrip) newsStrip.hidden = false;
        }

        function apply() {
            var isFiltering = state.categories.length > 0 || !!state.query;
            var visible = 0;

            if (!isFiltering) {
                restoreLayout();
                visible = home.length;
            } else {
                if (newsStrip) newsStrip.hidden = true;
                grids.forEach(function (g, idx) { g.hidden = idx !== 0; });
                home.forEach(function (h) {
                    var post = h.cell.querySelector('.journal-post');
                    var okCat = state.categories.length === 0 || state.categories.indexOf(post.dataset.category) >= 0;
                    var okQuery = !state.query || post.dataset.title.indexOf(state.query) >= 0;
                    if (okCat && okQuery) {
                        h.cell.hidden = false;
                        primaryGrid.appendChild(h.cell);
                        visible++;
                    } else {
                        h.cell.hidden = true;
                    }
                });
            }

            if (emptyEl) emptyEl.hidden = visible !== 0;
        }

        /* Categorias (multi-selecção) — "ALL" limpa a selecção; qualquer
           categoria específica alterna independentemente, e desmarcar a
           última devolve automaticamente ao estado "ALL" (mesmo padrão da
           shop, ver initShop). */
        var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-filter="category"] .journal-tab'));
        function paintTabs() {
            var none = state.categories.length === 0;
            tabs.forEach(function (b) {
                var on = b.dataset.value === 'all' ? none : state.categories.indexOf(b.dataset.value) >= 0;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', String(on));
            });
        }
        tabs.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var val = btn.dataset.value;
                if (val === 'all') {
                    state.categories = [];
                } else {
                    var i = state.categories.indexOf(val);
                    if (i >= 0) state.categories.splice(i, 1); else state.categories.push(val);
                }
                paintTabs();
                apply();
            });
        });

        var toggle = root.querySelector('[data-search-toggle]');
        var input  = root.querySelector('[data-search-input]');
        if (toggle && input) {
            toggle.addEventListener('click', function () {
                var open = input.hidden;
                input.hidden = !open;
                toggle.setAttribute('aria-expanded', String(open));
                if (open) input.focus();
            });
            input.addEventListener('input', function () {
                state.query = input.value.trim().toLowerCase();
                apply();
            });
        }
    }

    /* ---- Contador do carrinho (sessionStorage, sem back-end) ----
       Qualquer página pode disparar window.dispatchEvent(new CustomEvent(
       'loop:cart-change', {detail:{qty:1}})) (ou qty:-1 para retirar) para
       ajustar o "(0)" do header; o valor persiste (na aba) enquanto se
       navega entre páginas, e nunca desce abaixo de zero. */
    function initCartBadge() {
        // O WooCommerce (loopclub-cart.js + wc-cart-fragments) já actualiza o
        // "(N)" real do carrinho nesta instalação — evita que a simulação por
        // sessionStorage do protótipo sobreponha o valor real.
        if (typeof window.loopclubCart !== 'undefined') return;
        var KEY = 'loop_cart_count';
        var cartLink = document.querySelector('.site-nav__item--cart .site-nav__link');
        if (!cartLink) return;
        var textEl = cartLink.querySelector('[data-text]');

        function readCount() {
            try {
                var v = parseInt(sessionStorage.getItem(KEY), 10);
                return isNaN(v) ? null : v;
            } catch (e) { return null; }
        }
        function paint(n) {
            var label = '(' + n + ')';
            if (textEl) textEl.textContent = label;
            cartLink.setAttribute('aria-label', 'Cart, ' + n + ' items');
        }

        var stored = readCount();
        if (stored !== null) paint(stored);

        window.addEventListener('loop:cart-change', function (e) {
            var qty = (e.detail && typeof e.detail.qty === 'number') ? e.detail.qty : 1;
            var n = Math.max(0, (readCount() || stored || 0) + qty);
            try { sessionStorage.setItem(KEY, String(n)); } catch (err) { /* privacy mode: ignora */ }
            stored = n;
            paint(n);
        });
    }

    /* ---- Página de produto: galeria, cor/tamanho, adicionar ao carrinho ---- */
    function initProductPage() {
        var root = document.querySelector('[data-product]');
        if (!root) return;

        /* Galeria: clicar numa miniatura troca a imagem principal */
        var mainImg = root.querySelector('[data-gallery-main] img');
        var thumbs  = Array.prototype.slice.call(root.querySelectorAll('[data-gallery-thumb]'));
        thumbs.forEach(function (thumb) {
            thumb.addEventListener('click', function () {
                if (!mainImg || !thumb.dataset.src) return;
                mainImg.src = thumb.dataset.src;
                thumbs.forEach(function (t) { t.classList.toggle('is-active', t === thumb); });
            });
        });

        /* Cor e tamanho: selecção única por grupo */
        function singleSelect(selector) {
            var opts = Array.prototype.slice.call(root.querySelectorAll(selector));
            opts.forEach(function (opt) {
                opt.addEventListener('click', function () {
                    opts.forEach(function (o) {
                        var on = o === opt;
                        o.classList.toggle('is-active', on);
                        o.setAttribute('aria-pressed', String(on));
                    });
                });
            });
        }
        singleSelect('[data-swatch]');
        singleSelect('[data-size]');

        /* Quantidade + "ADD TO CART": em produção com WooCommerce, o
           loopclub-cart.js trata do stepper (input real) e do envio AJAX real
           do formulário — evita duplo binding sobre o mesmo botão/estado. */
        if (typeof window.loopclubCart !== 'undefined') return;

        /* Quantidade — stepper simples (mínimo 1) que decide quantas unidades
           o botão "ADD TO CART" despacha de uma vez. */
        var qtyValue = root.querySelector('[data-qty-value]');
        var qtyDec   = root.querySelector('[data-qty-decrease]');
        var qtyInc   = root.querySelector('[data-qty-increase]');
        var qty = 1;
        function paintQty() { if (qtyValue) qtyValue.textContent = String(qty); }
        if (qtyDec) qtyDec.addEventListener('click', function () { qty = Math.max(1, qty - 1); paintQty(); });
        if (qtyInc) qtyInc.addEventListener('click', function () { qty = qty + 1; paintQty(); });

        /* Adicionar/retirar do carrinho — sem back-end: alterna entre os dois
           estados (não incrementa a cada clique) e despacha um evento global
           que ajusta o contador do header em conformidade. A quantidade
           adicionada fica fixada no momento do clique — se o utilizador
           mudar o stepper depois, retirar continua a subtrair exactamente
           o que foi adicionado. */
        var addBtn = root.querySelector('[data-add-to-cart]');
        if (addBtn) {
            var label = addBtn.querySelector('[data-add-label]');
            var defaultLabel = label ? label.textContent : '';
            var added = false;
            var addedQty = 0;
            addBtn.addEventListener('click', function () {
                added = !added;
                if (added) addedQty = qty;
                window.dispatchEvent(new CustomEvent('loop:cart-change', { detail: { qty: added ? addedQty : -addedQty } }));
                addBtn.classList.toggle('is-added', added);
                addBtn.setAttribute('aria-pressed', String(added));
                if (label) label.textContent = added ? 'ADDED (' + addedQty + ') ✓' : defaultLabel;
            });
        }
    }

    /* ---- Página de carrinho: quantidade por linha, remover, totais ----
       Sem back-end: os totais são recalculados no cliente a partir dos
       data-price de cada linha, e o badge do header (contador do carrinho)
       é reescrito directamente em sessionStorage — a mesma chave que
       initCartBadge() lê nas restantes páginas, para o número persistir
       ao navegar. */
    function initCartPage() {
        var root = document.querySelector('[data-cart]');
        if (!root) return;

        var rows       = Array.prototype.slice.call(root.querySelectorAll('[data-cart-row]'));
        var emptyEl    = root.querySelector('[data-cart-empty]');
        var subtotalEl = root.querySelector('[data-cart-subtotal]');
        var totalEl    = root.querySelector('[data-cart-grand-total]');
        var cartLink   = document.querySelector('.site-nav__item--cart .site-nav__link');
        var cartText   = cartLink ? cartLink.querySelector('[data-text]') : null;

        function fmt(v) { return v.toFixed(2).replace('.', ',') + '€'; }

        function recalc() {
            var subtotal = 0;
            var totalQty = 0;
            rows.forEach(function (row) {
                if (row.hidden) return;
                var price = parseFloat(row.dataset.price) || 0;
                var qtyEl = row.querySelector('[data-qty-value]');
                var qty   = parseInt(qtyEl.textContent, 10) || 1;
                var lineTotal = price * qty;
                row.querySelector('[data-cart-line-total]').textContent = fmt(lineTotal);
                subtotal += lineTotal;
                totalQty += qty;
            });

            if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
            if (totalEl) totalEl.textContent = fmt(subtotal);

            if (cartText) cartText.textContent = '(' + totalQty + ')';
            if (cartLink) cartLink.setAttribute('aria-label', 'Cart, ' + totalQty + ' items');
            try { sessionStorage.setItem('loop_cart_count', String(totalQty)); } catch (e) { /* privacy mode: ignora */ }

            var visible = rows.some(function (row) { return !row.hidden; });
            if (emptyEl) emptyEl.hidden = visible;
        }

        rows.forEach(function (row) {
            var dec = row.querySelector('[data-qty-decrease]');
            var inc = row.querySelector('[data-qty-increase]');
            var val = row.querySelector('[data-qty-value]');
            var removeBtn = row.querySelector('[data-cart-remove]');

            dec.addEventListener('click', function () {
                val.textContent = String(Math.max(1, (parseInt(val.textContent, 10) || 1) - 1));
                recalc();
            });
            inc.addEventListener('click', function () {
                val.textContent = String((parseInt(val.textContent, 10) || 1) + 1);
                recalc();
            });
            removeBtn.addEventListener('click', function () {
                row.hidden = true;
                recalc();
            });
        });

        recalc();
    }

    /* ---- Página de checkout: submeter mostra confirmação (sem back-end) ---- */
    function initCheckoutPage() {
        var form = document.querySelector('[data-checkout-form]');
        var confirmEl = document.querySelector('[data-checkout-confirm]');
        var grid = document.querySelector('.checkout-grid');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            form.hidden = true;
            // O resumo passa a ser o único filho do grid — ocupa toda a
            // largura livre em vez de ficar estreito ao lado de um form vazio.
            if (grid) grid.classList.add('is-confirmed');
            if (confirmEl) {
                confirmEl.hidden = false;
                confirmEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }
        });
    }

    /* ---- Acordeão genérico (filtros da shop, detalhes do produto, …) ----
       Dentro de um contentor marcado com [data-accordion-single] (ex.: os
       detalhes do produto), abrir uma secção fecha as restantes — só uma
       fica aberta de cada vez. Fora desse contentor (filtros da shop), cada
       secção continua independente, como já era. */
    function initAccordions() {
        Array.prototype.forEach.call(document.querySelectorAll('[data-accordion]'), function (sec) {
            var btn = sec.querySelector('.filter-group__toggle');
            if (!btn) return;
            btn.addEventListener('click', function () {
                var collapsed = sec.classList.toggle('is-collapsed');
                btn.setAttribute('aria-expanded', String(!collapsed));

                var singleGroup = sec.closest('[data-accordion-single]');
                if (!collapsed && singleGroup) {
                    Array.prototype.forEach.call(singleGroup.querySelectorAll('[data-accordion]'), function (other) {
                        if (other === sec) return;
                        other.classList.add('is-collapsed');
                        var otherBtn = other.querySelector('.filter-group__toggle');
                        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                    });
                }
            });
        });
    }

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(function () {
        initReveal();
        initNav();
        initHeaderScroll();
        initHscroll();
        initParallax();
        initShop();
        initJournalFeature();
        initJournalFilters();
        initAccordions();
        initCartBadge();
        initProductPage();
        initCartPage();
        initCheckoutPage();
    });
})();
