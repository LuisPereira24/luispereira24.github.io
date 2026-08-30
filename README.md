# PORTFOLIO — LUIS PEREIRA

Site estático (HTML + CSS + JS puro). Sem build step: o que está aqui é
exactamente o que vai para o ar.

```
index.html
css/style.css
js/main.js
assets/
  img/      ceu.png, relvado.png, retrato.png, mockups dos works
  video/    animacao.webm
  fonts/    MisterPixel.woff2  (glifos pixel: sol / smiley / boneco)
.nojekyll
```

---

## 1. Online

**https://luispereira24.github.io**

Repositório: `LuisPereira24/luispereira24.github.io` (público, branch `main`,
GitHub Pages a servir da raiz). Esta pasta **é** o repositório — já tem `.git`
e o remote `origin` configurado.

### Actualizar
O Claude faz o commit e o push a partir daqui. Para fazeres tu, precisas do
**Git for Windows** (<https://git-scm.com/download/win>) e depois, no Git Bash:

```bash
cd "/d/1 PHOTOSHOP/Portfolio/PORTFOLIO - LUIS"
git add .
git commit -m "o que mudou"
git push
```

O site actualiza sozinho ~1 minuto depois do push.

### Domínio próprio (quando quiseres)
Settings → Pages → **Custom domain** → `luispereira.pt` → Save.
No registrar: `CNAME` de `www` para `luispereira24.github.io` e registos `A`
para `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
`185.199.111.153`. Depois liga **Enforce HTTPS**.

---

## 2. Assets que ainda faltam

Já cá dentro: `ceu.png`, `relvado.png`, `animacao.webm`.

Exporta do Figma para `assets/img/` (PNG, 2x, sem compressão agressiva —
o site usa `image-rendering: pixelated`, por isso pixel a pixel importa):

| Ficheiro | O que é | Onde entra |
|---|---|---|
| `retrato.png` | a foto do About (nó `DSC01445`) | secção ABOUT |
| `work-loopclub.png` | mockup 1600×900 | card LOOP CLUB |
| `work-aspect.png` | mockup 1600×900 | card ASPECT |
| `work-alphahike.png` | mockup 1600×900 | card ALPHAHIKE |
| `circ-anim.webm` | a animação circular (`CIRCanimPIXEL`) | secção WORKS |

### Fonte dos pictogramas — já instalada

`assets/fonts/MisterPixel.woff2` é a **Mister Pixel 16 pt – ToolsOne**, servida
pelo próprio site (já não depende do que está instalado no Windows de quem
visita). `MisterPixelRegular.woff2` é o alfabeto da mesma família, disponível
sob `font-family: 'MisterPixelText'` caso venhas a precisar.

Mapa dos glifos que interessam (basta escrever a letra num elemento com
`class="pix-font"`):

| Escreves | Aparece | | Escreves | Aparece |
|---|---|---|---|---|
| `X` | sol | | `\` | pasta aberta |
| `D` | smiley a piscar | | `[` | pasta fechada |
| `A` | smiley | | `_` | visto |
| `L` | boneco | | `~` | seta (aponta à esquerda — espelha com `scaleX(-1)`) |
| `M` | boneca | | `V` | coração |
| `Q` | relógio | | `Y` | caixote do lixo |
| `T` | lâmpada | | `]` `^` | lupa + / − |

---

## 3. Como funciona (para quando quiseres mexer)

**Escala.** Todo o layout está desenhado em unidades de 1920px, tal como no
Figma. O JS define `--s = larguraDaJanela / 1920` e o CSS escreve tudo como
`calc(179.864 * var(--s))`. Os números no CSS **são** os números do Figma.

**Camadas.** céu fixo (z 0) → secções (z 1) → hero e textos (z 2) →
relvado fixo (z 5) → transição de pixéis (z 90) → header (z 100).

**Relvado.** `#grassband` está `position: fixed` no fundo do ecrã e só mostra
o topo (~20vh). Como está preso ao ecrã e o `transform` só muda no último
ecrã antes dos WORKS, não treme durante o scroll. Os valores estão em
`scene()` no `main.js`: `minVisible` (quanto se vê no início), `growStart` e
`growLen` (quando e em quanto tempo cresce). O boneco pixel vive dentro desta
banda, por isso desce sempre com o relvado.

**Letras do hero.** `--hero-ink` interpola de `#262626` para `#f9fff9` ao
longo dos primeiros 55% de um ecrã de scroll (`scene()`).

**Transição de pixéis.** Grelha de 18 × 9 em `buildWipe()`. Cada quadrado tem
uma pontuação = `diagonal * (1 - DISPERSAO) + aleatório * DISPERSAO`.
`DISPERSAO = 0.35` (0 = diagonal limpa, 1 = puro caos). De 0 a 50% do scroll
da secção `.pxwipe` os quadrados acendem por ordem crescente; a meio o céu e o
relvado são escondidos; de 50 a 100% apagam-se pela mesma ordem, revelando os
WORKS. Cada célula tem `transition: opacity 90ms`. Para mudar a duração da
transição, muda a altura de `.pxwipe` no CSS (agora 100vh).

**Header.** Os dois `<canvas class="nav__pix">` desenham um campo de pixéis
aleatório, mais denso junto às pontas. Ao passar o rato, os pixéis num raio de
~4 células voltam a ser sorteados; ao sair, o campo é resorteado de novo.
1 pixel do canvas = 1 quadrado (`image-rendering: pixelated`).

**Molduras xadrez.** `fitFrames()` calcula o lado do quadrado como
`largura / N` (N inteiro) e arredonda a altura para um múltiplo exacto desse
lado, por isso nunca fica meio quadrado nas extremidades. Corre no arranque,
no `load` e em cada resize.

**Animações.** `js/pixel-anim.js` é o motor exportado dos teus ficheiros do
gerador (`LinhaPIXEL.html` e `CirculoPIXEL.html`): WebGL com mosaico +
posterize sobre um SVG animado. `PixelAnim(canvas, svg, cfg)` — os pontos de
ligação são `<canvas id="linha-pixel">` e `<canvas id="circ-pixel">`. Ambas
estão forçadas a `#FFE47B`.

**Cards dos works.** A pilha é uma cena presa ao ecrã: `.stack__pin` é
`sticky` e os cards são posicionados por scroll em `stackScroll()`. `j` é
quantos cards já chegaram (contínuo); o mais recente fica centrado e os
anteriores empilham-se `GAP` (240 unidades) acima, saindo por cima do ecrã.
`SPC` (0.8 de um ecrã) é quanto scroll custa cada card. A inclinação de cada
um está na variável `--tilt` no próprio HTML.

**Animação circular.** Vive dentro da mesma cena, atrás dos cards
(`z-index: 0`), com o centro empurrado para baixo e para a direita para
assomar no canto. Exportada do `CirculoPIXEL.html` para `js/pixel-anim.js`.

---

## 4. Ainda por decidir

- A secção **contact** está vazia no Figma. O que está aqui é uma proposta na
  mesma linguagem (email grande + links).
- Cor dos quadrados da transição: `var(--ink)` (`#262626`). Muda em
  `.pxwipe-grid i` se preferires preto puro ou o verde dos works.
- Os textos são o *lorem ipsum* do Figma.
