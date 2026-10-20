/**
 * 路卫音效 — Web Audio 程序合成（无音频文件）
 *
 * 背景：低音持续音 + 风噪 + 慢脉冲，音量低于音效。
 * 首次指针/触摸/点击后才创建 AudioContext（自动播放策略）。
 * 总静音写入 localStorage「coinpath_muted」，同时关掉背景与音效。
 * AudioContext 不可用或任何节点失败时，接口静默返回。
 */
(() => {
  "use strict";

  if (window.CoinpathAudio) return;

  const STORAGE_KEY = "coinpath_muted";

  let ctx = null;
  let master = null;
  let bgmBus = null;
  let sfxBus = null;
  let noiseBuf = null;
  let muted = false;
  let failed = false;
  let gestureSeen = false;
  let started = false;
  let audible = false;
  let pulsesOn = false;
  let pulseGen = 0;
  let bgmDuck = null;
  let chapterId = "dust";
  let pausedDuck = false;
  let musicGen = 0;
  let musicOn = false;
  let bgmNodes = [];
  let pumpTimer = null;
  let nextAt = 0;

  try {
    muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (_) {
    muted = false;
  }

  const lastAt = Object.create(null);

  function saveMute() {
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch (_) {}
  }

  function allow(key, gapMs) {
    const now = performance.now();
    const prev = lastAt[key];
    if (prev != null && now - prev < gapMs) return false;
    lastAt[key] = now;
    return true;
  }

  function makeNoise(seconds) {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let seed = 0x6d2b79f5;
    for (let i = 0; i < len; i++) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[i] = ((seed >>> 0) / 4294967295) * 2 - 1;
    }
    const edge = Math.min(128, Math.floor(len / 8));
    for (let i = 0; i < edge; i++) {
      const w = i / edge;
      data[i] *= w;
      data[len - 1 - i] *= w;
    }
    return buf;
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let seed = 0x12345678 + ch * 997;
      for (let i = 0; i < len; i++) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        const white = ((seed >>> 0) / 4294967295) * 2 - 1;
        data[i] = white * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensure() {
    if (failed) return null;
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      failed = true;
      return null;
    }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      bgmBus = ctx.createGain();
      bgmBus.gain.value = 0;
      bgmDuck = ctx.createGain();
      bgmDuck.gain.value = 1;
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 1;
      bgmDuck.connect(bgmBus);
      bgmBus.connect(master);
      sfxBus.connect(master);

      try {
        const wet = ctx.createGain();
        wet.gain.value = 0.22;
        const conv = ctx.createConvolver();
        conv.buffer = makeImpulse(0.7, 2.6);
        bgmBus.connect(conv);
        conv.connect(wet);
        wet.connect(master);
      } catch (_) {}

      noiseBuf = makeNoise(1.5);
      return ctx;
    } catch (_) {
      failed = true;
      ctx = null;
      return null;
    }
  }

  function setMaster(on) {
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const cur = master.gain.value;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(cur, t);
    master.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.04);
  }

  function fadeBgmIn() {
    if (!ctx || !bgmBus) return;
    const t = ctx.currentTime;
    bgmBus.gain.cancelScheduledValues(t);
    bgmBus.gain.setValueAtTime(0.0001, t);
    // 背景明显低于音效总线（音效走 sfxBus ≈ 1）
    bgmBus.gain.linearRampToValueAtTime(0.15, t + 0.9);
  }

  function tone(opts) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const dur = Math.max(0.02, opts.dur || 0.12);
    const attack = Math.min(opts.attack == null ? 0.008 : opts.attack, dur * 0.45);
    const osc = ctx.createOscillator();
    osc.type = opts.type || "sine";
    const f0 = Math.max(1, opts.freq || 440);
    osc.frequency.setValueAtTime(f0, t0);
    if (opts.freq2) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freq2), t0 + dur);
    }
    const g = ctx.createGain();
    const peak = Math.max(0.0002, opts.peak || 0.1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(0.005, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (opts.filterFreq) {
      const f = ctx.createBiquadFilter();
      f.type = opts.filterType || "lowpass";
      f.frequency.setValueAtTime(opts.filterFreq, t0);
      if (opts.q) f.Q.value = opts.q;
      osc.connect(f);
      f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(opts.dest || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function burst(dur, peak, freq, type, q) {
    if (!ctx || !noiseBuf) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type || "bandpass";
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    const g = ctx.createGain();
    const d = Math.max(0.02, dur);
    const attack = Math.min(0.008, d * 0.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.004, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    src.start(t0);
    src.stop(t0 + d + 0.02);
  }

  function thump(time) {
    if (!ctx || !bgmBus) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(74, time);
    o.frequency.exponentialRampToValueAtTime(34, time + 0.34);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.36, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.46);
    o.connect(g);
    g.connect(bgmBus);
    o.start(time);
    o.stop(time + 0.5);

    if (!noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(180, time);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, time);
    ng.gain.exponentialRampToValueAtTime(0.04, time + 0.012);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    src.connect(f);
    f.connect(ng);
    ng.connect(bgmBus);
    src.start(time);
    src.stop(time + 0.2);
  }

  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  /** 四章各约 30s：拍数×60/bpm = 30。音量进 bgmDuck，再被 bgmBus≈0.15 压低，低于音效。 */
  const TRACKS = {
    dust: {
      bpm: 96,
      drum: "march",
      lead: "triangle",
      leadPeak: 0.045,
      wind: 280,
      windGain: 0.02,
      chords: [
        [50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55],
        [50, 53, 57], [55, 58, 62], [57, 60, 64], [50, 53, 57],
        [50, 53, 57], [46, 50, 53], [48, 52, 55], [50, 53, 57],
      ],
      motif: [74, 77, 74, 72, 69, 72, 74, 77, 74, 72, 69, 65],
    },
    frost: {
      bpm: 72,
      drum: "soft",
      lead: "sine",
      leadPeak: 0.04,
      melodyEvery: 2,
      wind: 1400,
      windGain: 0.012,
      chords: [
        [57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62],
        [57, 60, 64], [62, 65, 69], [64, 68, 71], [57, 60, 64],
        [57, 60, 64],
      ],
      motif: [81, 84, 88, 84, 81, 79, 76, 79, 81, null, 76, 72],
    },
    rift: {
      bpm: 112,
      drum: "drive",
      lead: "square",
      leadPeak: 0.03,
      melodyEvery: 1,
      wind: 400,
      windGain: 0.01,
      chords: [
        [52, 55, 59], [53, 57, 60], [52, 55, 59], [48, 52, 55],
        [52, 56, 59], [53, 57, 60], [50, 53, 57], [52, 55, 59],
        [52, 55, 59], [53, 56, 60], [52, 55, 59], [47, 52, 55],
        [52, 55, 59], [53, 57, 60],
      ],
      motif: [71, 72, 71, 67, 64, 67, 71, 74, 72, 71, 67, 64],
    },
    night: {
      bpm: 80,
      drum: "war",
      lead: "triangle",
      leadPeak: 0.035,
      melodyEvery: 2,
      wind: 180,
      windGain: 0.018,
      chords: [
        [48, 51, 55], [44, 48, 51], [41, 44, 48], [43, 47, 50],
        [48, 51, 55], [44, 48, 51], [46, 50, 53], [43, 47, 50],
        [41, 44, 48], [48, 51, 55],
      ],
      motif: [67, 70, 67, 63, 60, 63, 67, 70, 72, 70, 67, 63],
    },
  };

  function trackNote(when, dur, freq, type, peak) {
    if (!ctx || !bgmDuck) return;
    const osc = ctx.createOscillator();
    osc.type = type || "sine";
    const f = Math.max(30, freq);
    osc.frequency.setValueAtTime(f, when);
    const g = ctx.createGain();
    const d = Math.max(0.06, dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + Math.min(0.05, d * 0.28));
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    if (type === "square" || type === "sawtooth") {
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(type === "square" ? 1200 : 800, when);
      osc.connect(filt);
      filt.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(bgmDuck);
    osc.start(when);
    osc.stop(when + d + 0.03);
    bgmNodes.push({ node: osc, until: when + d + 0.05 });
  }

  function trackKick(when, peak) {
    if (!ctx || !bgmDuck) return;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(128, when);
    o.frequency.exponentialRampToValueAtTime(40, when + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak || 0.12), when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    o.connect(g);
    g.connect(bgmDuck);
    o.start(when);
    o.stop(when + 0.22);
    bgmNodes.push({ node: o, until: when + 0.24 });
  }

  function trackHat(when, peak) {
    if (!ctx || !bgmDuck || !noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 4000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak || 0.03), when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(f);
    f.connect(g);
    g.connect(bgmDuck);
    src.start(when);
    src.stop(when + 0.06);
    bgmNodes.push({ node: src, until: when + 0.08 });
  }

  function scheduleTrack(track, t0) {
    const beat = 60 / track.bpm;
    const bar = beat * 4;
    const bars = track.chords.length;
    for (let i = 0; i < bars; i++) {
      const t = t0 + i * bar;
      const chord = track.chords[i];
      for (let v = 0; v < chord.length; v++) {
        trackNote(t, bar * 0.94, midi(chord[v]), v === 0 ? "triangle" : "sine", v === 0 ? 0.05 : 0.028);
        if (v === 0) trackNote(t, Math.min(bar * 0.55, beat * 2), midi(chord[v] - 12), "sine", 0.08);
      }
    }
    const step = track.melodyEvery || 2;
    const count = Math.floor((bars * 4) / step);
    for (let i = 0; i < count; i++) {
      const m = track.motif[i % track.motif.length];
      if (m == null) continue;
      trackNote(t0 + i * beat * step, beat * step * 0.8, midi(m), track.lead || "triangle", track.leadPeak || 0.04);
    }
    const beats = bars * 4;
    for (let i = 0; i < beats; i++) {
      const t = t0 + i * beat;
      if (track.drum === "march") {
        if (i % 2 === 0) trackKick(t, i % 4 === 0 ? 0.15 : 0.08);
        else trackHat(t, 0.025);
      } else if (track.drum === "soft") {
        if (i % 4 === 0) trackKick(t, 0.06);
      } else if (track.drum === "drive") {
        trackKick(t, i % 4 === 0 ? 0.13 : 0.07);
        if (i % 2 === 1) trackHat(t, 0.03);
      } else if (track.drum === "war") {
        if (i % 4 === 0) trackKick(t, 0.16);
        else if (i % 4 === 2) trackKick(t, 0.07);
      }
    }
    return bars * bar;
  }

  function stopMusic() {
    musicGen++;
    musicOn = false;
    if (pumpTimer) {
      clearTimeout(pumpTimer);
      pumpTimer = null;
    }
    for (const item of bgmNodes) {
      try { item.node.stop(); } catch (_) {}
      try { item.node.disconnect(); } catch (_) {}
    }
    bgmNodes = [];
    nextAt = 0;
  }

  function startWind(track) {
    if (!ctx || !noiseBuf || !bgmDuck || !track || !track.wind) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = track.wind > 1000 ? "highpass" : "lowpass";
    f.frequency.value = track.wind;
    const g = ctx.createGain();
    g.gain.value = track.windGain || 0.015;
    src.connect(f);
    f.connect(g);
    g.connect(bgmDuck);
    src.start();
    bgmNodes.push({ node: src, until: null });
  }

  function pruneNodes() {
    if (!ctx) return;
    const now = ctx.currentTime - 0.3;
    const keep = [];
    for (const item of bgmNodes) {
      if (item.until != null && item.until < now) {
        try { item.node.disconnect(); } catch (_) {}
      } else keep.push(item);
    }
    bgmNodes = keep;
  }

  function pumpMusic(gen) {
    if (gen !== musicGen || !ctx || !TRACKS[chapterId]) return;
    pruneNodes();
    const now = ctx.currentTime;
    if (nextAt < now + 0.05) nextAt = now + 0.06;
    let guard = 0;
    while (nextAt < now + 32 && guard < 4) {
      const dur = scheduleTrack(TRACKS[chapterId], nextAt);
      if (!(dur > 0)) break;
      nextAt += dur;
      guard++;
    }
    pumpTimer = setTimeout(() => pumpMusic(gen), 1000);
  }

  function restartChapterMusic() {
    const id = TRACKS[chapterId] ? chapterId : "dust";
    chapterId = id;
    stopMusic();
    if (!ctx || !bgmDuck || muted) return;
    musicOn = true;
    const gen = musicGen;
    nextAt = 0;
    startWind(TRACKS[id]);
    pumpMusic(gen);
    applyDuck();
  }

  function applyDuck() {
    if (!ctx || !bgmDuck) return;
    const t = ctx.currentTime;
    const cur = bgmDuck.gain.value;
    bgmDuck.gain.cancelScheduledValues(t);
    bgmDuck.gain.setValueAtTime(Math.max(0.0001, cur || 0.0001), t);
    bgmDuck.gain.linearRampToValueAtTime(pausedDuck ? 0.0001 : 1, t + 0.22);
  }

  function setChapter(id) {
    const next = TRACKS[id] ? id : "dust";
    if (next === chapterId && musicOn) return;
    chapterId = next;
    if (!ctx || muted || !gestureSeen) return;
    try { restartChapterMusic(); } catch (_) {}
  }

  function setBgmPaused(on) {
    pausedDuck = !!on;
    try { applyDuck(); } catch (_) {}
  }

  function startPulses() {
    if (!ctx || pulsesOn || muted) return;
    pulsesOn = true;
    const gen = ++pulseGen;
    let next = ctx.currentTime + 1.2;
    const arm = () => {
      if (gen !== pulseGen || !ctx || muted) return;
      const when = Math.max(ctx.currentTime + 0.05, next);
      try {
        thump(when);
      } catch (_) {}
      next = when + 2.8;
      const wait = Math.max(250, (next - ctx.currentTime - 0.35) * 1000);
      setTimeout(arm, wait);
    };
    arm();
  }

  function stopPulses() {
    pulsesOn = false;
    pulseGen++;
  }

  function startBgm() {
    const mix = ctx.createGain();
    mix.gain.value = 0.3;
    mix.connect(bgmBus);

    const layers = [
      { f: 73.42, g: 0.55, type: "sine", detune: 0 },
      { f: 110, g: 0.26, type: "sine", detune: 6 },
      { f: 146.83, g: 0.1, type: "sine", detune: -5 },
      { f: 220, g: 0.04, type: "triangle", detune: 3 },
    ];
    for (let i = 0; i < layers.length; i++) {
      const spec = layers[i];
      const o = ctx.createOscillator();
      o.type = spec.type;
      o.frequency.value = spec.f;
      o.detune.value = spec.detune;
      const g = ctx.createGain();
      g.gain.value = spec.g;
      o.connect(g);
      g.connect(mix);
      o.start();
    }

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoAmp = ctx.createGain();
    lfoAmp.gain.value = 0.04;
    lfo.connect(lfoAmp);
    lfoAmp.connect(mix.gain);
    lfo.start();

    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuf;
    wind.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 170;
    bp.Q.value = 0.55;
    const wg = ctx.createGain();
    wg.gain.value = 0.05;
    wind.connect(lp);
    lp.connect(bp);
    bp.connect(wg);
    wg.connect(bgmBus);
    wind.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.028;
    const windDepth = ctx.createGain();
    windDepth.gain.value = 0.02;
    windLfo.connect(windDepth);
    windDepth.connect(wg.gain);
    windLfo.start();

    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.018;
    const sweepDepth = ctx.createGain();
    sweepDepth.gain.value = 70;
    sweep.connect(sweepDepth);
    sweepDepth.connect(lp.frequency);
    sweep.start();

    startPulses();
  }

  function begin() {
    const c = ensure();
    if (!c || muted || failed) return false;
    try {
      if (!started) {
        started = true;
        fadeBgmIn();
      }
      if (!musicOn) restartChapterMusic();
      if (!audible) {
        audible = true;
        setMaster(true);
      }
      if (c.state === "suspended") c.resume().catch(() => {});
      return true;
    } catch (_) {
      failed = true;
      return false;
    }
  }

  function hush() {
    audible = false;
    stopPulses();
    if (!ctx || !master) return;
    try {
      setMaster(false);
      const captured = ctx;
      setTimeout(() => {
        if (muted && captured && captured.state === "running") {
          captured.suspend().catch(() => {});
        }
      }, 70);
    } catch (_) {}
  }

  function uiClick() {
    tone({ freq: 720, freq2: 540, dur: 0.035, peak: 0.045, type: "sine" });
  }

  function buildSfx(kind) {
    if (kind === "cannon") {
      burst(0.09, 0.1, 160, "lowpass", 0.7);
      tone({ freq: 150, freq2: 62, dur: 0.22, peak: 0.16, type: "sine" });
      tone({ freq: 90, freq2: 48, dur: 0.26, peak: 0.08, type: "triangle" });
      return;
    }
    if (kind === "frost") {
      tone({ freq: 880, freq2: 1320, dur: 0.16, peak: 0.06, type: "sine" });
      tone({ freq: 1760, freq2: 2200, dur: 0.18, peak: 0.035, type: "sine", delay: 0.03 });
      return;
    }
    burst(0.05, 0.05, 1600, "highpass", 0.6);
    tone({ freq: 330, freq2: 494, dur: 0.13, peak: 0.09, type: "triangle" });
  }

  function sellSfx() {
    tone({ freq: 988, freq2: 740, dur: 0.08, peak: 0.07, type: "sine" });
    tone({ freq: 1480, freq2: 988, dur: 0.1, peak: 0.04, type: "triangle", delay: 0.05 });
  }

  function upgradeSfx() {
    tone({ freq: 523, freq2: 784, dur: 0.14, peak: 0.08, type: "triangle" });
    tone({ freq: 784, dur: 0.16, peak: 0.04, type: "sine", delay: 0.08 });
  }

  function shotArrow() {
    burst(0.04, 0.07, 1800, "highpass", 0.8);
    tone({ freq: 1400, freq2: 700, dur: 0.05, peak: 0.05, type: "sine" });
  }

  function shotCannon() {
    burst(0.1, 0.1, 200, "lowpass", 0.6);
    tone({ freq: 120, freq2: 48, dur: 0.16, peak: 0.16, type: "sine" });
  }

  function shotFrost() {
    tone({ freq: 1560, freq2: 2100, dur: 0.07, peak: 0.06, type: "sine" });
    tone({ freq: 2340, freq2: 1800, dur: 0.08, peak: 0.02, type: "triangle", delay: 0.02 });
  }

  function boomSfx() {
    burst(0.12, 0.08, 240, "lowpass", 0.5);
    tone({ freq: 90, freq2: 40, dur: 0.2, peak: 0.12, type: "sine" });
  }

  function hitSfx() {
    burst(0.03, 0.03, 900, "bandpass", 0.8);
  }

  function deathSfx(kind) {
    const boss = kind === "boss";
    tone({
      freq: boss ? 180 : 320,
      freq2: boss ? 62 : 110,
      dur: boss ? 0.28 : 0.13,
      peak: boss ? 0.12 : 0.07,
      type: "sine",
      filterFreq: 480,
      filterType: "lowpass",
    });
  }

  function leakSfx() {
    tone({ freq: 110, dur: 0.42, peak: 0.1, type: "sine" });
    tone({ freq: 116, dur: 0.42, peak: 0.06, type: "sine" });
    tone({ freq: 82, freq2: 55, dur: 0.36, peak: 0.08, type: "triangle" });
  }

  function waveSfx() {
    const brass = (freq, delay, dur, peak) => {
      tone({
        type: "sawtooth",
        freq,
        dur,
        peak,
        attack: 0.03,
        delay,
        filterFreq: 780,
        filterType: "lowpass",
      });
      tone({ type: "sine", freq, dur: dur * 0.85, peak: peak * 0.45, attack: 0.02, delay });
    };
    brass(196, 0, 0.32, 0.07);
    brass(293.66, 0.14, 0.4, 0.08);
  }

  function tickSfx() {
    tone({ freq: 660, freq2: 520, dur: 0.04, peak: 0.035, type: "sine" });
  }

  function victorySfx() {
    const notes = [293.66, 369.99, 440, 587.33];
    for (let i = 0; i < notes.length; i++) {
      tone({
        freq: notes[i],
        dur: 0.38,
        peak: 0.07,
        type: "sine",
        delay: i * 0.16,
        attack: 0.02,
      });
      tone({
        freq: notes[i] * 2,
        dur: 0.28,
        peak: 0.02,
        type: "triangle",
        delay: i * 0.16,
      });
    }
  }

  function defeatSfx() {
    const notes = [220, 174.61, 146.83, 110];
    for (let i = 0; i < notes.length; i++) {
      tone({
        freq: notes[i],
        freq2: notes[i] * 0.85,
        dur: 0.42,
        peak: 0.08,
        type: "sine",
        delay: i * 0.2,
        attack: 0.02,
        filterFreq: 600,
        filterType: "lowpass",
      });
    }
  }

  function play(name, variant) {
    try {
      if (muted || !gestureSeen || failed) return;
      if (!begin()) return;
      switch (name) {
        case "click":
          if (allow("click", 45)) uiClick();
          break;
        case "build":
          if (allow("build", 80)) buildSfx(variant || "arrow");
          break;
        case "sell":
          if (allow("sell", 80)) sellSfx();
          break;
        case "upgrade":
          if (allow("upgrade", 80)) upgradeSfx();
          break;
        case "boom":
          if (allow("boom", 120)) boomSfx();
          break;
        case "hit":
          if (allow("hit", 70)) hitSfx();
          break;
        case "death":
          if (allow("death", 90)) deathSfx(variant);
          break;
        case "leak":
          if (allow("leak", 180)) leakSfx();
          break;
        case "wave":
          if (allow("wave", 500)) waveSfx();
          break;
        case "tick":
          if (allow("tick", 350)) tickSfx();
          break;
        case "victory":
          if (allow("victory", 600)) victorySfx();
          break;
        case "defeat":
          if (allow("defeat", 600)) defeatSfx();
          break;
        default:
          break;
      }
    } catch (_) {}
  }

  function playShot(style) {
    try {
      if (muted || !gestureSeen || failed) return;
      if (!begin()) return;
      if (!allow("shot-any", 55)) return;
      if (style === "cannon") {
        if (allow("shot-cannon", 130)) shotCannon();
      } else if (style === "frost") {
        if (allow("shot-frost", 80)) shotFrost();
      } else if (allow("shot-arrow", 60)) {
        shotArrow();
      }
    } catch (_) {}
  }

  function renderButton() {
    const btn = document.getElementById("btn-audio");
    if (!btn) return;
    btn.textContent = muted ? "静音" : "音乐";
    btn.title = muted ? "点击开启音乐" : "点击静音";
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.setAttribute("aria-label", muted ? "已静音，点击开启" : "音乐开启，点击静音");
  }

  function toggle() {
    gestureSeen = true;
    muted = !muted;
    saveMute();
    renderButton();
    try {
      if (muted) hush();
      else begin();
    } catch (_) {}
    return muted;
  }

  function isMuteTarget(e) {
    const t = e && e.target;
    return !!(t && t.closest && t.closest("#btn-audio"));
  }

  function mark(e) {
    if (isMuteTarget(e)) return;
    gestureSeen = true;
    if (!muted) begin();
  }

  document.addEventListener("pointerdown", mark, true);
  document.addEventListener("touchstart", mark, true);
  document.addEventListener("mousedown", mark, true);
  document.addEventListener("click", mark, true);

  const btn = document.getElementById("btn-audio");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });
  }
  renderButton();

  window.CoinpathAudio = {
    play,
    playShot,
    toggle,
    setChapter,
    setPaused: setBgmPaused,
    trackSeconds(id) {
      const t = TRACKS[id];
      if (!t) return 0;
      return t.chords.length * 4 * (60 / t.bpm);
    },
    isMuted() {
      return muted;
    },
  };
})();
