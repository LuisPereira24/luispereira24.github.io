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

**Faixa de dither.** Entre a aresta de baixo do relvado e o fundo dos WORKS
há uma grelha de quadrados da cor da secção (`buildDither()`/`stepDither()`
no `main.js`), portada do teu `pixel_dither_band_hover_square_cells.html`.
A probabilidade de cada quadrado estar aceso cresce para baixo, contra um
limiar de ruído fixo mais uma ondulação lenta — é isso que desfaz a
fotografia em vez de a cortar a direito. O cursor por perto acende mais
quadrados. Os quatro números que controlam tudo estão juntos no topo:
`D_ROWS` (filas), `D_CELL` (lado do quadrado), `D_RADIUS` e `D_FORCE`.
Como a faixa está colada à aresta de baixo da **imagem**, enquanto o relvado
está preso ao ecrã o recorte esconde-a; só aparece quando ele aterra.

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
`largura / N` (N par) e dá à moldura um anel de exactamente 2 quadrados nos
quatro lados. O resto que falta para a altura fechar num número inteiro de
quadrados vai para o `padding-bottom` do **conteúdo**, não da moldura — por
isso a margem em baixo nunca engorda. Corre no arranque, no `load` e no resize.

**Animações.** `js/pixel-anim.js` é o motor exportado dos teus ficheiros do
gerador (`LinhaPIXEL.html` e `CirculoPIXEL.html`): WebGL com mosaico +
posterize sobre um SVG animado. `PixelAnim(canvas, svg, cfg)` — os pontos de
ligação são `<canvas id="linha-pixel">` e `<canvas id="circ-pixel">`. Ambas
estão forçadas a `#FFE47B`.

**About.** É uma faixa verde com um bloco claro "de lado" lá dentro: o bloco
é um trapézio (`clip-path`) mais alto à esquerda, com uma franja de dois
quadrados em cima e em baixo, cada uma inclinada no seu sentido (+0.597° e
−0.656°), o que dá o aspecto torto do Figma. O texto é Handjet a 45 unidades
justificado, e o botão **DOWNLOAD CV** está na posição do ficheiro
(722, 774.5) com a moldura de quatro barras de 10 unidades e os cantos
recortados. Ao passar o rato o interior enche-se de preto de baixo para cima,
o texto e a seta passam a claro, o botão levanta-se e a seta faz um salto
descendente em `steps(4)`. O ficheiro que descarrega é `assets/cv.pdf` — falta
lá pôr o PDF.

**Rodapé.** O fundo é o resto do relvado de cima, com o enquadramento do
Figma (caixa de 1185 unidades a começar 541 acima do topo da secção, imagem
esticada a 2400 e puxada 1153 para cima). A animação é a `LinhaPIXEL2`,
espelhada e rodada 175.9° como no ficheiro, a sangrar pela direita.

**Ícones pixel.** Todos passam pelo mesmo motor: `buildPhysics()` varre os
elementos `.physics` e cria uma cena de Matter.js por cada um. São quatro —
o hero (sol e smiley), o cabeçalho dos works (pasta), a faixa verde acima do
about (a carinha) e o próprio bloco claro (a mão). Acrescentar outro é criar
um `<span class="pix" data-x data-y data-w data-h>` dentro de um `.physics`.

**Cards dos works.****Cards dos works.** A pilha é uma cena presa ao ecrã: `.stack__pin` é
`sticky` e os cards são posicionados por scroll em `stackScroll()`. `j` é
quantos cards já chegaram (contínuo); o mais recente fica centrado e os
anteriores empilham-se `GAP` (240 unidades) acima, saindo por cima do ecrã.
`SPC` (0.8 de um ecrã) é quanto scroll custa cada card. A inclinação de cada
um está na variável `--tilt` no próprio HTML.

**Animação circular.** Vive dentro da mesma cena, atrás dos cards
(`z-index: 0`), com o centro empurrado para baixo e para a direita para
assomar no canto. Exportada do `CirculoPIXEL.html` para `js/pixel-anim.js`.

---

## 4. Desempenho

O código já não leva comentários — as explicações vivem todas neste ficheiro.

**Animações de píxeis.** Eram o custo dominante: cada uma re-serializa e
rasteriza um SVG inteiro por frame, e as três corriam sempre, mesmo fora do
ecrã. Agora cada `<canvas>` tem um `IntersectionObserver`: só anima o que está
visível, pára com o separador em segundo plano, e o relógio está preso à
grelha de keyframes que a própria animação declara (`timeline.frameStep`), por
isso não se redesenha duas vezes o mesmo frame. A textura só é enviada para a
GPU quando há imagem nova; o desenho em si continua a 60 fps, que é barato.

**Loop principal.** Não corre com o separador escondido. As alturas dos cards
ficam em cache em vez de serem lidas a cada frame (cada leitura forçava um
reflow), a faixa de dither actualiza a 25 fps em vez de 60, e os corpos do
Matter.js adormecem quando param.

**Imagens.** WebP com PNG de recurso via `<picture>`: 7,3 MB → 611 KB, sem
perda visível. O céu passou de 2,4 MB para 24 KB. O retrato e o relvado do
rodapé carregam em `lazy`, já que estão abaixo da dobra. Os PNG originais
ficam na pasta — se substituíres algum, gera o `.webp` ao lado com o mesmo nome.

---

## 5. Ainda por decidir

- A secção **contact** está vazia no Figma. O que está aqui é uma proposta na
  mesma linguagem (email grande + links).
- Cor dos quadrados da transição: `var(--ink)` (`#262626`). Muda em
  `.pxwipe-grid i` se preferires preto puro ou o verde dos works.
- Os textos são o *lorem ipsum* do Figma.

## 6. Outras resolucoes (base de 710)

Abaixo de 900 px de largura o site deixa de usar o desenho de 1920 e passa a usar
o frame de 710 do Figma (FIRST SCENE TEL / SCROLLED VERSION TEL). O mecanismo e o
mesmo: uma variavel de escala.

- `--s = largura / 1920` -> usada acima de 900 px
- `--m = largura / 710`  -> usada abaixo de 900 px

Todas as medidas do bloco `@media (max-width: 900px)` sao os numeros do Figma
multiplicados por `--m`, tal como no desenho de computador se multiplica por `--s`.

Notas de implementacao:

- O bloco "i am / WEB & BRAND DESIGNER / based in / PORTUGAL" esta ancorado ao
  relvado (`--hero-anchor`, definido no JS) e nao ao topo. Em ecras mais altos que
  a proporcao do Figma e o ceu que estica, e o bloco continua escondido por tras do
  relvado ao entrar na pagina.
- O relvado usa o enquadramento do Figma: a imagem tem 1920 de largura num quadro
  de 710, ou seja 2,70x a largura do ecra, centrada.
- A tela da animacao do circulo e maior que o circulo desenhado. Os valores de
  `left/top/width/height` no bloco de telemovel foram calculados a partir do SVG
  (circulo centrado em 960,540 com raio 300 num viewBox de 1920x1080) para que o
  circulo caia exactamente em (218, -691) com 994 de lado, como no Figma.
- Ecras com menos de 620 px de altura (telemovel deitado) voltam a mostrar os cards
  em coluna, porque o card nao cabe no ecra.

## 7. Ecra de carregamento

O estilo e a logica do loader estao dentro do `index.html`, e nao nos ficheiros
de css/js, de proposito: tem de pintar no primeiro frame, antes de o resto
carregar. Pela mesma razao a escala (`--s` e `--m`) e definida por um script
minusculo no `<head>`, para a pagina nascer ja com as medidas certas em vez de
esperar pelo `main.js`.

- fundo `#262626`, quadrados brancos `#f9fff9`
- a palavra "loading" com tres pontos que contam 1, 2, 3 e reiniciam
- barra de 16 quadrados que enchem com o progresso real (imagens, tipos de
  letra e evento `load`)
- saida em pixeis: uma grelha de quadrados da cor do fundo desaparece um a um,
  cada um com um atraso aleatorio ate 520 ms e transicao instantanea
- tempo minimo no ecra de 700 ms (para nao piscar) e limite de 7 s (para nunca
  prender o utilizador)
- `prefers-reduced-motion`: sai sem animacao
- ao sair dispara `site:relayout`, que faz o `main.js` medir tudo de novo:
  enquanto o loader esteve no ecra o scroll estava bloqueado e a largura util
  era outra, por isso as posicoes calculadas antes disso nao serviam

## 8. Loop Club (site em WordPress)

O botao "CHECK WEBSITE" do primeiro card abre `loopclub/`, uma copia estatica do
site WordPress publicada neste mesmo repositorio:
`https://luispereira24.github.io/loopclub/`.

Porque estatica: o GitHub Pages so serve ficheiros, nao corre PHP nem base de
dados. A copia mantem o aspecto, a navegacao, os videos e as imagens; nao
funciona o que precisa de servidor (carrinho, checkout, formularios, pesquisa).

### Como actualizar a copia

1. No WordPress: WooCommerce -> Site visibility -> **Live** (se estiver em
   "Coming soon" o export sai todo com o aviso "Pardon our dust")
2. Simply Static -> Destination URL: `luispereira24.github.io/loopclub`
   (sem `https://` a frente, que o campo ja o poe; caso contrario todos os
   links saem como `https://https://...`)
3. Generate -> ZIP -> deixar o ZIP nesta pasta

O tratamento do ZIP faz sempre o mesmo:

- **filtragem**: o export traz ~126 MB e 4300 ficheiros, muito disso o
  JavaScript do editor do WordPress que um site estatico nunca usa. Guarda-se
  o que as paginas e as folhas de estilo referem de facto (fecho do grafo de
  dependencias), mais o tema completo e todos os uploads: ~600 ficheiros, 24 MB
- **enderecos**: os links absolutos passam a relativos, calculados pela
  profundidade de cada ficheiro, para a copia funcionar em qualquer endereco.
  Os sitemaps ficam absolutos, como devem ser
- **restos locais**: `/wp-loopclub/` (caminho do WordPress local) e trocado
  por `/loopclub/`
- o ZIP nao entra no repositorio (esta no `.gitignore`)

### Avisos conhecidos na consola

- `wp-content/themes/loopclub-child/assets/css/custom.css` da 404 — esse
  ficheiro nao existe nem na instalacao original, e um 404 que ja la estava
- `wp-emoji-release.min.js` da 404 — script de emojis do WordPress, nao
  exportado, sem efeito
- pedidos `wc-ajax` devolvem 405 — sao chamadas POST do carrinho do
  WooCommerce, que um alojamento estatico nao atende

## 9. ASPECT (site estatico)

Vive em `aspect/` e esta ligado ao botao CHECK WEBSITE do card ASPECT
(`href="aspect/"`, abre em separador novo).

Ao contrario do Loop Club, este ja era HTML/CSS/JS normal — nao houve
exportacao nenhuma, a pasta entrou tal e qual, com todos os caminhos
relativos que ja tinha.

**O que fica de fora do repositorio.** As pastas do Bootstrap e do Font
Awesome traziam 25 MB de ficheiros que o site nunca carrega: versoes nao
minificadas, variantes RTL, source maps e a pasta `svgs-full` inteira. O
`.gitignore` deixa passar so o que as paginas pedem — `bootstrap.min.css`,
`bootstrap.min.js`, `all.min.css`, `all.min.js`, as quatro webfonts e o AOS.
Resultado: 53 ficheiros, ~5 MB.

Se um dia usares um ficheiro do vendor que hoje esta ignorado, tens de o
tirar da lista no `.gitignore` — senao o `git add` ignora-o em silencio e o
site publicado fica sem ele.

**Uma imagem partida, de proposito.** Em `contactos.html` o pin do mapa
aponta para `figma.com/api/mcp/asset/...`, um endereco temporario do Figma
que expira. Nao lhe mexi (mexer era alterar o site). Para resolver, guarda
a imagem em `aspect/img/` e troca o `src`.

O mapa em si vem do MapTiler com uma chave publica no URL — funciona, mas
qualquer pessoa a consegue ler no codigo-fonte.
