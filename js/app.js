// app.js — FULL INTEGRATION

import { loadImageToCanvas, imageDataToRGB, rgbToImageData, renderToCanvas } from './image.js';
import {
  generateKeyFromPassword,
  encryptECB, decryptECB,
  encryptCBC, decryptCBC, generateCBCIV,
  encryptCTR, decryptCTR, generateCTRNonce,
  bytesToHex, arraysEqual
} from './crypto.js';
import { analyzeBlockPatterns, renderBlockMap, getBlockStats } from './block.js';
import { drawHistogram } from './histogram.js';
import { analyzeRandomness } from './entropy.js';

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  originalRgb: null,
  width: null,
  height: null,
  rawKey: null,
  ctrNonce: null,
  cbcIV: null,
  encECB: null,
  encCBC: null,
  encCTR: null
};

// ─── DOM REFS ────────────────────────────────────────────────────────────────
const imageInput    = document.getElementById('image-input');
const passwordInput = document.getElementById('password-input');
const genKeyBtn     = document.getElementById('generate-key-btn');
const keyDisplay    = document.getElementById('key-display');
const encryptBtn    = document.getElementById('encrypt-btn');
const decryptBtn    = document.getElementById('decrypt-btn');
const avalancheBtn  = document.getElementById('avalanche-btn');

// ─── UPLOAD ──────────────────────────────────────────────────────────────────
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { imageData, width, height } = await loadImageToCanvas(file, 'original-canvas');
    state.originalRgb = imageDataToRGB(imageData);
    state.width  = width;
    state.height = height;
    document.getElementById('original-preview').classList.remove('hidden');
    checkReady();
  } catch (err) {
    alert('Failed to load image: ' + err.message);
  }
});

// ─── KEY GENERATION ──────────────────────────────────────────────────────────
genKeyBtn.addEventListener('click', async () => {
  const password = passwordInput.value.trim();
  if (!password) { alert('Enter a password first'); return; }

  state.rawKey = await generateKeyFromPassword(password);
  keyDisplay.innerHTML = `
    <div style="color:var(--text-dim);font-size:11px;margin-bottom:4px">SHA-256 → AES-256 Key:</div>
    <div style="color:var(--accent);word-break:break-all">${bytesToHex(state.rawKey)}</div>
  `;
  keyDisplay.classList.remove('hidden');
  checkReady();
});

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') genKeyBtn.click();
});

function checkReady() {
  if (state.originalRgb && state.rawKey) encryptBtn.disabled = false;
}

// ─── ENCRYPT ─────────────────────────────────────────────────────────────────
encryptBtn.addEventListener('click', async () => {
  encryptBtn.disabled = true;
  encryptBtn.textContent = '⏳ Encrypting...';

  try {
    // ECB
    state.encECB = await encryptECB(state.originalRgb, state.rawKey);

    // CBC — pad RGB to multiple of 16 before encrypting
    state.cbcIV = generateCBCIV();
    const cbcPadLen = (16 - (state.originalRgb.length % 16)) % 16;
    const cbcPadded = new Uint8Array(state.originalRgb.length + cbcPadLen);
    cbcPadded.set(state.originalRgb);
    state.encCBC = await encryptCBC(cbcPadded, state.rawKey, state.cbcIV);

    // CTR
    state.ctrNonce = generateCTRNonce();
    state.encCTR   = await encryptCTR(state.originalRgb, state.rawKey, state.ctrNonce);

    // Render images
    renderToCanvas(rgbToImageData(state.encECB, state.width, state.height), 'ecb-canvas');
    renderToCanvas(rgbToImageData(state.encCBC.slice(0, state.width * state.height * 3), state.width, state.height), 'cbc-canvas');
    renderToCanvas(rgbToImageData(state.encCTR, state.width, state.height), 'ctr-canvas');

    // IV display
    document.getElementById('cbc-iv-display').textContent = 'IV: ' + bytesToHex(state.cbcIV);
    document.getElementById('ctr-nonce-display').textContent = 'Nonce: ' + bytesToHex(state.ctrNonce);

    // Block analysis
    renderBlockAnalysis();

    // Histograms
    document.getElementById('histogram-results').classList.remove('hidden');
    drawHistogram(state.originalRgb, 'hist-original', 'Original', '#8890a0');
    drawHistogram(state.encECB,      'hist-ecb',      'ECB',      '#ff4757');
    drawHistogram(state.encCBC.slice(0, state.originalRgb.length), 'hist-cbc', 'CBC', '#2ed573');
    drawHistogram(state.encCTR,      'hist-ctr',      'CTR',      '#ffa502');

    document.getElementById('encrypt-results').classList.remove('hidden');
    document.getElementById('block-results').classList.remove('hidden');

    // AI Analysis
    renderAIAnalysis();

    decryptBtn.disabled   = false;
    avalancheBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert('Encryption failed: ' + err.message);
  }

  encryptBtn.disabled = false;
  encryptBtn.textContent = '🔒 Encrypt with ECB, CBC & CTR';
});

function renderBlockAnalysis() {
  const modes = [
    { rgb: state.encECB, canvasId: 'ecb-block-canvas', statsId: 'ecb-block-stats' },
    { rgb: state.encCBC, canvasId: 'cbc-block-canvas', statsId: 'cbc-block-stats' },
    { rgb: state.encCTR, canvasId: 'ctr-block-canvas', statsId: 'ctr-block-stats' },
  ];
  for (const m of modes) {
    const { blockColors, blockMap, numBlocks } = analyzeBlockPatterns(m.rgb);
    renderBlockMap(blockColors, state.width, state.height, m.canvasId);
    document.getElementById(m.statsId).innerHTML = getBlockStats(blockMap, numBlocks);
  }
}

// ─── AI ANALYSIS ─────────────────────────────────────────────────────────────
function renderAIAnalysis() {
  const cbcVisual = state.encCBC.slice(0, state.originalRgb.length);

  const datasets = [
    { id: 'ai-original', data: state.originalRgb },
    { id: 'ai-ecb',      data: state.encECB       },
    { id: 'ai-cbc',      data: cbcVisual           },
    { id: 'ai-ctr',      data: state.encCTR        },
  ];

  document.getElementById('ai-results').classList.remove('hidden');

  for (const { id, data } of datasets) {
    const r = analyzeRandomness(data);
    const card = document.getElementById(id);

    card.querySelector('.ai-metrics').innerHTML = `
      Entropy: <strong>${r.entropy.toFixed(4)}</strong> bits/byte<br>
      Chi-Square: <strong>${r.chi2.toFixed(1)}</strong><br>
      Byte Correlation: <strong>${r.correlation.toFixed(4)}</strong>
    `;

    const verdictEl = card.querySelector('.ai-verdict');
    verdictEl.textContent = r.verdict;
    verdictEl.style.color = r.color;
    verdictEl.style.borderColor = r.color;

    card.querySelector('.ai-bars').innerHTML = `
      <div class="ai-bar-row">
        <div class="ai-bar-label"><span>Entropy</span><span>${(r.entropyScore*100).toFixed(0)}%</span></div>
        <div class="ai-bar-track"><div class="ai-bar-fill" style="width:${r.entropyScore*100}%;background:${r.color}"></div></div>
      </div>
      <div class="ai-bar-row">
        <div class="ai-bar-label"><span>Uniformity</span><span>${(r.chi2Score*100).toFixed(0)}%</span></div>
        <div class="ai-bar-track"><div class="ai-bar-fill" style="width:${r.chi2Score*100}%;background:${r.color}"></div></div>
      </div>
      <div class="ai-bar-row">
        <div class="ai-bar-label"><span>Decorrelation</span><span>${(r.correlScore*100).toFixed(0)}%</span></div>
        <div class="ai-bar-track"><div class="ai-bar-fill" style="width:${r.correlScore*100}%;background:${r.color}"></div></div>
      </div>
      <div class="ai-score" style="color:${r.color}">${(r.overall*100).toFixed(0)}<span class="ai-score-label">/100</span></div>
    `;
  }
}

// ─── DECRYPT & VERIFY ────────────────────────────────────────────────────────
decryptBtn.addEventListener('click', async () => {
  decryptBtn.disabled = true;
  decryptBtn.textContent = '⏳ Decrypting...';

  try {
    const decECB = await decryptECB(state.encECB, state.rawKey);
    const decCBC = await decryptCBC(state.encCBC, state.rawKey, state.cbcIV, state.originalRgb.length);
    const decCTR = await decryptCTR(state.encCTR, state.rawKey, state.ctrNonce);

    renderToCanvas(rgbToImageData(decECB, state.width, state.height), 'decrypted-ecb-canvas');
    renderToCanvas(rgbToImageData(decCBC, state.width, state.height), 'decrypted-cbc-canvas');
    renderToCanvas(rgbToImageData(decCTR, state.width, state.height), 'decrypted-ctr-canvas');

    setVerify('ecb-verify', arraysEqual(decECB, state.originalRgb));
    setVerify('cbc-verify', arraysEqual(decCBC, state.originalRgb));
    setVerify('ctr-verify', arraysEqual(decCTR, state.originalRgb));

    document.getElementById('decrypt-results').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('Decryption failed: ' + err.message);
  }

  decryptBtn.disabled = false;
  decryptBtn.textContent = '🔓 Decrypt All';
});

function setVerify(id, ok) {
  const el = document.getElementById(id);
  el.className = 'verify-badge ' + (ok ? 'verify-ok' : 'verify-fail');
  el.textContent = ok ? '✅ Matches original' : '❌ Mismatch';
}

// ─── AVALANCHE EFFECT ────────────────────────────────────────────────────────
avalancheBtn.addEventListener('click', async () => {
  avalancheBtn.disabled = true;
  avalancheBtn.textContent = '⏳ Running...';

  try {
    const modified = new Uint8Array(state.originalRgb);
    modified[0] = modified[0] ^ 0x01;

    const encOriginal = await encryptECB(state.originalRgb, state.rawKey);
    const encModified = await encryptECB(modified, state.rawKey);

    const diff = new Uint8Array(encOriginal.length);
    let changedBytes = 0;
    for (let i = 0; i < encOriginal.length; i++) {
      const d = Math.abs(encOriginal[i] - encModified[i]);
      diff[i] = Math.min(255, d * 10);
      if (d > 0) changedBytes++;
    }

    const pct = ((changedBytes / encOriginal.length) * 100).toFixed(1);

    renderToCanvas(rgbToImageData(encOriginal, state.width, state.height), 'av-original-canvas');
    renderToCanvas(rgbToImageData(encModified, state.width, state.height), 'av-modified-canvas');
    renderToCanvas(rgbToImageData(diff,        state.width, state.height), 'av-diff-canvas');

    document.getElementById('avalanche-results').classList.remove('hidden');
    const stats = document.getElementById('avalanche-stats');
    stats.classList.remove('hidden');
    stats.innerHTML = `1 bit flipped → <strong style="color:var(--accent)">${changedBytes.toLocaleString()}</strong> bytes changed (${pct}% of total data) — this is the avalanche effect`;

  } catch (err) {
    console.error(err);
    alert('Avalanche demo failed: ' + err.message);
  }

  avalancheBtn.disabled = false;
  avalancheBtn.textContent = '⚡ Run Avalanche Demo (ECB)';
});