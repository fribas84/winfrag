/* CalmAmp — a late-90s player skin on the Windows 98 desktop.
   Every tone is synthesized in this page. No audio file, no network, no disk. */

'use strict';

const AMP_BANDS = [
  [60, '60'],
  [170, '170'],
  [310, '310'],
  [600, '600'],
  [1000, '1k'],
  [3000, '3k'],
  [6000, '6k'],
  [12000, '12k'],
  [14000, '14k'],
  [16000, '16k'],
];

const SEGMENTS = {
  0: '1110111',
  1: '0010010',
  2: '1011101',
  3: '1011011',
  4: '0111010',
  5: '1101011',
  6: '1101111',
  7: '1010010',
  8: '1111111',
  9: '1111011',
};

function midi(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function ampClamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function fmtClock(sec) {
  const whole = Math.max(0, Math.round(sec));
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function tone(t, dur, note, type, peak, attack, release, pan, scale) {
  return {
    t: t,
    dur: dur,
    freq: midi(note) * (scale || 1),
    type: type,
    peak: peak,
    attack: attack,
    release: release,
    pan: pan || 0,
  };
}

function pad(t, dur, notes, peak) {
  const out = [];
  notes.forEach((note, i) => {
    const pan = notes.length === 1 ? 0 : ((i / (notes.length - 1)) - 0.5) * 0.55;
    out.push(tone(t, dur, note, 'sine', peak, 1.5, 2.6, pan, 1));
    out.push(tone(t, dur, note, 'triangle', peak * 0.16, 1.8, 2.6, pan, 1.002));
  });
  out.push(tone(t, dur, notes[0] - 12, 'sine', peak * 0.55, 1.2, 2.2, 0, 1));
  return out;
}

function drops(times, scale, peak) {
  return times.map((t, i) => tone(t, 1.7, scale[i % scale.length], 'sine', peak, 0.008, 1.35, (i % 2 ? 0.35 : -0.35), 1));
}

function melody(start, step, notes, dur, peak, pan) {
  return notes.map((note, i) => tone(start + i * step, dur, note, 'sine', peak, 0.012, 1.15, pan || 0, 1));
}

function windowRainEvents() {
  return [].concat(
    pad(0, 20, [57, 60, 64, 67], 0.07),
    pad(18, 20, [53, 57, 60, 64], 0.068),
    pad(36, 20, [60, 64, 67, 71], 0.066),
    pad(54, 18, [55, 59, 62, 65], 0.064),
    drops(
      [2.4, 6.1, 9.8, 13.2, 17.5, 21.4, 25.6, 29.1, 33.8, 37.2, 41.9, 46.4, 50.2, 54.8, 59.3, 63.7, 67.4, 70.2],
      [81, 84, 86, 88, 91, 86, 84, 81],
      0.04
    )
  );
}

function deskLampEvents() {
  const phrase = [74, 78, 81, 78, 74, 71, 69, 66, 64, 62, 66, 69, 74, 71, 69, 66];
  return [].concat(
    pad(0, 64, [50, 57, 62], 0.045),
    melody(0.6, 2.35, phrase, 1.55, 0.055, 0.08),
    melody(40, 1.85, phrase.slice(0, 12), 1.35, 0.05, -0.08)
  );
}

function nightFerryEvents() {
  return [].concat(
    pad(0, 22, [48, 51, 55], 0.06),
    pad(20, 22, [56, 60, 63], 0.058),
    pad(40, 22, [58, 62, 65], 0.056),
    pad(60, 20, [53, 57, 60], 0.055),
    tone(4, 12, 67, 'triangle', 0.04, 0.4, 2.2, -0.2, 1),
    tone(24, 12, 70, 'triangle', 0.038, 0.4, 2.2, 0.15, 1),
    tone(44, 14, 72, 'triangle', 0.036, 0.5, 2.4, -0.1, 1),
    tone(64, 14, 69, 'triangle', 0.034, 0.5, 2.4, 0.2, 1)
  );
}

function teaSteamEvents() {
  return [].concat(
    pad(0, 18, [60, 64, 67, 71], 0.062),
    pad(15, 18, [57, 60, 64, 67], 0.06),
    pad(30, 18, [53, 57, 60, 64], 0.058),
    pad(45, 15, [55, 59, 62, 69], 0.056),
    tone(0.2, 2.8, 71, 'sine', 0.05, 0.01, 2.2, 0.25, 1),
    tone(15.2, 2.8, 67, 'sine', 0.048, 0.01, 2.2, -0.2, 1),
    tone(30.2, 2.8, 64, 'sine', 0.046, 0.01, 2.2, 0.2, 1),
    tone(45.2, 2.6, 69, 'sine', 0.044, 0.01, 2.2, -0.15, 1)
  );
}

function libraryEvents() {
  return [].concat(
    pad(0, 48, [57, 64], 0.028),
    tone(4, 8, 64, 'sine', 0.034, 0.08, 3.2, -0.3, 1),
    tone(12, 8, 67, 'sine', 0.032, 0.08, 3.2, 0.25, 1),
    tone(22, 9, 69, 'sine', 0.03, 0.1, 3.4, -0.15, 1),
    tone(31, 8, 62, 'sine', 0.03, 0.1, 3.2, 0.3, 1),
    tone(39, 8, 59, 'sine', 0.028, 0.1, 3.4, 0, 1)
  );
}

const AMP_TRACKS = [
  {
    title: 'Window Rain',
    blurb: 'slow chords behind rain on the glass',
    kind: 'rain',
    length: 72,
    bed: 'rain',
    events: windowRainEvents(),
  },
  {
    title: 'Desk Lamp',
    blurb: 'a quiet music box over a warm drone',
    kind: 'bell',
    length: 64,
    bed: 'hush',
    events: deskLampEvents(),
  },
  {
    title: 'Night Ferry',
    blurb: 'low fifths moving slower than the clock',
    kind: 'drone',
    length: 80,
    bed: null,
    events: nightFerryEvents(),
  },
  {
    title: 'Tea Steam',
    blurb: 'major sevenths and a soft bell',
    kind: 'pad',
    length: 60,
    bed: 'hush',
    events: teaSteamEvents(),
  },
  {
    title: 'Library Air',
    blurb: 'almost silence, with a note now and then',
    kind: 'air',
    length: 48,
    bed: 'library',
    events: libraryEvents(),
  },
];

function auditTracks() {
  return AMP_TRACKS.map((track) => {
    const bad = track.events.filter((ev) => {
      return !(ev.t >= 0 && ev.t < track.length && ev.dur > 0 && ev.freq > 0 && ev.peak > 0);
    });
    return { title: track.title, notes: track.events.length, bad: bad.length, length: track.length };
  });
}

const ampWin = document.getElementById('winAmp');
const ampTitle = document.getElementById('ampTitleBar');
const ampSong = document.getElementById('ampSong');
const ampList = document.getElementById('ampList');
const ampSeek = document.getElementById('ampSeek');
const ampVol = document.getElementById('ampVol');
const ampBal = document.getElementById('ampBal');
const ampTimeCanvas = document.getElementById('ampTime');
const ampVis = document.getElementById('ampVis');
const ampVisBtn = document.getElementById('ampVisBtn');
const ampTimeBtn = document.getElementById('ampTimeBtn');
const ampKind = document.getElementById('ampKind');
const ampStereo = document.getElementById('ampStereo');
const ampShadeTime = document.getElementById('ampShadeTime');
const ampPlay = document.getElementById('ampPlay');
const ampPause = document.getElementById('ampPause');
const ampEq = document.getElementById('ampEq');
const ampEqBtn = document.getElementById('ampEqBtn');
const ampPl = document.getElementById('ampPl');
const ampPlBtn = document.getElementById('ampPlBtn');
const ampMenu = document.getElementById('ampMenu');
const ampMenuBtn = document.getElementById('ampMenuBtn');
const ampLive = document.getElementById('ampLive');
const ampTask = document.getElementById('taskAmp');

let ampIndex = 0;
let ampSelected = 0;
let ampPlaying = false;
let ampPaused = false;
let ampRemain = false;
let ampRepeat = true;
let ampShuffle = false;
let ampScope = false;
let ampPosition = 0;
let ampOrigin = null;
let ampHorizon = 0;
let ampCatchUp = false;
let ampEnding = false;
let ampPlaced = false;
let ampClosed = true;
let ampSeeking = false;
let ampLastClock = '';
let ampRaf = 0;
let ampPump = 0;

let audioCtx = null;
let ampMaster = null;
let ampPanner = null;
let ampAnalyser = null;
let ampEqNodes = [];
let ampVoices = [];
let ampBed = null;
let ampBins = null;
let ampWave = null;
let noiseBuf = null;

const ampEqInputs = [];

function track() {
  return AMP_TRACKS[ampIndex];
}

function sliderGain() {
  const v = Number(ampVol.value) / 100;
  return v * v * 0.62;
}

function currentPos() {
  const length = track().length;
  if (ampPlaying && audioCtx && ampOrigin != null) {
    return ampClamp(audioCtx.currentTime - ampOrigin, 0, length);
  }
  return ampClamp(ampPosition, 0, length);
}

function say(text) {
  ampLive.textContent = '';
  setTimeout(() => { ampLive.textContent = text; }, 30);
}

function setMarquee() {
  const piece = track();
  ampSong.textContent = piece.title + '   —   ' + piece.blurb + '   —   generated in this window';
  ampSong.style.animation = 'none';
  void ampSong.offsetWidth;
  ampSong.style.animation = '';
  ampKind.textContent = piece.kind;
}

function renderList() {
  ampList.replaceChildren();
  AMP_TRACKS.forEach((piece, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'amp-track';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', i === ampSelected ? 'true' : 'false');
    if (i === ampIndex && ampPlaying) btn.classList.add('is-current');
    btn.tabIndex = i === ampSelected ? 0 : -1;
    const num = document.createElement('span');
    num.textContent = (i === ampIndex && ampPlaying) ? '>' : String(i + 1);
    const name = document.createElement('span');
    name.textContent = piece.title;
    const len = document.createElement('span');
    len.textContent = fmtClock(piece.length);
    btn.append(num, name, len);
    btn.addEventListener('click', () => selectTrack(i, false));
    btn.addEventListener('dblclick', () => playIndex(i, 0));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = e.key === 'ArrowDown'
          ? Math.min(AMP_TRACKS.length - 1, i + 1)
          : Math.max(0, i - 1);
        selectTrack(next, true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        playIndex(i, 0);
      }
    });
    ampList.append(btn);
  });
}

function selectTrack(i, focus) {
  ampSelected = i;
  renderList();
  if (focus) {
    const btn = ampList.children[i];
    if (btn) btn.focus();
  }
}

function syncTransport() {
  const on = ampPlaying && !ampPaused;
  ampWin.classList.toggle('is-playing', on);
  ampWin.classList.toggle('is-paused', ampPlaying && ampPaused);
  ampWin.classList.toggle('is-idle', !ampPlaying);
  ampPlay.setAttribute('aria-pressed', on ? 'true' : 'false');
  ampPause.setAttribute('aria-pressed', ampPlaying && ampPaused ? 'true' : 'false');
  ampStereo.classList.toggle('is-on', on);
  const piece = track();
  ampTask.title = on ? 'CalmAmp — ' + piece.title : 'CalmAmp';
  const sh = document.getElementById('ampShuffle');
  const rp = document.getElementById('ampRepeat');
  sh.setAttribute('aria-pressed', ampShuffle ? 'true' : 'false');
  rp.setAttribute('aria-pressed', ampRepeat ? 'true' : 'false');
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = on ? 'playing' : (ampPlaying ? 'paused' : 'none');
      navigator.mediaSession.metadata = new MediaMetadata({
        title: piece.title,
        artist: 'CalmAmp',
        album: 'Desk tones',
      });
    } catch (err) { /* metadata is optional */ }
  }
}

function syncTask() {
  if (ampClosed) {
    ampTask.hidden = true;
    return;
  }
  ampTask.hidden = false;
  const shade = document.getElementById('shade');
  const pressed = !ampWin.hidden && ampWin.classList.contains('active') && shade.hidden;
  ampTask.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

function noiseBuffer(ctx) {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buf.getChannelData(channel);
    let v = 0;
    for (let i = 0; i < len; i++) {
      v = (v + (Math.random() * 2 - 1) * 0.09) * 0.96;
      data[i] = ampClamp(v * 3.4, -1, 1);
    }
  }
  noiseBuf = buf;
  return buf;
}

function makeBed(kind) {
  const spec = {
    rain: { type: 'bandpass', freq: 1500, q: 0.42, gain: 0.02 },
    hush: { type: 'lowpass', freq: 680, q: 0.7, gain: 0.011 },
    library: { type: 'bandpass', freq: 880, q: 0.5, gain: 0.022 },
  }[kind];
  if (!spec) return null;
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer(audioCtx);
  src.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = spec.type;
  filter.frequency.value = spec.freq;
  filter.Q.value = spec.q;
  const gain = audioCtx.createGain();
  gain.gain.value = spec.gain;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ampMaster);
  src.start();
  return {
    stop(when) {
      const t = when == null ? audioCtx.currentTime : when;
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.stop(t + 0.06);
      } catch (err) { /* already stopped */ }
    },
  };
}

function ensureCtx() {
  if (audioCtx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) {
    ampSong.textContent = 'This browser cannot make sound.';
    return false;
  }
  audioCtx = new AC();
  ampMaster = audioCtx.createGain();
  ampMaster.gain.value = sliderGain();
  let node = ampMaster;
  ampEqNodes = AMP_BANDS.map((band, i) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = band[0];
    filter.Q.value = 1.15;
    filter.gain.value = ampEqInputs[i] ? Number(ampEqInputs[i].value) : 0;
    node.connect(filter);
    node = filter;
    return filter;
  });
  const soften = audioCtx.createBiquadFilter();
  soften.type = 'lowpass';
  soften.frequency.value = 7600;
  soften.Q.value = 0.45;
  node.connect(soften);
  ampPanner = audioCtx.createStereoPanner();
  ampPanner.pan.value = Number(ampBal.value) / 100;
  soften.connect(ampPanner);
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.012;
  comp.release.value = 0.28;
  ampPanner.connect(comp);
  ampAnalyser = audioCtx.createAnalyser();
  ampAnalyser.fftSize = 256;
  ampAnalyser.smoothingTimeConstant = 0.78;
  ampAnalyser.minDecibels = -96;
  ampAnalyser.maxDecibels = -18;
  comp.connect(ampAnalyser);
  ampAnalyser.connect(audioCtx.destination);
  ampBins = new Uint8Array(ampAnalyser.frequencyBinCount);
  ampWave = new Uint8Array(ampAnalyser.fftSize);
  return true;
}

function playEvent(ev, when, dur) {
  const peak = Math.max(0.0002, ev.peak);
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = ev.type || 'sine';
  osc.frequency.setValueAtTime(ev.freq, when);
  const attack = Math.max(0.005, Math.min(ev.attack || 0.02, dur * 0.45));
  const release = Math.max(0.03, Math.min(ev.release || 0.2, dur * 0.55));
  const end = when + dur;
  const attackAt = when + attack;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(peak, attackAt);
  const sustainAt = end - release;
  if (sustainAt > attackAt + 0.02 && sustainAt < end - 0.01) {
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.65), sustainAt);
  }
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  let out = gain;
  if (ev.pan) {
    const panner = audioCtx.createStereoPanner();
    panner.pan.value = ampClamp(ev.pan, -1, 1);
    gain.connect(panner);
    out = panner;
  }
  out.connect(ampMaster);
  osc.connect(gain);
  osc.start(when);
  osc.stop(end + 0.03);
  const item = { osc: osc, gain: gain };
  ampVoices.push(item);
  osc.onended = () => {
    const at = ampVoices.indexOf(item);
    if (at >= 0) ampVoices.splice(at, 1);
  };
}

function silenceNotes() {
  if (!audioCtx) {
    ampVoices = [];
    return;
  }
  const now = audioCtx.currentTime;
  ampVoices.forEach((item) => {
    try {
      item.gain.gain.cancelScheduledValues(now);
      item.gain.gain.setValueAtTime(Math.max(0.0001, item.gain.gain.value), now);
      item.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      item.osc.stop(now + 0.04);
    } catch (err) { /* node already ended */ }
  });
  ampVoices = [];
}

function silenceBed() {
  if (ampBed) {
    ampBed.stop();
    ampBed = null;
  }
}

function scheduleRange(from, to, catchUp) {
  const events = track().events;
  events.forEach((ev) => {
    const starts = ev.t >= from && ev.t < to;
    const mid = catchUp && ev.t < from && ev.t + ev.dur > from;
    if (!starts && !mid) return;
    const at = mid ? from : ev.t;
    const dur = ev.t + ev.dur - at;
    if (dur < 0.08) return;
    playEvent(ev, ampOrigin + at, dur);
  });
}

function pump() {
  if (!ampPlaying || !audioCtx || ampPaused || ampOrigin == null) return;
  const now = audioCtx.currentTime;
  const pos = now - ampOrigin;
  if (pos >= track().length - 0.03) {
    onEnded();
    return;
  }
  const target = Math.min(ampOrigin + track().length, now + 0.5);
  let guard = 0;
  while (ampHorizon < target - 0.001 && guard < 6) {
    guard += 1;
    const from = ampHorizon - ampOrigin;
    const to = target - ampOrigin;
    scheduleRange(Math.max(0, from), to, ampCatchUp);
    ampCatchUp = false;
    ampHorizon = ampOrigin + to;
  }
}

function ensurePump() {
  if (!ampPump) ampPump = setInterval(pump, 90);
}

function stopPump() {
  if (ampPump) {
    clearInterval(ampPump);
    ampPump = 0;
  }
}

function startBedForTrack() {
  silenceBed();
  if (track().bed) ampBed = makeBed(track().bed);
}

function startPlaying(pos) {
  if (!ensureCtx()) return;
  const resume = audioCtx.resume();
  if (resume && typeof resume.catch === 'function') resume.catch(() => {});
  silenceNotes();
  startBedForTrack();
  ampPlaying = true;
  ampPaused = false;
  ampPosition = pos;
  const now = audioCtx.currentTime + 0.06;
  ampOrigin = now - pos;
  ampHorizon = now;
  ampCatchUp = true;
  ensurePump();
  pump();
  ampSelected = ampIndex;
  setMarquee();
  renderList();
  syncTransport();
  say('Playing ' + track().title);
}

function hardStop() {
  ampPlaying = false;
  ampPaused = false;
  ampPosition = 0;
  ampOrigin = null;
  silenceNotes();
  silenceBed();
  stopPump();
  if (audioCtx && audioCtx.state === 'suspended') {
    const resume = audioCtx.resume();
    if (resume && typeof resume.catch === 'function') resume.catch(() => {});
  }
  setMarquee();
  renderList();
  syncTransport();
  ampLastClock = '';
  updateClock();
}

function onEnded() {
  if (ampEnding || !ampPlaying) return;
  ampEnding = true;
  try {
    const next = chooseNext(true);
    if (next == null) hardStop();
    else {
      ampIndex = next;
      ampSelected = next;
      startPlaying(0);
    }
  } finally {
    ampEnding = false;
  }
}

function chooseNext(auto) {
  if (ampShuffle && AMP_TRACKS.length > 1) {
    let n = ampIndex;
    while (n === ampIndex) n = Math.floor(Math.random() * AMP_TRACKS.length);
    return n;
  }
  if (ampIndex + 1 < AMP_TRACKS.length) return ampIndex + 1;
  if (!auto || ampRepeat) return 0;
  return null;
}

function choosePrev() {
  if (ampShuffle && AMP_TRACKS.length > 1) {
    let n = ampIndex;
    while (n === ampIndex) n = Math.floor(Math.random() * AMP_TRACKS.length);
    return n;
  }
  return ampIndex <= 0 ? AMP_TRACKS.length - 1 : ampIndex - 1;
}

function playIndex(i, pos) {
  ampIndex = i;
  ampSelected = i;
  startPlaying(pos);
}

function doSeek(pos) {
  const length = track().length;
  pos = ampClamp(pos, 0, Math.max(0, length - 0.05));
  ampPosition = pos;
  if (!ampPlaying || !audioCtx) {
    updateClock();
    return;
  }
  silenceNotes();
  const now = audioCtx.currentTime + (ampPaused ? 0 : 0.05);
  ampOrigin = now - pos;
  ampHorizon = now;
  ampCatchUp = true;
  if (!ampPaused) pump();
  updateClock();
}

function onPlay() {
  if (ampPlaying && ampPaused) {
    const resume = audioCtx.resume();
    if (resume && typeof resume.catch === 'function') resume.catch(() => {});
    ampPaused = false;
    syncTransport();
    say('Resumed ' + track().title);
    return;
  }
  if (ampPlaying && ampSelected === ampIndex) {
    doSeek(0);
    return;
  }
  ampIndex = ampSelected;
  startPlaying(ampPlaying ? 0 : ampPosition);
}

function onPause() {
  if (!ampPlaying || !audioCtx) return;
  if (ampPaused) {
    const resume = audioCtx.resume();
    if (resume && typeof resume.catch === 'function') resume.catch(() => {});
    ampPaused = false;
    say('Resumed ' + track().title);
  } else {
    ampPaused = true;
    const suspend = audioCtx.suspend();
    if (suspend && typeof suspend.catch === 'function') suspend.catch(() => {});
    say('Paused');
  }
  syncTransport();
}

function onStop() {
  if (ampPlaying) say('Stopped');
  hardStop();
}

function onNext() {
  const next = chooseNext(false);
  ampIndex = next;
  ampSelected = next;
  if (ampPlaying) startPlaying(0);
  else {
    ampPosition = 0;
    setMarquee();
    renderList();
    updateClock();
  }
}

function onPrev() {
  if (ampPlaying && currentPos() > 2.5) {
    doSeek(0);
    return;
  }
  const prev = choosePrev();
  ampIndex = prev;
  ampSelected = prev;
  if (ampPlaying) startPlaying(0);
  else {
    ampPosition = 0;
    setMarquee();
    renderList();
    updateClock();
  }
}

function drawDigit(g, mask, x, y, w, h, t, color) {
  g.strokeStyle = color;
  g.lineWidth = t;
  g.lineCap = 'butt';
  const mid = y + h / 2;
  const lines = [
    [x + t, y + t * 0.2, x + w - t, y + t * 0.2],
    [x + t * 0.2, y + t, x + t * 0.2, mid - t * 0.3],
    [x + w - t * 0.2, y + t, x + w - t * 0.2, mid - t * 0.3],
    [x + t, mid, x + w - t, mid],
    [x + t * 0.2, mid + t * 0.3, x + t * 0.2, y + h - t],
    [x + w - t * 0.2, mid + t * 0.3, x + w - t * 0.2, y + h - t],
    [x + t, y + h - t * 0.2, x + w - t, y + h - t * 0.2],
  ];
  for (let i = 0; i < 7; i++) {
    if (mask[i] !== '1') continue;
    g.beginPath();
    g.moveTo(lines[i][0], lines[i][1]);
    g.lineTo(lines[i][2], lines[i][3]);
    g.stroke();
  }
}

function drawClock(text, minus) {
  const canvas = ampTimeCanvas;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  const h = 52;
  const dw = 32;
  const gap = 8;
  const colonW = 18;
  const total = dw * 4 + gap * 3 + colonW;
  const y = Math.round((canvas.height - h) / 2);
  const start = Math.round((canvas.width - total) / 2);
  const chars = text.replace(':', '');
  function pass(color, ghost) {
    let x = start;
    for (let i = 0; i < 4; i++) {
      const ch = ghost ? '8' : (chars[i] || '0');
      drawDigit(g, SEGMENTS[ch] || SEGMENTS[0], x, y, dw, h, 4, color);
      x += dw + gap;
      if (i === 1) x += colonW - gap;
    }
    const cx = start + dw * 2 + gap + (colonW - gap) / 2 + gap / 2;
    g.fillStyle = color;
    g.beginPath();
    g.arc(cx, y + h * 0.34, 2.4, 0, Math.PI * 2);
    g.arc(cx, y + h * 0.68, 2.4, 0, Math.PI * 2);
    g.fill();
    if (!ghost && minus) {
      g.strokeStyle = color;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(start - 16, y + h / 2);
      g.lineTo(start - 6, y + h / 2);
      g.stroke();
    }
  }
  pass('#0c3b22', true);
  pass('#49ff86', false);
}

function updateClock() {
  const length = track().length;
  const pos = currentPos();
  const shown = ampRemain ? Math.max(0, length - pos) : pos;
  const text = fmtClock(shown);
  if (text !== ampLastClock || ampRemain) {
    ampLastClock = text;
    drawClock(text, ampRemain);
    ampShadeTime.textContent = (ampRemain ? '-' : '') + text;
  }
  if (!ampSeeking) ampSeek.value = String(Math.round((pos / length) * 1000));
  const spoken = (ampRemain ? 'Remaining ' : 'Elapsed ') + text + '. Activate to switch.';
  if (ampTimeBtn.getAttribute('aria-label') !== spoken) ampTimeBtn.setAttribute('aria-label', spoken);
}

function fitVis() {
  const rect = ampVisBtn.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(40, Math.floor(rect.width * dpr));
  const h = Math.max(24, Math.floor(rect.height * dpr));
  if (ampVis.width !== w || ampVis.height !== h) {
    ampVis.width = w;
    ampVis.height = h;
  }
}

function drawVis() {
  fitVis();
  const g = ampVis.getContext('2d');
  const w = ampVis.width;
  const h = ampVis.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  const active = ampPlaying && !ampPaused && ampAnalyser;
  if (!active) {
    g.strokeStyle = '#145c30';
    g.lineWidth = Math.max(1, h / 40);
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    return;
  }
  if (ampScope) {
    ampAnalyser.getByteTimeDomainData(ampWave);
    g.strokeStyle = '#3cff6e';
    g.lineWidth = Math.max(1, h / 28);
    g.beginPath();
    for (let x = 0; x < w; x++) {
      const sample = ampWave[Math.floor((x / w) * ampWave.length)];
      const v = (sample - 128) / 128;
      const y = ampClamp(h / 2 - v * h * 2.2, 1, h - 1);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    return;
  }
  ampAnalyser.getByteFrequencyData(ampBins);
  const bars = 18;
  const gap = Math.max(1, Math.floor(w / 140));
  const bw = Math.max(2, Math.floor((w - gap * (bars + 1)) / bars));
  for (let i = 0; i < bars; i++) {
    const v = Math.pow(ampBins[i + 1] / 255, 0.72);
    const bh = Math.max(2, Math.round(v * (h - 2)));
    const x = gap + i * (bw + gap);
    for (let y = h - 2; y > h - bh; y -= 3) {
      const level = (h - y) / h;
      g.fillStyle = level > 0.72 ? '#ff4d3a' : level > 0.46 ? '#d6e35a' : '#3cff6e';
      g.fillRect(x, y, bw, 2);
    }
  }
}

function loop() {
  if (ampWin.hidden) {
    ampRaf = 0;
    return;
  }
  updateClock();
  drawVis();
  ampRaf = requestAnimationFrame(loop);
}

function ensureLoop() {
  if (!ampRaf) ampRaf = requestAnimationFrame(loop);
}

function placeOnce() {
  if (ampPlaced) return;
  ampPlaced = true;
  const desktop = document.getElementById('desktop');
  if (desktop.clientHeight < 460) {
    ampPl.hidden = true;
    ampPlBtn.setAttribute('aria-pressed', 'false');
  }
  const w = ampWin.offsetWidth || 292;
  const h = ampWin.offsetHeight || 280;
  let left = desktop.clientWidth - w - 12;
  if (left < 96) left = 8;
  let top = 16;
  const limit = desktop.clientHeight - 34 - h;
  if (top > limit) top = Math.max(8, limit);
  ampWin.style.right = 'auto';
  ampWin.style.left = left + 'px';
  ampWin.style.top = top + 'px';
}

function openAmp() {
  ampClosed = false;
  ampWin.hidden = false;
  ampTask.hidden = false;
  placeOnce();
  if (window.WinShell) window.WinShell.activate(ampWin);
  ensureLoop();
  syncTask();
  setMarquee();
  updateClock();
}

function minimizeAmp() {
  ampWin.hidden = true;
  closeAmpMenu();
  syncTask();
}

function closeAmp() {
  hardStop();
  ampClosed = true;
  ampWin.hidden = true;
  closeAmpMenu();
  syncTask();
}

function toggleShade() {
  ampWin.classList.toggle('shaded');
  const on = ampWin.classList.contains('shaded');
  document.getElementById('ampShade').setAttribute('aria-pressed', on ? 'true' : 'false');
  document.getElementById('ampShade').setAttribute('aria-label', on ? 'Unshade window' : 'Shade window');
}

function closeAmpMenu() {
  ampMenu.hidden = true;
  ampMenuBtn.setAttribute('aria-expanded', 'false');
}

function buildEq() {
  AMP_BANDS.forEach((band) => {
    const label = document.createElement('label');
    label.className = 'amp-band';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '-12';
    input.max = '12';
    input.step = '1';
    input.value = '0';
    input.setAttribute('aria-label', band[1] + ' hertz');
    const span = document.createElement('span');
    span.textContent = band[1];
    input.addEventListener('input', () => {
      const node = ampEqNodes[ampEqInputs.indexOf(input)];
      if (node) node.gain.value = Number(input.value);
    });
    label.append(input, span);
    ampEq.append(label);
    ampEqInputs.push(input);
  });
}

function wireAmp() {
  buildEq();
  renderList();
  setMarquee();
  drawClock('00:00', false);
  syncTransport();

  document.getElementById('ampPrev').addEventListener('click', onPrev);
  ampPlay.addEventListener('click', onPlay);
  ampPause.addEventListener('click', onPause);
  document.getElementById('ampStop').addEventListener('click', onStop);
  document.getElementById('ampNext').addEventListener('click', onNext);
  document.getElementById('ampShuffle').addEventListener('click', () => {
    ampShuffle = !ampShuffle;
    syncTransport();
  });
  document.getElementById('ampRepeat').addEventListener('click', () => {
    ampRepeat = !ampRepeat;
    syncTransport();
  });
  document.getElementById('ampMin').addEventListener('click', minimizeAmp);
  document.getElementById('ampClose').addEventListener('click', closeAmp);
  document.getElementById('ampShade').addEventListener('click', toggleShade);
  document.getElementById('ampShadePlay').addEventListener('click', () => {
    if (ampPlaying && !ampPaused) onPause();
    else onPlay();
  });
  ampTitle.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    toggleShade();
  });
  ampMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = ampMenu.hidden;
    closeAmpMenu();
    if (open) {
      ampMenu.hidden = false;
      ampMenuBtn.setAttribute('aria-expanded', 'true');
    }
  });
  document.getElementById('ampAbout').addEventListener('click', () => {
    closeAmpMenu();
    if (window.WinShell) {
      window.WinShell.showMsg(
        'CalmAmp',
        'CalmAmp plays a soft piece made in this window. The tones are generated here. Nothing is read from a disk or the network.'
      );
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#ampMenu') && !e.target.closest('#ampMenuBtn')) closeAmpMenu();
  });

  ampTimeBtn.addEventListener('click', () => {
    ampRemain = !ampRemain;
    ampLastClock = '';
    updateClock();
  });
  ampVisBtn.addEventListener('click', () => {
    ampScope = !ampScope;
    ampVisBtn.setAttribute(
      'aria-label',
      ampScope
        ? 'Oscilloscope. Activate to switch to the spectrum.'
        : 'Spectrum. Activate to switch to the oscilloscope.'
    );
  });

  ampVol.addEventListener('input', () => {
    if (!ampMaster || !audioCtx) return;
    ampMaster.gain.setTargetAtTime(sliderGain(), audioCtx.currentTime, 0.03);
  });
  ampBal.addEventListener('input', () => {
    if (ampPanner) ampPanner.pan.value = Number(ampBal.value) / 100;
  });

  ampSeek.addEventListener('pointerdown', () => { ampSeeking = true; });
  function endSeek() {
    if (!ampSeeking) return;
    ampSeeking = false;
    doSeek((Number(ampSeek.value) / 1000) * track().length);
  }
  ampSeek.addEventListener('pointerup', endSeek);
  ampSeek.addEventListener('pointercancel', endSeek);
  ampSeek.addEventListener('input', () => {
    const pos = (Number(ampSeek.value) / 1000) * track().length;
    const shown = ampRemain ? track().length - pos : pos;
    drawClock(fmtClock(shown), ampRemain);
    ampShadeTime.textContent = (ampRemain ? '-' : '') + fmtClock(shown);
    if (!ampSeeking) doSeek(pos);
  });

  ampEqBtn.addEventListener('click', () => {
    const on = ampEq.hidden;
    ampEq.hidden = !on;
    ampEqBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  ampPlBtn.addEventListener('click', () => {
    const on = ampPl.hidden;
    ampPl.hidden = !on;
    ampPlBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  ampTask.addEventListener('click', () => {
    if (ampClosed || ampWin.hidden) openAmp();
    else if (ampWin.classList.contains('active')) minimizeAmp();
    else if (window.WinShell) window.WinShell.activate(ampWin);
    syncTask();
  });

  if (window.WinShell) window.WinShell.makeDraggable(ampWin, ampTitle);

  new MutationObserver(syncTask).observe(ampWin, { attributes: true, attributeFilter: ['class', 'hidden'] });
  new MutationObserver(syncTask).observe(document.getElementById('shade'), { attributes: true, attributeFilter: ['hidden'] });

  ['safe', 'dos', 'reboot'].forEach((id) => {
    const el = document.getElementById(id);
    new MutationObserver(() => {
      if (!el.hidden) hardStop();
    }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  });

  window.addEventListener('resize', () => {
    if (ampWin.hidden) return;
    fitVis();
    const desktop = document.getElementById('desktop');
    const maxLeft = Math.max(8, desktop.clientWidth - ampWin.offsetWidth - 8);
    const maxTop = Math.max(8, desktop.clientHeight - 38 - Math.min(ampWin.offsetHeight, desktop.clientHeight - 46));
    const left = parseFloat(ampWin.style.left);
    const top = parseFloat(ampWin.style.top);
    if (!Number.isNaN(left) && left > maxLeft) ampWin.style.left = maxLeft + 'px';
    if (!Number.isNaN(top) && top > maxTop) ampWin.style.top = maxTop + 'px';
  });

  if ('mediaSession' in navigator) {
    const bind = (name, fn) => {
      try { navigator.mediaSession.setActionHandler(name, fn); } catch (err) { /* unsupported action */ }
    };
    bind('play', onPlay);
    bind('pause', onPause);
    bind('stop', onStop);
    bind('nexttrack', onNext);
    bind('previoustrack', onPrev);
  }
}

wireAmp();
openAmp();

window.CalmAmp = {
  open: openAmp,
  syncTask: syncTask,
  audit: auditTracks,
  snapshot: () => ({
    playing: ampPlaying,
    paused: ampPaused,
    index: ampIndex,
    title: track().title,
    pos: currentPos(),
    ctx: audioCtx ? audioCtx.state : 'none',
    voices: ampVoices.length,
    bed: !!ampBed,
    time: ampShadeTime.textContent,
    closed: ampClosed,
    hidden: ampWin.hidden,
  }),
};
