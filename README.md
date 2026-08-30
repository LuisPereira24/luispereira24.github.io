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

## 1. Pôr isto online no GitHub Pages

### 1.1 Instalar o Git (uma vez)
1. Descarrega o **Git for Windows**: <https://git-scm.com/download/win>
2. Instala com as opções por omissão.
3. Abre o **Git Bash** e identifica-te:
   ```bash
   git config --global user.name "Luis Pereira"
   git config --global user.email "o-teu-email@exemplo.com"
   ```

### 1.2 Criar o repositório no GitHub
1. <https://github.com/new>
2. **Repository name:**
   - `SEU-USERNAME.github.io` → o site fica em `https://SEU-USERNAME.github.io`
     (recomendado para um portfólio pessoal)
   - ou `portfolio` → fica em `https://SEU-USERNAME.github.io/portfolio/`
3. **Public**. Não marques "Add a README" (já existe um aqui).
4. `Create repository`.

### 1.3 Enviar os ficheiros
No Git Bash, dentro desta pasta:

```bash
cd "/d/1 PHOTOSHOP/Portfolio/PORTFOLIO - LUIS"
git init
git add .
git commit -m "primeira versao do portfolio"
git branch -M main
git remote add origin https://github.com/SEU-USERNAME/SEU-REPO.git
git push -u origin main
```

Na primeira vez o Git pede autenticação — abre uma janela do browser, faz login
no GitHub e autoriza.

### 1.4 Ligar o GitHub Pages
1. No repositório → **Settings** → **Pages** (menu da esquerda).
2. **Source:** `Deploy from a branch`
3. **Branch:** `main` · **Folder:** `/ (root)` → **Save**
4. Ao fim de ~1 minuto o URL aparece no topo dessa página.

> O ficheiro `.nojekyll` já está incluído — impede o GitHub de ignorar
> pastas começadas por `_` e evita surpresas.

### 1.5 Actualizações seguintes
```bash
git add .
git commit -m "o que mudou"
git push
```

### 1.6 Domínio próprio (opcional)
Settings → Pages → **Custom domain** → escreve `luispereira.pt` → Save.
No registrar do domínio cria um `CNAME` de `www` para `SEU-USERNAME.github.io`
e registos `A` para `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
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

E, se possível, a fonte **Mister Pixel 16 pt – ToolsOne** convertida para
`assets/fonts/MisterPixel.woff2` (<https://cloudconvert.com/ttf-to-woff2>).
É a fonte dos glifos `X` (sol), `D` (smiley), `L` (boneco) e da seta dos botões.
Enquanto não estiver lá, o site usa a versão instalada no teu Windows — vê-se
bem a ti, mas não a quem visitar o site.

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

**Animação do hero.** `js/linha-pixel.js` foi exportado a partir do teu
`LinhaPIXEL.html` (WebGL: mosaico + posterize sobre um SVG animado). Se
gerares uma versão nova, é só voltar a exportar por cima — o único ponto de
ligação é o `<canvas id="linha-pixel">`.

**Cards dos works.** `position: sticky` + `IntersectionObserver`. A inclinação
de cada um está na variável `--tilt` no próprio HTML.

---

## 4. Ainda por decidir

- A secção **contact** está vazia no Figma. O que está aqui é uma proposta na
  mesma linguagem (email grande + links).
- Cor dos quadrados da transição: `var(--ink)` (`#262626`). Muda em
  `.pxwipe-grid i` se preferires preto puro ou o verde dos works.
- Os textos são o *lorem ipsum* do Figma.
