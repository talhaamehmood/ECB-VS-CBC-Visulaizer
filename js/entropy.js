// entropy.js — AI Randomness Analyzer
// 3 statistical tests → weighted classifier → verdict

// Shannon Entropy: measures unpredictability (0–8 bits/byte, perfect = 8.0)
export function shannonEntropy(data) {
  const freq = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) freq[data[i]]++;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] === 0) continue;
    const p = freq[i] / data.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// Chi-Square Test: checks if byte distribution is uniform (low = good encryption)
export function chiSquare(data) {
  const freq = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) freq[data[i]]++;
  const expected = data.length / 256;
  let chi2 = 0;
  for (let i = 0; i < 256; i++) {
    const diff = freq[i] - expected;
    chi2 += (diff * diff) / expected;
  }
  return chi2;
}

// Byte Correlation: how much each byte predicts the next (0 = no correlation = good)
export function byteCorrelation(data) {
  if (data.length < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = data.length - 1;
  for (let i = 0; i < n; i++) {
    const x = data[i], y = data[i + 1];
    sumX += x; sumY += y; sumXY += x * y;
    sumX2 += x * x; sumY2 += y * y;
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : Math.abs(num / den);
}

function classify(entropy, chi2, correlation) {
  const entropyScore = Math.min(entropy / 8.0, 1.0);
  const chi2Score    = Math.max(0, 1 - chi2 / 50000);
  const correlScore  = Math.max(0, 1 - correlation * 10);
  const overall = entropyScore * 0.5 + chi2Score * 0.3 + correlScore * 0.2;

  let verdict, color;
  if (overall >= 0.85) {
    verdict = '✅ Strong Encryption';
    color   = '#4a9';
  } else if (overall >= 0.60) {
    verdict = '⚠️ Partially Structured';
    color   = '#b8900a';
  } else {
    verdict = '❌ Pattern Leakage Detected';
    color   = '#d44';
  }
  return { overall, entropyScore, chi2Score, correlScore, verdict, color };
}

export function analyzeRandomness(data) {
  const entropy     = shannonEntropy(data);
  const chi2        = chiSquare(data);
  const correlation = byteCorrelation(data);
  return { entropy, chi2, correlation, ...classify(entropy, chi2, correlation) };
}