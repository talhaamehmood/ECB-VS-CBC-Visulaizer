// Store chart instances so we can destroy before redrawing
const charts = {};

export function drawHistogram(rgb, canvasId, label, color) {
  // Build frequency count for all 256 possible byte values
  const freq = new Array(256).fill(0);
  for (let i = 0; i < rgb.length; i++) {
    freq[rgb[i]]++;
  }

  const ctx = document.getElementById(canvasId).getContext('2d');

  // Destroy old chart if it exists (prevents canvas reuse error)
  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }

  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Array.from({ length: 256 }, (_, i) => i),
      datasets: [{
        label: label,
        data: freq,
        backgroundColor: color + '99', // semi-transparent
        borderColor: color,
        borderWidth: 0,
        barPercentage: 1.0,
        categoryPercentage: 1.0
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          display: false,
          grid: { display: false }
        }
      }
    }
  });
}