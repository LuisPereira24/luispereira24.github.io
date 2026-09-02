(function () {
  'use strict';

  function PixelAnim(OUT, SVG_SOURCE, CFG) {
    if (!OUT) return;
    // permite abrandar/acelerar de fora (ex.: rato por cima do hero)
    OUT.setAnimSpeed = function (v) { CFG.speed = v; };
    // permite trocar a cor de fora (ex.: rato sobre o email do rodape)
    OUT.setAnimColor = function (r, g, b) { CFG.forceRGB = [r, g, b]; };

const ANIM_TAGS = /^(set|animate|animateTransform|animateMotion)$/i; const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const COLOR_PROPS = ["fill","stroke"];
const BAKE_PROPS = ["transform","transform-origin","transform-box","opacity","fill","fill-opacity","fill-rule","stroke","stroke-opacity","stroke-width","stroke-linecap","stroke-linejoin","stroke-dasharray","stroke-dashoffset","stroke-miterlimit","cx","cy","r","rx","ry","x","y","width","height","x1","y1","x2","y2","font-size","font-family","font-weight","letter-spacing","text-anchor","filter","clip-path","mask","mix-blend-mode","visibility","display"];
function parseTime(v) {
  if (!v) return 0;
  v = String(v).trim().split(';')[0].trim();
  if (/^\d*\.?\d+ms$/.test(v)) return parseFloat(v)/1000;
  const m = v.match(/^(-?\d*\.?\d+)s?$/);
  return m ? parseFloat(m[1]) : 0;
}

function buildTimeline(svg) {
  const all = [...svg.querySelectorAll('*')];
  const tracks = []; let total = 0;
  for (const node of svg.querySelectorAll('set,animate,animateTransform,animateMotion')) {
    const idx = all.indexOf(node.parentElement); if (idx < 0) continue;
    const attr = node.getAttribute('attributeName') ||
                 (node.tagName.toLowerCase() === 'animatetransform' ? 'transform' : null);
    const begin = parseTime(node.getAttribute('begin')), dur = parseTime(node.getAttribute('dur'));
    const repeat = node.getAttribute('repeatCount');
    const loops = repeat === 'indefinite' ? Infinity : (parseFloat(repeat) || 1);
    let values = node.getAttribute('values');
    values = values ? values.split(';').map(s => s.trim()).filter(Boolean) : null;
    const from = node.getAttribute('from'), to = node.getAttribute('to');
    if (!values) values = from != null ? [from, to] : (to != null ? [to] : null);
    if (!attr || !values) continue;
    tracks.push({ idx, attr, begin, dur, loops, values,
      discrete: node.tagName.toLowerCase()==='set' || node.getAttribute('calcMode')==='discrete',
      isTransform: node.tagName.toLowerCase()==='animatetransform',
      type: node.getAttribute('type') || 'translate',
      freeze: node.getAttribute('fill') === 'freeze' });
    total = Math.max(total, begin + dur * (loops === Infinity ? 1 : loops));
  }
  // Intervalo típico entre keyframes: usado para prender o relógio à grelha
  // real da animação em vez de rasterizar em instantes arbitrários.
  const begins = [...new Set(tracks.map(t => t.begin))].sort((a,b) => a-b);
  let frameStep = 0;
  if (begins.length > 2) {
    const gaps = [];
    for (let i = 1; i < begins.length; i++) {
      const g = begins[i] - begins[i-1];
      if (g > 0.0005) gaps.push(g);
    }
    if (gaps.length) { gaps.sort((a,b)=>a-b); frameStep = gaps[Math.floor(gaps.length/2)]; }
  }
  return { tracks, duration: total || 1, frameStep };
}

function lerpStr(a, b, t) {
  const an = a.match(NUM), bn = b.match(NUM);
  if (!an || !bn || an.length !== bn.length) return t < .5 ? a : b;
  if (a.replace(NUM,'#') !== b.replace(NUM,'#')) return t < .5 ? a : b;
  let i = 0;
  return a.replace(NUM, () => { const v = +an[i] + (+bn[i]-+an[i])*t; i++; return Math.round(v*1000)/1000; });
}

function sampleTrack(tr, time) {
  let local = time - tr.begin;
  if (local < 0) return null;
  const span = tr.dur * (tr.loops === Infinity ? 1 : tr.loops);
  if (tr.loops === Infinity) local = tr.dur > 0 ? local % tr.dur : 0;
  else if (local > span) { if (!tr.freeze) return null; local = span; }
  const n = tr.values.length;
  if (n === 1) return tr.values[0];
  const p = tr.dur > 0 ? Math.min(local/tr.dur, 1) : 1;
  if (tr.discrete) return tr.values[Math.min(Math.floor(p*n), n-1)];
  const f = p*(n-1), i = Math.min(Math.floor(f), n-2);
  return lerpStr(tr.values[i], tr.values[i+1], f-i);
}

function normColor(v) {
  if (!v || v === 'none' || v === 'transparent' || /^(url|context)/.test(v)) return null;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const m = v.match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const p = m[1].split(/[\s,\/]+/).map(Number);
  if (p.length >= 4 && p[3] === 0) return null;
  return '#' + p.slice(0,3).map(n => (n|0).toString(16).padStart(2,'0')).join('');
}

function bakeSVG(liveSVG, timeline, time, tint, base) {
  const clone = liveSVG.cloneNode(true);
  const a = [...liveSVG.querySelectorAll('*')], b = [...clone.querySelectorAll('*')];
  const applied = new Map();
  for (const tr of timeline.tracks) {
    const v = sampleTrack(tr, time); if (v == null) continue;
    const el = b[tr.idx]; if (!el) continue;
    el.setAttribute(tr.attr, tr.isTransform ? tr.type + '(' + v + ')' : v);
    if (!applied.has(tr.idx)) applied.set(tr.idx, new Set());
    applied.get(tr.idx).add(tr.attr);
  }
  for (let i = 0; i < a.length; i++) {
    if (ANIM_TAGS.test(b[i].tagName)) { b[i].remove(); continue; }
    const own = applied.get(i), cs = getComputedStyle(a[i]);
    let css = '';
    for (const p of BAKE_PROPS) {
      if (own && own.has(p)) continue;
      let v = cs.getPropertyValue(p);
      if (!v || v === 'none' || v === 'auto' || v === 'normal') continue;
      if (tint && COLOR_PROPS.includes(p) && normColor(v) === base) v = tint;
      css += p + ':' + v + ';';
    }
    b[i].setAttribute('style', css);
    if (tint) for (const p of COLOR_PROPS) {
      const av = b[i].getAttribute(p);
      if (av && normColor(av) === base) b[i].setAttribute(p, tint);
    }
  }
  clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
  return new XMLSerializer().serializeToString(clone);
}
const holder = document.createElement('div');
holder.style.cssText='position:fixed;left:-99999px;top:0;opacity:0';
document.body.appendChild(holder);
const doc = new DOMParser().parseFromString(SVG_SOURCE,'image/svg+xml');
const liveSVG = document.importNode(doc.documentElement,true);
liveSVG.setAttribute('width',CFG.w); liveSVG.setAttribute('height',CFG.h);
holder.appendChild(liveSVG);
const timeline = buildTimeline(liveSVG);
const src=document.createElement('canvas'); src.width=CFG.w; src.height=CFG.h;
const sctx=src.getContext('2d');
const gl=OUT.getContext('webgl',{premultipliedAlpha:false,alpha:true});
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o;}
const prog=gl.createProgram();
gl.attachShader(prog,sh(gl.VERTEX_SHADER,"attribute vec2 pos; varying vec2 uv;\n  void main(){ uv=vec2(pos.x*.5+.5,.5-pos.y*.5); gl_Position=vec4(pos,0.,1.); }"));
gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,"precision mediump float; varying vec2 uv;\n  uniform sampler2D tex; uniform vec2 blocks, texel;\n  uniform float levels, useMosaic, usePosterize, sharp, alphaCut, alphaThresh, alphaSteps;\n  uniform float ditherType, ditherAmt, ditherSize, ditherAlpha, ditherOn;\n  uniform float forceOn, forceThresh, bgOpaque;\n  uniform vec3 forceRGB, bgRGB;\n\n  // Matrizes de Bayer por recursão: bayer2 gera a 2x2, e cada nível\n  // seguinte soma uma cópia a meia escala com um quarto do peso.\n  float bayer0(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }\n  float bayer4(vec2 a) { return bayer0(0.5 * a) * 0.25 + bayer0(a); }\n  float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer0(a); }\n  float hashNoise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n\n  float ditherValue(vec2 pixel) {\n    vec2 p = floor(pixel / max(ditherSize, 1.0));\n    if (ditherType < 0.5) return 0.5;              // sem dither\n    if (ditherType < 1.5) return bayer0(p);        // 2x2\n    if (ditherType < 2.5) return bayer4(p) / 0.9375;\n    if (ditherType < 3.5) return bayer8(p) / 0.9844;\n    return hashNoise(p);                            // ruído\n  }\n\n  // Média do bloco em espaço pré-multiplicado.\n  // Amostrar só o centro faz um bloco inteiro depender de UM píxel da origem:\n  // com bordas anti-aliased em movimento, esse píxel alterna e o bloco pisca.\n  vec4 blockAverage(vec2 cellMin, vec2 cellSize) {\n    vec4 acc = vec4(0.0);\n    float n = 0.0;\n    for (int j = 0; j < 4; j++) {\n      for (int i = 0; i < 4; i++) {\n        vec2 o = (vec2(float(i), float(j)) + 0.5) / 4.0;\n        vec4 s = texture2D(tex, cellMin + o * cellSize);\n        acc += vec4(s.rgb * s.a, s.a);   // pré-multiplica antes de somar\n        n += 1.0;\n      }\n    }\n    acc /= n;\n    return acc.a > 0.0001 ? vec4(acc.rgb / acc.a, acc.a) : vec4(0.0);\n  }\n\n  void main(){\n    vec4 t;\n    if (useMosaic > 0.5) {\n      vec2 cellSize = 1.0 / blocks;\n      vec2 cellMin = floor(uv * blocks) * cellSize;\n      t = sharp > 0.5 ? texture2D(tex, cellMin + cellSize * 0.5)\n                      : blockAverage(cellMin, cellSize);\n    } else {\n      t = texture2D(tex, uv);\n    }\n\n    float dv = ditherValue(gl_FragCoord.xy);\n\n    // Limiar de alfa: abaixo do corte o píxel desaparece por completo,\n    // acima fica totalmente opaco. Sem meios-tons, bordas duras.\n    if (alphaCut > 0.5) {\n      float thr = alphaThresh;\n      // Com dither no alfa, o limiar oscila por píxel e as bordas ganham\n      // uma textura granulada em vez de um recorte liso.\n      if (ditherAlpha > 0.5 && ditherType > 0.5) thr += (dv - 0.5) * ditherAmt;\n      if (t.a < thr) discard;\n      t.a = 1.0;\n    } else if (alphaSteps > 1.5) {\n      t.a = floor(t.a * alphaSteps) / (alphaSteps - 1.0);\n      if (t.a <= 0.0) discard;\n    }\n\n    vec3 c = t.rgb;\n\n    // Quantizacao. Antes multiplicava por levels e dividia por levels-1,\n    // o que amplificava tudo por levels/(levels-1) e empurrava o canal mais\n    // forte de cinzentos escuros para o degrau seguinte — daí os halos azuis\n    // à volta do objeto sobre fundos escuros azulados. Esta forma preserva 0 e 1.\n    if (usePosterize > 0.5 || ditherOn > 0.5) {\n      float L = max(levels, 2.0);\n      if (ditherOn > 0.5 && ditherType > 0.5) c += (dv - 0.5) * ditherAmt / (L - 1.0);\n      c = clamp(c, 0.0, 1.0);\n      c = floor(c * (L - 1.0) + 0.5) / (L - 1.0);\n    }\n\n    // Forçar cor única: o objeto passa a ter uma só cor, sem nuances das\n    // bordas nem deriva da quantização.\n    if (forceOn > 0.5) {\n      float m;\n      if (bgOpaque > 0.5) m = step(forceThresh, distance(t.rgb, bgRGB));\n      else                m = step(forceThresh, t.a);\n      if (m < 0.5 && bgOpaque < 0.5) discard;\n      c = bgOpaque > 0.5 ? mix(bgRGB, forceRGB, m) : forceRGB;\n      if (bgOpaque < 0.5) t.a = 1.0;\n    }\n\n    gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a);\n  }"));
gl.linkProgram(prog); gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const aPos=gl.getAttribLocation(prog,'pos');
gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tex);
[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],
 [gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]]
 .forEach(([k,v])=>gl.texParameteri(gl.TEXTURE_2D,k,v));
const U=n=>gl.getUniformLocation(prog,n);
const img=new Image(); let pending=false,url=null,clock=0,last=performance.now();
let visible=true, frameIdx=-1, texDirty=true;
const STEP = timeline.frameStep > 0.001 ? timeline.frameStep : 1/30;
if ('IntersectionObserver' in window)
  new IntersectionObserver(e=>{ visible = e[0].isIntersecting; }, {rootMargin:'240px'}).observe(OUT);
function loop(now){
  requestAnimationFrame(loop);
  if(!visible || document.hidden){ last=now; return; }
  const dt=Math.min((now-last)/1000,.1); last=now;
  clock=(clock+dt*CFG.speed)%timeline.duration;
  const idx=Math.floor(clock/STEP);
  if(idx!==frameIdx && !pending){ frameIdx=idx; pending=true;
    const blob=new Blob([bakeSVG(liveSVG,timeline,idx*STEP,CFG.tint,CFG.base)],
      {type:'image/svg+xml;charset=utf-8'});
    const next=URL.createObjectURL(blob);
    img.onload=()=>{ sctx.clearRect(0,0,src.width,src.height);
      if(CFG.bg){sctx.fillStyle=CFG.bg;sctx.fillRect(0,0,src.width,src.height);}
      sctx.drawImage(img,0,0,src.width,src.height);
      if(url)URL.revokeObjectURL(url); url=next; pending=false; texDirty=true; };
    img.onerror=()=>{URL.revokeObjectURL(next);pending=false;};
    img.src=next; }
  gl.bindTexture(gl.TEXTURE_2D,tex);
  if(texDirty){ gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src); texDirty=false; }
  gl.uniform2f(U('blocks'),CFG.hb,CFG.vb); gl.uniform1f(U('levels'),CFG.lv);
  gl.uniform2f(U('texel'),1/OUT.width,1/OUT.height);
  gl.uniform1f(U('sharp'),CFG.sharp?1:0);
  gl.uniform1f(U('alphaCut'),CFG.alphaCut?1:0);
  gl.uniform1f(U('alphaThresh'),CFG.alphaThresh);
  gl.uniform1f(U('alphaSteps'),CFG.alphaSteps);
  gl.uniform1f(U('ditherType'),CFG.ditherType);
  gl.uniform1f(U('ditherSize'),CFG.ditherSize);
  gl.uniform1f(U('ditherAmt'),CFG.ditherAmt);
  gl.uniform1f(U('ditherAlpha'),CFG.ditherAlpha?1:0);
  gl.uniform1f(U('ditherOn'),CFG.ditherOn?1:0);
  gl.uniform1f(U('forceOn'),CFG.forceOn?1:0);
  gl.uniform1f(U('forceThresh'),CFG.forceThresh);
  gl.uniform1f(U('bgOpaque'),CFG.bgOpaque?1:0);
  gl.uniform3f(U('forceRGB'),CFG.forceRGB[0],CFG.forceRGB[1],CFG.forceRGB[2]);
  gl.uniform3f(U('bgRGB'),CFG.bgRGB[0],CFG.bgRGB[1],CFG.bgRGB[2]);
  gl.uniform1f(U('useMosaic'),CFG.mosaic?1:0); gl.uniform1f(U('usePosterize'),CFG.posterize?1:0);
  gl.viewport(0,0,OUT.width,OUT.height);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES,0,3);
}
requestAnimationFrame(loop);

  }

  var SVG_LINHA = "<svg fill=\"none\" height=\"100%\" width=\"100%\" viewBox=\"0 0 1920 1080\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns=\"http://www.w3.org/2000/svg\"><g transform=\"matrix(1,0,0,1,888,464)\" id=\"i0\"><g id=\"i1\" transform=\"matrix(1,0,0,1,-32,60)\"><path stroke-linecap=\"round\" stroke-width=\"50\" stroke=\"#ffffff\" d=\"M992.013,-172.063\"><set fill=\"freeze\" dur=\"0.033s\" begin=\"0s\" to=\"M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.033366700033366704s\" to=\"M992.013,-172.063C993.265,-168.243,969.913,-138.252,919.954,-100.078\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.06673340006673341s\" to=\"M992.013,-172.063C993.84,-166.487,943.24,-105.143,833.98,-43.985\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.1001001001001001s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C782.62,-19.983,760.353,-14.203,737.635,-10.44\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.13346680013346682s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C750.981,-8.118,692.498,-1.998,635.234,-6.255\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.16683350016683351s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C718.977,3.883,619.9,0.376,534.332,-24.562\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.2002002002002002s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C684.89,16.666,538.197,-8.125,439.703,-63.991\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.2335669002335669s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C645.4,31.474,437.892,-32.199,360.393,-128.406\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.26693360026693363s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C596.697,49.737,305.837,-82.917,330.959,-223.615\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.3003003003003003s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C563.999,61.999,212.002,-130,367.999,-289.999C374.926,-295.892,381.679,-301.158,388.262,-305.848\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.33366700033366703s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C563.999,61.999,212.002,-130,367.999,-289.999C414.152,-329.264,452.712,-340.769,483.435,-338.98\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.3670337003670337s\" to=\"M992.013,-172.063C994,-166,934,-94,804.001,-28C563.999,61.999,212.002,-130,367.999,-289.999C486.057,-390.436,554.437,-309.242,569.037,-288.5\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4004004004004004s\" to=\"M925.199,-104.131C895.258,-80.729,855.02,-53.903,804.001,-28C563.999,61.999,212.002,-130,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572,-284,594.152,-245.412,605.46,-192.905\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4337671004337671s\" to=\"M845.495,-50.555C832.554,-43.029,818.726,-35.476,804.001,-28C563.999,61.999,212.002,-130,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572,-283.999,627.828,-186.75,607.47,-90.942\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4671338004671338s\" to=\"M757.158,-14.202C521.407,37.782,221.892,-140.144,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.999,669.793,-113.65,559.322,-1.753\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5005005005005005s\" to=\"M661.714,-5.04C450.149,-8.666,241.163,-159.909,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.999,709.824,-43.919,473.403,53.433\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5338672005338673s\" to=\"M566.435,-16.366C394.296,-54.23,260.474,-179.716,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.999,743.847,15.347,374.598,81.064\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5672339005672339s\" to=\"M475.219,-46.124C352.689,-100.626,280.58,-200.337,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.999,773.177,66.439,272.484,92.222\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6006006006006006s\" to=\"M393.187,-95.673C326.3,-150.783,302.853,-223.181,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.998,799.21,111.788,169.742,93.074\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6339673006339673s\" to=\"M335.68,-171.312C322.06,-209.72,329.799,-250.819,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.998,819.998,147.998,80.004,88C75.699,87.651,71.423,87.32,67.165,87.005\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6673340006673341s\" to=\"M346.841,-263.48C352.438,-272.381,359.457,-281.238,367.999,-289.999C501.955,-403.961,571.953,-284.081,572,-284C572.001,-283.998,819.998,147.998,80.004,88C39.829,84.743,1.371,82.959,-35.445,82.499\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7007007007007007s\" to=\"M419.473,-324.597C519.833,-373.342,571.959,-284.07,572,-284C572.001,-283.998,819.998,147.998,80.004,88C0.817,81.58,-71.721,80.885,-138.134,84.762\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7340674007340674s\" to=\"M512.537,-332.934C551.846,-318.517,571.975,-284.043,572,-284C572.001,-283.998,819.998,147.998,80.004,88C-41.893,78.117,-148.045,81.8,-240.339,94.848\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7674341007674341s\" to=\"M580.039,-268.096C616.147,-190.66,734.42,141.06,80.004,88C-88.998,74.298,-227.743,86.673,-341.242,113.928\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8008008008008008s\" to=\"M608.516,-176.622C628.241,-52.997,576.537,128.259,80.004,88C-141.379,70.051,-310.847,96.849,-439.653,143.228\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8341675008341676s\" to=\"M605.149,-81.273C577.614,21.398,457.076,118.573,80.004,88C-200.205,65.281,-397.247,114.251,-533.933,183.876\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8675342008675342s\" to=\"M556.972,0.588C490.579,65.615,352.063,110.059,80.004,88C-267.223,59.848,-486.747,141.777,-621.964,236.681\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9009009009009009s\" to=\"M476.463,52.156C395.84,86.243,270.742,103.465,80.004,88C-345.698,53.485,-579.454,184.434,-701.227,301.898\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9342676009342676s\" to=\"M384.373,79.245C308.762,93.931,209.514,98.501,80.004,88C-444.304,45.49,-677.448,253.977,-768.817,379.129\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9676343009676344s\" to=\"M289.036,91.235C230.107,95.24,160.97,94.565,80.004,88C-659.844,28.014,-819.932,467.814,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.001001001001001s\" to=\"M192.944,93.583C158.128,93.098,120.549,91.288,80.004,88C-659.844,28.014,-819.932,467.814,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.0343677010343677s\" to=\"M96.91,89.298C91.333,88.894,85.698,88.462,80.004,88C-659.844,28.014,-819.932,467.814,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.0677344010677345s\" to=\"M0.994,83.373C-671.359,59.65,-819.935,467.821,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1011011011011012s\" to=\"M-95.09,82.924C-685.711,99.077,-819.938,467.829,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1344678011344678s\" to=\"M-190.989,88.919C-700.466,139.613,-819.941,467.839,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1678345011678346s\" to=\"M-286.129,102.277C-715.601,181.191,-819.945,467.85,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.2012012012012012s\" to=\"M-379.709,123.991C-731.06,223.663,-819.949,467.861,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.234567901234568s\" to=\"M-470.612,155.053C-746.745,266.752,-819.954,467.874,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.2679346012679347s\" to=\"M-557.343,196.317C-762.488,310.002,-819.959,467.888,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3013013013013013s\" to=\"M-638.076,248.341C-778.054,352.765,-819.965,467.905,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3346680013346681s\" to=\"M-710.673,311.204C-793.128,394.177,-819.972,467.924,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3680347013680347s\" to=\"M-772.694,384.507C-807.319,433.163,-819.981,467.948,-820,468M992.013,-172.063\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.4014014014014013s\" to=\"M992.013,-172.063\" attributeName=\"d\" /></path></g></g></svg>";
  var CFG_LINHA = {"hb": 76, "vb": 75, "lv": 6, "speed": 1, "mosaic": true, "posterize": true, "sharp": true, "alphaCut": true, "alphaThresh": 0.32, "alphaSteps": 1, "ditherType": 0, "ditherSize": 1, "ditherAmt": 1, "ditherAlpha": false, "ditherOn": false, "dLv": 4, "forceOn": true, "forceThresh": 0.21, "forceRGB": [1, 0.89411765, 0.48235294], "bgRGB": [0, 0, 0], "bgOpaque": false, "bg": null, "tint": null, "base": "#ffffff", "w": 1600, "h": 900};
  var SVG_CIRC  = "<svg fill=\"none\" height=\"100%\" width=\"100%\" viewBox=\"0 0 1920 1080\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns=\"http://www.w3.org/2000/svg\"><g transform=\"matrix(1,0,0,1,1003,547)\" id=\"i0\"><g id=\"i1\" transform=\"matrix(1,0,0,1,-43,-7)\"><ellipse ry=\"283\" rx=\"283\" cy=\"0\" cx=\"0\" stroke-width=\"0\" stroke=\"#ffffff\"><animate repeatCount=\"indefinite\" attributeName=\"stroke-width\" dur=\"1.57s\" begin=\"0s\" fill=\"freeze\" values=\"0; 35; 0; 0\" keyTimes=\"0; 0.488845; 0.956436; 1\" keySplines=\"0.167 0 0.667 1; 0.333 0 1 1; 0 0 1 1\" calcMode=\"spline\" /></ellipse></g></g></svg>";
  var CFG_CIRC  = {"hb": 120, "vb": 68, "lv": 2, "speed": 1, "mosaic": true, "posterize": true, "sharp": false, "alphaCut": false, "alphaThresh": 0.5, "alphaSteps": 1, "ditherType": 0, "ditherSize": 1, "ditherAmt": 1, "ditherAlpha": false, "ditherOn": false, "dLv": 4, "forceOn": true, "forceThresh": 0.25, "forceRGB": [1, 0.89411765, 0.48235294], "bgRGB": [0, 0, 0], "bgOpaque": false, "bg": null, "tint": null, "base": "#ffffff", "w": 1600, "h": 900};
  var SVG_LINHA2 = "<svg fill=\"none\" height=\"100%\" width=\"100%\" viewBox=\"0 0 1920 1080\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns=\"http://www.w3.org/2000/svg\"><g transform=\"matrix(1,0,0,1,960,540)\" id=\"i0\"><g id=\"i1\"><path stroke-width=\"73\" stroke=\"#ffffff\" d=\"M-1108,-92\"><set fill=\"freeze\" dur=\"0.033s\" begin=\"0s\" to=\"M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.033366700033366704s\" to=\"M-1108,-92C-1107.999,-92,-1067.613,-70.229,-1003.944,-41.664\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.06673340006673341s\" to=\"M-1108,-92C-1107.999,-92,-1019.143,-44.101,-897.246,2.824\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.1001001001001001s\" to=\"M-1108,-92C-1107.999,-91.999,-962.323,-13.471,-788.136,40.991\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.13346680013346682s\" to=\"M-1108,-92C-1107.999,-91.999,-895.24,22.691,-676.519,70.99\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.16683350016683351s\" to=\"M-1108,-92C-1107.999,-91.999,-814.396,66.271,-562.428,89.261\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.2002002002002002s\" to=\"M-1108,-92C-1107.998,-91.999,-713.859,120.466,-447,88.818\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.2335669002335669s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-341.522,58.781,-339.076,57.553,-336.66,56.317\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.26693360026693363s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-301.645,39.158,-268.104,15.719,-241.611,-8.858\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.3003003003003003s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-250.076,13.783,-199.494,-45.213,-172.993,-101.043\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.33366700033366703s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-181.071,-20.172,-148.564,-138.801,-145.939,-212.645\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.3670337003670337s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280,-156.587,-299.182,-171.146,-323.677\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4004004004004004s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280,-171.017,-359.527,-254.515,-401.512\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4337671004337671s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-186.471,-424.151,-366.36,-426.762\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.4671338004671338s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-456.857,-417.719,-469.133,-415.245,-480.853,-412.603\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5005005005005005s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-505.097,-409.16,-553.083,-393.951,-590.712,-377.183\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5338672005338673s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-579.325,-395.99,-650.336,-350.544,-686.927,-314.203\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.5672339005672339s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-260,-733.486,-241.307,-728.216,-211.437\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6006006006006006s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-756.538,-195.879,-667.606,-115.386\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6339673006339673s\" to=\"M-1108,-92C-1107.998,-91.999,-596.001,183.999,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-775.46,-158.593,-572.075,-50.743\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.6673340006673341s\" to=\"M-1006.715,-42.909C-844.515,30.132,-526.259,149.681,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-791.474,-127.035,-466.529,-3.687\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7007007007007007s\" to=\"M-902.918,0.63C-731.785,67.102,-492.656,133.147,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-805.638,-99.123,-356.856,32.874\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7340674007340674s\" to=\"M-796.831,38.245C-642.433,87.485,-463.826,118.961,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-818.519,-73.738,-245.066,62.387\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.7674341007674341s\" to=\"M-688.375,68.306C-564.005,97.139,-436.492,105.511,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-830.448,-50.231,-132.042,86.773\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8008008008008008s\" to=\"M-577.55,87.726C-491.238,97.352,-408.977,91.972,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724,-259.999,-841.634,-28.188,-18.248,107.218\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8341675008341676s\" to=\"M-465.157,90.585C-420.99,87.192,-379.863,77.647,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-852.221,-7.325,96.08,124.516\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.8675342008675342s\" to=\"M-355.877,65.469C-351.858,63.74,-347.899,61.918,-344.001,60.001C-92.059,-63.972,-151.972,-279.899,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C192.987,137.102,201.905,138.171,210.763,139.209\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9009009009009009s\" to=\"M-259.987,7.059C-106.772,-116.996,-151.976,-279.912,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C233.075,142.017,280.297,147.087,325.737,151.288\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9342676009342676s\" to=\"M-185.902,-76.933C-124.228,-179.907,-151.981,-279.931,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C276.018,147.282,361.537,155.238,440.992,160.369\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"0.9676343009676344s\" to=\"M-148.611,-182.374C-140.602,-238.923,-151.988,-279.956,-152,-280C-152,-280.001,-196,-463.999,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C322.351,152.962,446.016,162.408,556.462,166.033\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.001001001001001s\" to=\"M-156.499,-293.665C-172.582,-335.465,-237.728,-456.596,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C372.786,159.146,534.231,168.297,672.054,167.757\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.0343677010343677s\" to=\"M-223.547,-382.32C-267.422,-415.337,-336.571,-439.06,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C428.306,165.953,626.829,172.469,787.621,164.876\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.0677344010677345s\" to=\"M-326.978,-423.719C-359.761,-428.472,-398.437,-428.084,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C490.33,173.557,724.682,174.267,902.924,156.518\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1011011011011012s\" to=\"M-439.11,-420.843C-440.73,-420.572,-442.36,-420.291,-443.999,-420C-691.96,-376.007,-723.99,-260.038,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C561.012,182.223,828.999,172.632,1017.54,141.51\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1344678011344678s\" to=\"M-548.256,-393.763C-701.494,-341.487,-723.991,-260.032,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C643.949,192.392,941.63,165.711,1130.75,118.21\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.1678345011678346s\" to=\"M-649.317,-344.931C-712.417,-301.94,-723.994,-260.023,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C746.001,204.904,1065.741,149.782,1241.189,84.196\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.2012012012012012s\" to=\"M-723.289,-262.138C-723.793,-260.748,-723.999,-260.003,-724,-260C-724.001,-259.999,-859.997,7.999,183.994,135.999C884.282,221.858,1208.422,115.147,1345.95,35.575\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.234567901234568s\" to=\"M-704.067,-156.037C-641.838,-66.645,-439.06,59.609,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.2679346012679347s\" to=\"M-621.772,-80.136C-507.529,-4.199,-276.613,79.526,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3013013013013013s\" to=\"M-522.756,-26.797C-388.833,32.961,-170.411,92.547,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3346680013346681s\" to=\"M-417.752,13.731C-282.532,59.211,-89.868,102.422,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.3680347013680347s\" to=\"M-309.916,46.043C-185.184,79.434,-24.017,110.496,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.4014014014014013s\" to=\"M-200.505,72.562C-94.575,95.83,32.244,117.394,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.4347681014347682s\" to=\"M-90.123,94.728C-9.253,109.573,81.707,123.458,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.4681348014681348s\" to=\"M20.89,113.47C71.775,121.364,126.068,128.897,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.5015015015015016s\" to=\"M132.335,129.427C149.226,131.656,166.443,133.847,183.994,135.999C1227.843,263.98,1435.937,-35.91,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.5348682015348682s\" to=\"M244.098,143.002C1235.877,252.402,1435.939,-35.911,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.5682349015682349s\" to=\"M356.126,153.991C1251.118,230.438,1435.941,-35.915,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.6016016016016017s\" to=\"M468.407,162.041C1266.773,207.877,1435.943,-35.918,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.6349683016349683s\" to=\"M580.88,166.745C1282.887,184.656,1435.946,-35.922,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.6683350016683351s\" to=\"M693.441,167.594C1299.507,160.703,1435.949,-35.927,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.7017017017017018s\" to=\"M805.95,163.941C1316.698,135.93,1435.953,-35.932,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.7350684017350684s\" to=\"M918.149,154.943C1334.527,110.235,1435.956,-35.937,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.7684351017684352s\" to=\"M1029.636,139.465C1353.083,83.494,1435.96,-35.943,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.8018018018018018s\" to=\"M1139.692,115.928C1372.459,55.571,1435.965,-35.95,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.8351685018351687s\" to=\"M1246.981,82.008C1392.756,26.32,1435.971,-35.959,1436,-36M-1108,-92\" attributeName=\"d\" /><set fill=\"freeze\" dur=\"0.033s\" begin=\"1.8685352018685353s\" to=\"M1348.676,33.987C1414.032,-4.341,1435.98,-35.971,1436,-36M-1108,-92\" attributeName=\"d\" /></path></g></g></svg>";
  var CFG_LINHA2 = {"hb": 89, "vb": 90, "lv": 2, "speed": 1, "mosaic": true, "posterize": true, "sharp": true, "alphaCut": false, "alphaThresh": 0.23, "alphaSteps": 1, "ditherType": 0, "ditherSize": 1, "ditherAmt": 1, "ditherAlpha": false, "ditherOn": false, "dLv": 4, "forceOn": true, "forceThresh": 0.25, "forceRGB": [1, 0.89411765, 0.48235294], "bgRGB": [0, 0, 0], "bgOpaque": false, "bg": null, "tint": null, "base": "#ffffff", "w": 1600, "h": 900};

  function boot() {
    PixelAnim(document.getElementById('linha-pixel'),  SVG_LINHA,  CFG_LINHA);
    PixelAnim(document.getElementById('circ-pixel'),   SVG_CIRC,   CFG_CIRC);
    PixelAnim(document.getElementById('linha-pixel2'), SVG_LINHA2, CFG_LINHA2);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
