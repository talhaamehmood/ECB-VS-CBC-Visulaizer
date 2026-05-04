# 🔐 CryptoViz — AES Mode Visualizer

> An interactive browser-based tool that visually demonstrates the differences between AES encryption modes: **ECB**, **CBC**, and **CTR** — using real image encryption.

---

## 📌 What It Does

Upload any image, enter a password, and watch how three different AES modes encrypt it differently. The app lets you:

- **Encrypt** an image with ECB, CBC, and CTR simultaneously
- **Visualize** why ECB is broken (patterns leak through the encryption)
- **Analyze** block patterns — identical blocks are highlighted the same color
- **Compare** pixel histograms — good encryption produces a flat distribution
- **Run the Avalanche Effect demo** — flip 1 bit, see how many bytes change
- **Decrypt** all three modes and verify they match the original

---

## 🧠 The Core Concept

| Mode | How It Works | Security |
|------|-------------|----------|
| **ECB** | Each 16-byte block encrypted independently | ❌ Weak — identical blocks produce identical ciphertext |
| **CBC** | Each block XOR'd with previous ciphertext before encryption | ✅ Good — requires random IV |
| **CTR** | AES used as a keystream generator with a counter | ⭐ Best — parallelizable, no padding needed |

ECB's weakness is visible to the naked eye — the structure of the original image leaks through the encryption. CBC and CTR produce visually random output.

---

## 🗂️ Project Structure

```
├── index.html          # Main UI — all sections and canvases
├── style.css           # Dark theme styling (JetBrains Mono + Syne fonts)
├── js/
│   ├── app.js          # Main integration — event handlers, state, orchestration
│   ├── crypto.js       # AES-ECB, AES-CBC, AES-CTR encrypt/decrypt + key generation
│   ├── block.js        # Block pattern analysis and color-coded canvas rendering
│   ├── histogram.js    # Pixel frequency histogram using Chart.js
│   └── image.js        # Image upload, canvas rendering, RGB extraction
```

---

## 🚀 How to Run

This is a pure frontend project — no build step needed.

```bash
# Clone the repo
git clone https://github.com/your-org/cryptoviz.git
cd cryptoviz

# Serve locally (required — ES modules don't work via file://)
npx serve .
# or
python3 -m http.server 5500
```

Then open `http://localhost:5500` in your browser.

> **Note:** Must be served over HTTP/HTTPS — Web Crypto API requires a secure context and ES modules require a server.

---

## 🔑 How the Key Works

```
Password (text input)
    ↓
SHA-256 hash  →  32-byte AES-256 key  (shown as hex in UI)
    ↓
ECB  →  no IV, blocks encrypted independently
CBC  →  random 16-byte IV generated per session, shown in UI
CTR  →  random 16-byte nonce generated per session, shown in UI
```

The key never leaves your browser. IV and nonce are random per encryption run and stored in session state.

---

## 📦 Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | Pixel histogram charts |
| Web Crypto API | Native browser | AES encryption/decryption |
| Google Fonts | — | JetBrains Mono + Syne typography |

No npm install needed — Chart.js is loaded via CDN.

---

## 👥 Team & Contributions

| Member | Branch | Contribution |
|--------|--------|-------------|
| — | `UI-Image` | UI, image handling (`image.js`), block analysis (`block.js`), app integration (`app.js`) |
| — | — | Crypto implementation (`crypto.js`) |
| — | — | Histogram (`histogram.js`), styling (`style.css`) |

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 CryptoViz Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🔒 Security Note

This tool is built for **educational purposes only**. The ECB mode implementation simulates ECB using Web Crypto's CBC with a zero IV — this is intentionally insecure to demonstrate ECB's weaknesses. Do not use this code in production cryptographic systems.