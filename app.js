// Push Pop - PWA
// Safari-friendly, with sound (WebAudio), light haptics (if available), resizable board, and confetti.

const qs = (s,el=document)=>el.querySelector(s);
const qsa = (s,el=document)=>[...el.querySelectorAll(s)];

const state = {
  rows: 6,
  cols: 6,
  total: 36,
  popped: 0,
  skinIndex: 0,
  skins: [
    { name:'Candy', background:'linear-gradient(135deg,#ffe29f,#ffa99f)', buttonShape:'50%', shadow:true },
    { name:'Neon', background:'linear-gradient(135deg,#a1c4fd,#c2e9fb)', buttonShape:'50%', shadow:true },
    { name:'Sunset', background:'linear-gradient(135deg,#f6d365,#fda085)', buttonShape:'50%', shadow:true },
    { name:'Forest', background:'linear-gradient(135deg,#d4fc79,#96e6a1)', buttonShape:'40%', shadow:true },
    { name:'Grape', background:'linear-gradient(135deg,#a18cd1,#fbc2eb)', buttonShape:'50%', shadow:true }
  ],
  colors: ['#ff7675','#55efc4','#74b9ff','#ffeaa7','#a29bfe','#fd79a8','#81ecec','#fab1a0','#e17055'],
  audioEnabled: true,
  hapticsEnabled: true,
  soundType: 'beep' // options: 'beep','pop','click'
};

// --- PWA service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

// --- Audio (WebAudio) ---
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { console.warn('AudioContext not available'); }
  }
}
function playSound(type='beep') {
  if (!state.audioEnabled) return;
  initAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g).connect(audioCtx.destination);

  if (type === 'beep') {
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.00001, now + 0.07);
    o.start(now);
    o.stop(now + 0.08);
  } else if (type === 'pop') {
    // Soft pop using frequency slide
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, now);
    o.frequency.exponentialRampToValueAtTime(120, now + 0.08);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.00001, now + 0.09);
    o.start(now);
    o.stop(now + 0.1);
  } else if (type === 'click') {
    // short click
    o.type = 'square';
    o.frequency.setValueAtTime(1000, now);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.00001, now + 0.03);
    o.start(now);
    o.stop(now + 0.035);
  }
}

// --- Haptics (best-effort) ---
function haptic() {
  if (!state.hapticsEnabled) return;
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  // iOS Safari has limited web haptics; leaving this as best-effort.
}

// --- Confetti ---
const confetti = (function(){
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  let W, H, pieces = [], animId = null;
  function resize() {
    W = canvas.width = window.innerWidth * devicePixelRatio;
    H = canvas.height = window.innerHeight * devicePixelRatio;
  }
  window.addEventListener('resize', resize);
  resize();

  function rand(n){ return Math.random()*n; }
  function spawn(count=120) {
    pieces = [];
    for (let i=0; i<count; i++) {
      pieces.push({
        x: rand(W), y: -rand(H*0.2),
        w: 6*devicePixelRatio, h: 12*devicePixelRatio,
        vx: -2 + Math.random()*4,
        vy: 3 + Math.random()*4,
        r: rand(Math.PI*2),
        vr: -0.2 + Math.random()*0.4,
        color: state.colors[Math.floor(Math.random()*state.colors.length)]
      });
    }
    if (!animId) loop();
  }
  function loop(){
    animId = requestAnimationFrame(loop);
    ctx.clearRect(0,0,W,H);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      if (p.y > H + 20) p.y = -10;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
  }
  return { spawn };
})();

// --- Skins ---
function applySkin(index) {
  const skin = state.skins[index % state.skins.length];
  document.body.style.background = skin.background;
  const board = qs('.board');
  board.style.setProperty('--button-radius', skin.buttonShape);
  qsa('.pop').forEach(btn => {
    btn.style.borderRadius = skin.buttonShape;
  });
}

// --- Board ---
function randomColor() {
  return state.colors[Math.floor(Math.random()*state.colors.length)];
}

function makeBoard(rows, cols) {
  const wrap = qs('.board');
  wrap.innerHTML = '';
  wrap.style.setProperty('--cols', cols);
  state.total = rows*cols;
  state.popped = 0;

  const fragment = document.createDocumentFragment();
  for (let i=0;i<rows*cols;i++){
    const btn = document.createElement('button');
    btn.className = 'pop';
    btn.style.background = randomColor();
    btn.addEventListener('pointerdown', (e)=>{
      e.preventDefault();
      if (!btn.classList.contains('popped')) {
        btn.classList.add('popped');
        state.popped++;
        playSound(state.soundType);
        haptic();
        if (state.popped >= state.total) {
          // Win
          setTimeout(()=>{
            confetti.spawn(180);
            // randomize skin and restart
            state.skinIndex = (state.skinIndex + 1 + Math.floor(Math.random()*3)) % state.skins.length;
            applySkin(state.skinIndex);
            restartGame();
          }, 120);
        }
      } else {
        // allow unpop to keep it fun (optional)
        btn.classList.remove('popped');
        state.popped--;
        playSound('click');
      }
    }, {passive:false});
    fragment.appendChild(btn);
  }
  wrap.appendChild(fragment);
}

function restartGame(){
  // randomize board size a little for the "Pop It" vibe
  const sizes = [[6,6],[7,7],[5,9],[8,6],[6,8]];
  const [r,c] = sizes[Math.floor(Math.random()*sizes.length)];
  state.rows = r; state.cols = c;
  const root = document.documentElement;
  // Adjust button size responsively
  const vw = Math.min(window.innerWidth, 700);
  const targetCols = c;
  const gap = 10;
  const padding = 28;
  let size = Math.floor((vw - padding*2 - gap*(targetCols-1)) / targetCols);
  size = Math.max(42, Math.min(88, size));
  root.style.setProperty('--button-size', size+'px');
  makeBoard(r,c);
  // new random colors on restart
  qsa('.pop').forEach(b => b.style.background = randomColor());
}

function setCustomSize(v){
  const n = parseInt(v,10);
  const clamped = Math.max(3, Math.min(10, n));
  state.rows = clamped;
  state.cols = clamped;
  restartGame();
}

function randomizeColors(){
  qsa('.pop').forEach(b => b.style.background = randomColor());
}

// --- UI ---
function initUI(){
  // size slider
  const slider = qs('#size');
  slider.addEventListener('input', (e)=>{
    setCustomSize(e.target.value);
  });

  qs('#shuffle').addEventListener('click', ()=>{
    restartGame();
  });

  qs('#recolor').addEventListener('click', ()=>{
    randomizeColors();
  });

  const soundSel = qs('#sound');
  soundSel.addEventListener('change', (e)=>{
    state.soundType = e.target.value;
    playSound('click');
  });

  const audioToggle = qs('#audioToggle');
  audioToggle.addEventListener('click', ()=>{
    state.audioEnabled = !state.audioEnabled;
    audioToggle.textContent = state.audioEnabled ? '音: ON' : '音: OFF';
    playSound('click');
  });

  const hapticToggle = qs('#hapticToggle');
  hapticToggle.addEventListener('click', ()=>{
    state.hapticsEnabled = !state.hapticsEnabled;
    hapticToggle.textContent = state.hapticsEnabled ? 'ハプティック: ON' : 'ハプティック: OFF';
    haptic();
  });
}

// --- Responsive sizing on load/rotate ---
window.addEventListener('resize', ()=>{
  const root = document.documentElement;
  const vw = Math.min(window.innerWidth, 700);
  const gap = 10;
  const padding = 28;
  let size = Math.floor((vw - padding*2 - gap*(state.cols-1)) / state.cols);
  size = Math.max(42, Math.min(88, size));
  root.style.setProperty('--button-size', size+'px');
});

// --- Boot ---
window.addEventListener('DOMContentLoaded', ()=>{
  initUI();
  restartGame();
  applySkin(state.skinIndex);
});