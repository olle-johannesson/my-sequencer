// meter.js
export function createMeter(container, opts = {}) {
  const {
    label = 'Meter',
    threshold = 0.5,
    vertical = false,
    width = 180,
    height = 16,
    attack = 0.12,   // seconds
    release = 0.25,  // seconds
  } = opts;

  // --- DOM
  const root = document.createElement('div');

  root.style.cssText = `
    font:12px system-ui,sans-serif;color:#ddd;background:#222;
    padding:8px 10px;border-radius:10px;border:1px solid #333;
    box-shadow:0 6px 18px rgba(0,0,0,.25);display:inline-block;
  `;

  root.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div data-lamp style="width:10px;height:10px;border-radius:50%;background:#555;box-shadow:0 0 0 1px #000 inset"></div>
      <strong data-name style="color:#fafafa">${label}</strong>
      <span data-read style="margin-left:8px;color:#aaa;"></span>
    </div>
    <div data-box style="position:relative;${vertical ? `width:${height}px;height:${width}px` : `width:${width}px;height:${height}px`};background:#111;border:1px solid #333;border-radius:6px;overflow:hidden">
      <div data-bar style="position:absolute;left:0;bottom:0;${vertical ? `width:100%;height:0%` : `height:100%;width:0%`};background:#22c55e"></div>
    </div>
  `;
  container.appendChild(root);

  const lamp = root.querySelector('[data-lamp]');
  const bar  = root.querySelector('[data-bar]');
  const nameEl = root.querySelector('[data-name]');
  const readEl = root.querySelector('[data-read]');

  // --- state
  let running = true;
  let value = 0;        // displayed (smoothed)
  let target = 0;       // incoming raw (0..1)
  let lastT = performance.now();
  let useMailbox = null;   // { f32, i32 }
  let analyser = null;     // AudioNode analyser
  let anaBuf = null;

  // helpers
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const setBar = (v) => {
    const p = Math.round(clamp01(v) * 100);
    if (vertical) bar.style.height = `${p}%`; else bar.style.width = `${p}%`;
    bar.style.background = v >= threshold ? '#22c55e' : '#7c3aed';
    lamp.style.background = v >= threshold ? '#22c55e' : '#555';
    readEl.textContent = `${(v*100).toFixed(0)}%`;
  };

  // bind sources
  function bindMailbox(mailboxSAB) {
    useMailbox = {
      f32: new Float32Array(mailboxSAB, 0, 1),
      i32: new Int32Array(mailboxSAB, 4, 1),
      lastSeq: -1
    };
  }

  function bindAnalyser(an, { fftSize = 1024 } = {}) {
    analyser = an;
    analyser.fftSize = fftSize;
    const size = analyser.fftSize;
    anaBuf = new Float32Array(size);
  }

  // manual push
  function setValue(v) {
    target = clamp01(v);
  }

  function setLabel(text) { nameEl.textContent = text; }
  function setThreshold(t) { bar.style.background = value >= t ? '#22c55e' : '#7c3aed'; }

  // main loop (no logs)
  function tick() {
    if (!running) return;
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastT) / 1000);
    lastT = now;

    // 1) pull from mailbox if bound
    if (useMailbox) {
      const seq = Atomics.load(useMailbox.i32, 0);
      if (seq !== useMailbox.lastSeq) {
        target = clamp01(useMailbox.f32[0]);
        useMailbox.lastSeq = seq;
      }
    }

    // 2) pull from analyser if bound (RMS)
    if (analyser && anaBuf) {
      analyser.getFloatTimeDomainData(anaBuf);
      let sum = 0;
      for (let i = 0; i < anaBuf.length; i++) { const s = anaBuf[i]; sum += s*s; }
      const rms = Math.sqrt(sum / anaBuf.length);
      // map RMS (~0..1) to target directly (optional: ballistics)
      target = clamp01(rms * 1.5); // light gain so “normal” is visible
    }

    // 3) smooth (attack/release)
    const a = target > value ? Math.exp(-dt/attack) : Math.exp(-dt/release);
    value = value * a + target * (1 - a);

    setBar(value);
    requestAnimationFrame(tick);
  }
  tick();

  function destroy() { running = false; root.remove(); }

  return {
    setValue,
    bindMailbox,
    bindAnalyser,
    setLabel,
    setThreshold,
    destroy,
    get value() { return value; },
    get target() { return target; },
    el: root
  };
}