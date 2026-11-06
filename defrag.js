/* Fake Windows 98 Disk Defragmenter.
   Random cluster motion for show. No disk access, no filesystem, no defrag algorithm. */

'use strict';

const COLS = 64;
const ROWS = 32;
const N = COLS * ROWS;

const FREE = 0;
const USED = 1;
const OPT = 2;
const UNMOV = 3;
const BAD = 4;
const READ = 5;
const WRITE = 6;

const COLORS = {
  [FREE]: '#ffffff',
  [USED]: '#6ae5fb',
  [OPT]: '#0208aa',
  [UNMOV]: '#ffffff',
  [BAD]: '#000000',
  [READ]: '#64d940',
  [WRITE]: '#ea3a2e',
};

const STATE_NAME = {
  [FREE]: 'Free space',
  [USED]: 'Used data',
  [OPT]: 'Optimized data',
  [UNMOV]: 'Unmovable data',
  [BAD]: 'Bad cluster',
  [READ]: 'Reading',
  [WRITE]: 'Writing',
};

const DRIVE_LABEL = { A: '(A:)', C: '(C:)', D: '(D:)' };
const SPEEDS = { slow: 0.45, normal: 1, fast: 2.75 };
const SPEED_LABEL = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };

const params = new URLSearchParams(location.search);
const SESSION_MS = params.has('quick') ? 8000 : 180000;

const $ = (id) => document.getElementById(id);

const desktop = $('desktop');
const win = $('winDefrag');
const winPc = $('winPc');
const canvas = $('map');
const ctx = canvas.getContext('2d', { alpha: false });
const mapWell = $('mapWell');
const tip = $('tip');
const live = $('live');

const cells = new Uint8Array(N);
const lockKind = new Uint8Array(N);
const overlayKind = new Uint8Array(N);
const overlayUntil = new Float64Array(N);
const seen = new Uint32Array(N);

let stamp = 1;
let drive = 'C';
let mode = 'ready';
let speedName = 'normal';
let speed = 1;
let personality = null;
let head = 0;
let cellSize = 8;
let cellCap = 15;
let runClock = 0;
let elapsedMs = 0;
let sessionMs = 0;
let progress = 0;
let nextBurstAt = 0;
let nextStallAt = 0;
let stallUntil = 0;
let pending = [];
let dirty = true;
let hover = -1;
let lastFragAt = 0;
let lastAnnouncedPct = -1;
let celebrated = false;
let pausedFrom = null;
let finishCursor = 0;
let finishHold = 0;
let minimized = false;
let closed = false;
let pcMin = false;
let isMax = false;
let savedRect = null;
let openDlg = null;
let msgOnOk = null;
let activeBeforeDlg = null;
let zBump = 6;

ctx.imageSmoothingEnabled = false;

function rollPersonality() {
  personality = {
    jumpFar: 0.28 + Math.random() * 0.62,
    burst: 6 + ((Math.random() * 16) | 0),
    scanBias: 0.12 + Math.random() * 0.22,
    tempo: 0.75 + Math.random() * 0.55,
    contiguous: 0.45 + Math.random() * 0.45,
  };
  head = (Math.random() * N) | 0;
}

function generate() {
  cells.fill(FREE);
  const density = drive === 'A'
    ? 0.22 + Math.random() * 0.22
    : drive === 'D'
      ? 0.7 + Math.random() * 0.22
      : 0.5 + Math.random() * 0.3;
  const gapMax = drive === 'A' ? 30 : 12;
  const runMax = drive === 'A' ? 20 : 28 + ((Math.random() * 36) | 0);

  let i = 0;
  while (i < N) {
    if (Math.random() > density) {
      i += 1 + ((Math.random() * gapMax) | 0);
      continue;
    }
    const len = 4 + ((Math.random() * runMax) | 0);
    const opt = Math.random() < 0.2;
    for (let k = 0; k < len && i < N; k++, i++) {
      cells[i] = Math.random() < 0.03 ? FREE : (opt ? OPT : USED);
    }
    if (Math.random() < 0.45) i += 1 + ((Math.random() * 5) | 0);
  }

  if (Math.random() < 0.7) {
    const at = (N * (0.2 + Math.random() * 0.55)) | 0;
    const len = (N * (0.03 + Math.random() * 0.08)) | 0;
    for (let k = 0; k < len && at + k < N; k++) {
      if (cells[at + k] !== UNMOV && cells[at + k] !== BAD) cells[at + k] = FREE;
    }
  }

  const islands = 5 + ((Math.random() * 9) | 0);
  for (let s = 0; s < islands; s++) {
    const at = (Math.random() * N) | 0;
    const len = 1 + ((Math.random() * 5) | 0);
    for (let k = 0; k < len && at + k < N; k++) cells[at + k] = UNMOV;
  }

  const badN = drive === 'A'
    ? (Math.random() < 0.45 ? 1 : 0)
    : 1 + ((Math.random() * 3) | 0);
  for (let b = 0; b < badN; b++) cells[(Math.random() * N) | 0] = BAD;

  const lead = 4 + ((Math.random() * 16) | 0);
  for (let k = 0; k < lead; k++) {
    if (cells[k] !== BAD) cells[k] = UNMOV;
  }

  let optCount = 0;
  for (let k = 0; k < N; k++) if (cells[k] === OPT) optCount++;
  if (optCount < 16) {
    let guard = 0;
    while (optCount < 16 && guard < 40) {
      const at = (Math.random() * (N * 0.75)) | 0;
      for (let k = 0; k < 18 && at + k < N; k++) {
        if (cells[at + k] === USED) {
          cells[at + k] = OPT;
          optCount++;
        }
      }
      guard++;
    }
  }

  lockKind.fill(0);
  for (let k = 0; k < N; k++) {
    if (cells[k] === UNMOV || cells[k] === BAD) lockKind[k] = cells[k];
  }
}

function resetSession() {
  sessionMs = 0;
  progress = 0;
  elapsedMs = 0;
  celebrated = false;
  pausedFrom = null;
  pending = [];
  overlayUntil.fill(0);
  finishCursor = 0;
  finishHold = 0;
  lastAnnouncedPct = -1;
  rollPersonality();
}

function armStall() {
  stallUntil = 0;
  nextStallAt = runClock + 9000 + Math.random() * 12000;
}

function newMap() {
  generate();
  resetSession();
  armStall();
  mode = 'ready';
  dirty = true;
  sync();
  updateFrag();
}

function paintCell(context, x, y, w, h, state) {
  if (state === UNMOV) {
    context.fillStyle = '#000';
    context.fillRect(x, y, w, h);
    context.fillStyle = '#fff';
    context.fillRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
    context.fillStyle = '#000';
    const m = Math.max(2, (w / 2.4) | 0);
    context.fillRect(x, y, m, m);
    return;
  }
  context.fillStyle = COLORS[state] || '#fff';
  context.fillRect(x, y, w, h);
  if (state === BAD) {
    context.fillStyle = '#ff4040';
    const steps = Math.max(2, w);
    for (let i = 0; i < steps; i++) {
      const px = x + Math.round(((w - 1) * i) / (steps - 1));
      const py = y + Math.round(((h - 1) * i) / (steps - 1));
      const py2 = y + (h - 1) - Math.round(((h - 1) * i) / (steps - 1));
      context.fillRect(px, py, 1, 1);
      context.fillRect(px, py2, 1, 1);
    }
  }
}

function render() {
  const gap = cellSize >= 6 ? 1 : 0;
  const block = Math.max(1, cellSize - gap);
  ctx.fillStyle = gap ? '#d0d0d0' : '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < N; i++) {
    const c = i % COLS;
    const r = (i / COLS) | 0;
    let state = cells[i];
    if (overlayUntil[i] > runClock) state = overlayKind[i];
    paintCell(ctx, c * cellSize, r * cellSize, block, block, state);
  }
}

function paintSwatches() {
  document.querySelectorAll('canvas.swatch').forEach((sw) => {
    const map = { free: FREE, used: USED, opt: OPT, unmov: UNMOV, read: READ, write: WRITE, bad: BAD };
    const state = map[sw.dataset.state];
    const c = sw.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#c8c8c8';
    c.fillRect(0, 0, sw.width, sw.height);
    paintCell(c, 1, 1, sw.width - 2, sw.height - 2, state);
  });
}

function measureFrag() {
  let changes = 0;
  let prev = false;
  let data = 0;
  for (let i = 0; i < N; i++) {
    const d = cells[i] === USED || cells[i] === OPT;
    if (d) data++;
    if (d !== prev) changes++;
    prev = d;
  }
  if (!data) return 0;
  const raw = (changes / Math.sqrt(data)) * 7.2;
  return Math.max(0, Math.min(99, Math.round(raw)));
}

function updateFrag() {
  const line = 'Drive ' + DRIVE_LABEL[drive] + ' is ' + measureFrag() + '% fragmented.';
  if ($('fragLine').textContent !== line) $('fragLine').textContent = line;
}

function statusText(s) {
  const el = $('statusText');
  if (el.textContent !== s) el.textContent = s;
}

function announce(s) {
  live.textContent = '';
  setTimeout(() => { live.textContent = s; }, 30);
}

function formatElapsed(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n) => String(n).padStart(2, '0');
  return p(h) + ':' + p(m) + ':' + p(s);
}

function updateHud() {
  let pct;
  if (mode === 'finishing' || mode === 'complete' || (mode !== 'ready' && sessionMs >= SESSION_MS)) pct = 100;
  else pct = Math.min(99, Math.floor((sessionMs / SESSION_MS) * 100));
  const pctText = pct + '% complete';
  if ($('pct').textContent !== pctText) $('pct').textContent = pctText;
  $('progressClip').style.width = pct + '%';
  const elap = 'Elapsed: ' + formatElapsed(elapsedMs);
  if ($('elapsedText').textContent !== elap) $('elapsedText').textContent = elap;
  if ((mode === 'running' || mode === 'complete') && pct !== lastAnnouncedPct && pct > 0 && pct % 25 === 0) {
    lastAnnouncedPct = pct;
    announce(pct + ' percent complete. ' + $('statusText').textContent);
  }
}

function syncTitle() {
  const active = mode === 'running' || mode === 'paused' || mode === 'finishing';
  const t = active ? 'Defragmenting Drive ' + DRIVE_LABEL[drive] : 'Disk Defragmenter';
  if ($('titleText').textContent !== t) $('titleText').textContent = t;
  const task = active ? 'Defragmenting ' + DRIVE_LABEL[drive] : 'Disk Defragmenter';
  if ($('taskDefragLabel').textContent !== task) $('taskDefragLabel').textContent = task;
  if (document.title !== t) document.title = t;
}

function syncButtons() {
  const running = mode === 'running' || mode === 'finishing';
  const paused = mode === 'paused';
  const start = $('btnStart');
  const pause = $('btnPause');
  const stop = $('btnStop');
  start.disabled = running;
  start.textContent = paused ? 'Resume' : 'Start';
  pause.disabled = !running;
  stop.disabled = !(running || paused);
  $('mStart').disabled = start.disabled;
  $('mStart').textContent = paused ? 'Resume' : 'Start';
  $('mPause').disabled = pause.disabled;
  $('mPause').textContent = 'Pause';
  $('mStop').disabled = stop.disabled;
  $('mNew').disabled = running || paused;
}

function syncStatus() {
  if (mode === 'paused') statusText('Defragmentation paused.');
  else if (mode === 'stopped') statusText('Defragmentation stopped.');
  else if (mode === 'complete') statusText('Defragmentation complete.');
  else if (mode === 'ready') statusText('Click Start to defragment this drive.');
  else if (mode === 'finishing') statusText('Finishing...');
  else if (mode === 'running') statusText('Defragmenting...');
}

function syncTask() {
  const task = $('taskDefrag');
  task.hidden = closed;
  const pressed = !closed && !win.hidden && win.classList.contains('active') && !openDlg;
  task.setAttribute('aria-pressed', String(pressed));
}

function syncSys() {
  $('sysRestore').disabled = !isMax;
  $('sysMax').disabled = isMax;
  $('glyphMax').hidden = isMax;
  $('glyphRestore').hidden = !isMax;
  $('btnMax').setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
}

function sync() {
  win.dataset.mode = mode;
  win.dataset.speed = speedName;
  syncButtons();
  syncTitle();
  syncStatus();
  syncTask();
  updateHud();
  dirty = true;
  if (mode !== 'running') {
    announce($('statusText').textContent);
  }
}

function setSpeed(name) {
  if (!SPEEDS[name]) return;
  speedName = name;
  speed = SPEEDS[name];
  document.querySelectorAll('input[name="speed"]').forEach((r) => {
    r.checked = r.value === name;
  });
  document.querySelectorAll('[data-speed]').forEach((b) => {
    const on = b.dataset.speed === name;
    const mark = b.querySelector('.mark');
    if (mark) mark.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  $('speedText').textContent = 'Speed: ' + SPEED_LABEL[name];
  win.dataset.speed = speedName;
}

function markSeen(i) { seen[i] = stamp; }
function isSeen(i) { return seen[i] === stamp; }
function bumpStamp() {
  stamp = (stamp + 1) >>> 0;
  if (stamp === 0) {
    seen.fill(0);
    stamp = 1;
  }
}

function flash(indices, kind, ms) {
  const until = runClock + ms;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    overlayKind[i] = kind;
    overlayUntil[i] = until;
  }
}

function later(ms, fn) {
  pending.push({ at: runClock + ms, fn });
}

function drainPending() {
  let i = 0;
  while (i < pending.length) {
    if (pending[i].at <= runClock) {
      const fn = pending[i].fn;
      pending.splice(i, 1);
      fn();
    } else {
      i++;
    }
  }
}

function pickWhere(pred) {
  for (let t = 0; t < 36; t++) {
    const i = (Math.random() * N) | 0;
    if (pred(i)) return i;
  }
  return -1;
}

function pickMovable() {
  return pickWhere((i) => cells[i] === USED || cells[i] === OPT);
}

function pickFree() {
  return pickWhere((i) => cells[i] === FREE);
}

function pickDest(src) {
  const far = Math.random() < personality.jumpFar;
  if (!far) {
    const col = src % COLS;
    const row = (src / COLS) | 0;
    const radC = 2 + ((Math.random() * 11) | 0);
    const radR = 1 + ((Math.random() * 4) | 0);
    for (let t = 0; t < 16; t++) {
      const nc = col + ((Math.random() * (radC * 2 + 1)) | 0) - radC;
      const nr = row + ((Math.random() * (radR * 2 + 1)) | 0) - radR;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const ni = nr * COLS + nc;
      if (cells[ni] === FREE && !isSeen(ni)) return ni;
    }
  }
  for (let t = 0; t < 28; t++) {
    const ni = (Math.random() * N) | 0;
    if (cells[ni] === FREE && !isSeen(ni)) return ni;
  }
  return -1;
}

function randomMove() {
  const start = pickMovable();
  if (start < 0) return;
  bumpStamp();
  const len = 1 + ((Math.random() * personality.burst) | 0);
  const run = [start];
  markSeen(start);
  if (Math.random() < personality.contiguous) {
    for (let i = start + 1; i < N && run.length < len; i++) {
      if (cells[i] === USED || cells[i] === OPT) {
        run.push(i);
        markSeen(i);
      } else break;
    }
  } else {
    let guard = 0;
    while (run.length < len && guard < 20) {
      const j = pickMovable();
      guard++;
      if (j < 0) break;
      if (!isSeen(j)) {
        run.push(j);
        markSeen(j);
      }
    }
  }

  const readFor = (70 + Math.random() * 50) / Math.sqrt(speed);
  flash(run, READ, readFor);
  statusText('Reading clusters...');
  const sources = run.slice();
  later(readFor * 0.85, () => {
    const moving = [];
    for (let k = 0; k < sources.length; k++) {
      const i = sources[k];
      if (cells[i] === USED || cells[i] === OPT) moving.push(i);
    }
    if (!moving.length) return;
    bumpStamp();
    for (let k = 0; k < moving.length; k++) markSeen(moving[k]);
    const dest = [];
    for (let k = 0; k < moving.length; k++) {
      const d = pickDest(moving[k]);
      if (d < 0) break;
      dest.push(d);
      markSeen(d);
    }
    const m = dest.length;
    if (!m) return;
    const kind = Math.random() < 0.42 ? OPT : USED;
    for (let k = 0; k < m; k++) {
      cells[moving[k]] = FREE;
      cells[dest[k]] = kind;
    }
    flash(dest, WRITE, 90 + Math.random() * 80);
    statusText('Moving data...');
  });
}

function chaosJump() {
  const a = pickMovable();
  if (a < 0) return;
  const b = Math.random() < 0.55 ? pickFree() : pickMovable();
  if (b < 0 || b === a) return;
  flash([a], READ, 70);
  statusText('Moving data...');
  later(80, () => {
    const aOk = cells[a] === USED || cells[a] === OPT;
    const bOk = cells[b] === USED || cells[b] === OPT || cells[b] === FREE;
    if (!aOk || !bOk) return;
    const tmp = cells[a];
    cells[a] = cells[b];
    cells[b] = tmp;
    flash([a, b], WRITE, 90);
  });
}

function scanSweep(quiet) {
  const len = 8 + ((Math.random() * 36) | 0);
  if (Math.random() < 0.28) head = (Math.random() * N) | 0;
  const idx = [];
  for (let k = 0; k < len; k++) idx.push((head + k) % N);
  const hop = Math.random() < 0.22 ? 20 + ((Math.random() * 120) | 0) : len;
  head = (head + hop) % N;
  flash(idx, READ, 60 + Math.random() * 50);
  if (!quiet) statusText('Reading clusters...');
}

function skipLocked() {
  const i = pickWhere((idx) => cells[idx] === UNMOV || cells[idx] === BAD);
  if (i < 0) {
    scanSweep(false);
    return;
  }
  flash([i], READ, 130);
  statusText(cells[i] === BAD ? 'Skipping bad cluster...' : 'Skipping unmovable data...');
}

function doBurst() {
  const r = Math.random();
  const scanCut = personality.scanBias;
  if (r < scanCut) scanSweep(false);
  else if (r < scanCut + 0.1) skipLocked();
  else if (r < 0.86) randomMove();
  else chaosJump();

  const extra = Math.max(0, Math.round(speed) - 1);
  for (let i = 0; i < extra; i++) {
    if (Math.random() < 0.5) chaosJump();
    else scanSweep(true);
  }
}

function beginFinish() {
  if (mode !== 'running') return;
  mode = 'finishing';
  pending = [];
  overlayUntil.fill(0);
  finishCursor = 0;
  finishHold = 0;
  progress = 1;
  sync();
}

function finishUp() {
  if (celebrated) return;
  celebrated = true;
  mode = 'complete';
  pending = [];
  overlayUntil.fill(0);
  progress = 1;
  dirty = true;
  sync();
  $('doneBody').textContent =
    'Defragmentation is complete.\n\nDrive ' + DRIVE_LABEL[drive] +
    ' was processed. Unmovable data and bad clusters were left where they were.';
  if (minimized || closed) showDefrag();
  showDlg($('dlgDone'));
}

function stepFinish(dt) {
  if (finishCursor < N) {
    const advance = Math.max(1, Math.round((N / 1200) * dt * speed));
    const batch = [];
    for (let k = 0; k < advance && finishCursor < N; k++) {
      batch.push(finishCursor++);
    }
    flash(batch, READ, 110);
    if (finishCursor >= N) finishHold = 0;
  } else {
    finishHold += dt;
    if (finishHold > 200) finishUp();
  }
}

function onStart() {
  if (mode === 'running' || mode === 'finishing') return;
  if (mode === 'paused') {
    mode = pausedFrom || 'running';
    pausedFrom = null;
    sync();
    return;
  }
  if (mode === 'complete') {
    generate();
    resetSession();
    armStall();
    updateFrag();
  } else if (mode === 'ready') {
    armStall();
  }
  mode = 'running';
  nextBurstAt = runClock;
  sync();
  if (sessionMs >= SESSION_MS) beginFinish();
}

function onPause() {
  if (mode !== 'running' && mode !== 'finishing') return;
  pausedFrom = mode;
  mode = 'paused';
  dirty = true;
  sync();
}

function onStop() {
  if (mode !== 'running' && mode !== 'paused' && mode !== 'finishing') return;
  mode = 'stopped';
  pausedFrom = null;
  pending = [];
  overlayUntil.fill(0);
  dirty = true;
  sync();
}

function isBusy() {
  return mode === 'running' || mode === 'paused' || mode === 'finishing';
}

function updateDriveUi() {
  $('driveValue').textContent = DRIVE_LABEL[drive];
  $('drivePop').querySelectorAll('[data-drive]').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.drive === drive ? 'true' : 'false');
  });
  syncTitle();
  updateFrag();
}

function setDrive(letter, force) {
  if (!DRIVE_LABEL[letter]) return;
  if (isBusy()) {
    showMsg('Disk Defragmenter', 'Stop defragmentation before changing drives.');
    return;
  }
  const changed = letter !== drive;
  drive = letter;
  updateDriveUi();
  if (changed || force) newMap();
}

function showDefrag() {
  closed = false;
  minimized = false;
  win.hidden = false;
  activate(win);
  syncTask();
}

function minimizeDefrag() {
  minimized = true;
  win.hidden = true;
  closeMenus();
  syncTask();
}

function closeDefrag() {
  if (isBusy()) onStop();
  closed = true;
  minimized = false;
  win.hidden = true;
  closeMenus();
  syncTask();
}

function toggleMax() {
  if (!isMax) {
    savedRect = {
      left: win.style.left,
      top: win.style.top,
      width: win.style.width,
      height: win.style.height,
      sized: win.classList.contains('sized'),
    };
    isMax = true;
    win.classList.add('maximized');
    win.classList.remove('sized');
  } else {
    isMax = false;
    win.classList.remove('maximized');
    if (savedRect) {
      win.style.left = savedRect.left;
      win.style.top = savedRect.top;
      win.style.width = savedRect.width;
      win.style.height = savedRect.height;
      win.classList.toggle('sized', savedRect.sized);
    }
  }
  syncSys();
  layoutMap();
  requestAnimationFrame(layoutMap);
}

function activate(target) {
  document.querySelectorAll('.window:not(.dialog)').forEach((w) => {
    w.classList.remove('active');
    w.style.zIndex = '5';
  });
  target.classList.add('active');
  zBump = Math.min(15, zBump + 1);
  target.style.zIndex = String(zBump);
  syncTask();
  syncPcTask();
}

function openPc() {
  pcMin = false;
  winPc.hidden = false;
  $('taskPc').hidden = false;
  activate(winPc);
  syncPcTask();
}

function minPc() {
  pcMin = true;
  winPc.hidden = true;
  syncPcTask();
}

function closePc() {
  pcMin = false;
  winPc.hidden = true;
  $('taskPc').hidden = true;
  closeMenus();
}

function syncPcTask() {
  const task = $('taskPc');
  if (task.hidden && winPc.hidden) return;
  const pressed = !winPc.hidden && winPc.classList.contains('active') && !openDlg;
  task.setAttribute('aria-pressed', String(pressed));
}

function showDlg(el) {
  if (openDlg && openDlg !== el) openDlg.hidden = true;
  activeBeforeDlg = document.querySelector('.window.active:not(.dialog)');
  document.querySelectorAll('.window:not(.dialog)').forEach((w) => w.classList.remove('active'));
  openDlg = el;
  el.hidden = false;
  $('shade').hidden = false;
  desktop.inert = true;
  closeMenus();
  hideTip();
  syncTask();
  syncPcTask();
  const btn = el.querySelector('[data-default]');
  if (btn) btn.focus();
}

function hideDlg() {
  if (openDlg) openDlg.hidden = true;
  openDlg = null;
  $('shade').hidden = true;
  desktop.inert = false;
  msgOnOk = null;
  if (activeBeforeDlg && !activeBeforeDlg.hidden) activate(activeBeforeDlg);
  else if (!win.hidden) activate(win);
  else {
    syncTask();
    syncPcTask();
  }
  activeBeforeDlg = null;
}

function showMsg(title, text, onOk) {
  $('msgTitle').textContent = title;
  $('msgText').textContent = text;
  msgOnOk = onOk || null;
  showDlg($('dlgMsg'));
}

function closeOpenDlg() {
  if (!openDlg) return;
  const how = openDlg.dataset.close || 'ok';
  const cb = openDlg === $('dlgMsg') ? msgOnOk : null;
  if (how === 'cancel') {
    msgOnOk = null;
    hideDlg();
    return;
  }
  hideDlg();
  if (cb) cb();
}

function closeMenus() {
  document.querySelectorAll('.menu-pop, .combo-pop, #startMenu').forEach((p) => {
    p.hidden = true;
  });
  document.querySelectorAll('.menu-btn, #startBtn, #driveBtn, #sysBtn').forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
  });
}

function togglePop(btn, pop) {
  const willOpen = pop.hidden;
  closeMenus();
  if (willOpen) {
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }
}

function runAction(action) {
  switch (action) {
    case 'start': onStart(); break;
    case 'pause': onPause(); break;
    case 'stop': onStop(); break;
    case 'exit':
    case 'sys-close': closeDefrag(); break;
    case 'new-map':
      if (!isBusy()) newMap();
      break;
    case 'about': showDlg($('dlgAbout')); break;
    case 'open-defrag': showDefrag(); break;
    case 'open-amp':
      if (window.CalmAmp) window.CalmAmp.open();
      break;
    case 'open-note':
      if (window.NotePad) window.NotePad.open();
      break;
    case 'note-new':
      if (window.NotePad) window.NotePad.newFile();
      break;
    case 'note-open':
      if (window.NotePad) window.NotePad.openFile();
      break;
    case 'note-save':
      if (window.NotePad) window.NotePad.save();
      break;
    case 'note-exit':
      if (window.NotePad) window.NotePad.exit();
      break;
    case 'note-undo':
      if (window.NotePad) window.NotePad.undo();
      break;
    case 'note-cut':
      if (window.NotePad) window.NotePad.cut();
      break;
    case 'note-copy':
      if (window.NotePad) window.NotePad.copy();
      break;
    case 'note-paste':
      if (window.NotePad) window.NotePad.paste();
      break;
    case 'note-delete':
      if (window.NotePad) window.NotePad.deleteSelection();
      break;
    case 'note-all':
      if (window.NotePad) window.NotePad.selectAll();
      break;
    case 'shutdown': showDlg($('dlgShut')); break;
    case 'close-pc': closePc(); break;
    case 'sys-min': minimizeDefrag(); break;
    case 'sys-max':
    case 'sys-restore': toggleMax(); break;
    default: break;
  }
}

function selectIcon(btn) {
  document.querySelectorAll('.icon').forEach((el) => el.classList.toggle('selected', el === btn));
}

function openIcon(id) {
  if (id === 'defrag') showDefrag();
  else if (id === 'pc') openPc();
  else if (id === 'bin') showMsg('Recycle Bin', 'The Recycle Bin is empty.');
  else if (id === 'amp' && window.CalmAmp) window.CalmAmp.open();
  else if (id === 'note' && window.NotePad) window.NotePad.open();
}

function hideTip() {
  hover = -1;
  tip.hidden = true;
}

function updateTipText() {
  if (hover < 0 || tip.hidden) return;
  const state = overlayUntil[hover] > runClock ? overlayKind[hover] : cells[hover];
  const text = 'Cluster ' + (hover + 1).toLocaleString() + '\n' + STATE_NAME[state];
  if (tip.textContent !== text) tip.textContent = text;
}

function placeTip(clientX, clientY) {
  tip.hidden = false;
  tip.style.left = '0px';
  tip.style.top = '0px';
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let x = clientX + 14;
  let y = clientY + 18;
  if (x + w > window.innerWidth - 2) x = clientX - w - 12;
  if (y + h > window.innerHeight - 2) y = clientY - h - 12;
  tip.style.left = Math.max(2, x) + 'px';
  tip.style.top = Math.max(2, y) + 'px';
}

function layoutMap() {
  if (win.hidden || mapWell.clientWidth < 40) return;
  const availW = Math.max(40, mapWell.clientWidth - 8);
  const fillHeight = isMax || win.classList.contains('sized');
  const availH = fillHeight ? Math.max(40, mapWell.clientHeight - 8) : availW;
  let next = Math.floor(availW / COLS);
  if (fillHeight) next = Math.min(next, Math.floor(availH / ROWS));
  next = Math.max(5, Math.min(cellCap, next));
  const bw = COLS * next;
  const bh = ROWS * next;
  if (cellSize === next && canvas.width === bw && canvas.height === bh) return;
  cellSize = next;
  canvas.width = bw;
  canvas.height = bh;
  canvas.style.width = bw + 'px';
  canvas.style.height = bh + 'px';
  ctx.imageSmoothingEnabled = false;
  dirty = true;
}

function makeDraggable(target, handle) {
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button')) return;
    if (target.classList.contains('maximized')) return;
    activate(target);
    const startX = e.clientX;
    const startY = e.clientY;
    const origLeft = target.offsetLeft;
    const origTop = target.offsetTop;
    target.setPointerCapture(e.pointerId);
    function move(ev) {
      let x = origLeft + (ev.clientX - startX);
      let y = origTop + (ev.clientY - startY);
      const maxX = desktop.clientWidth - 48;
      const maxY = desktop.clientHeight - 30 - 18;
      x = Math.min(maxX, Math.max(-target.offsetWidth + 80, x));
      y = Math.min(maxY, Math.max(0, y));
      target.style.left = x + 'px';
      target.style.top = y + 'px';
    }
    function up() {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
    }
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
  });
}

function tickClock() {
  const d = new Date();
  let h = d.getHours();
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const label = h + ':' + m + ' ' + ampm;
  const clock = $('clock');
  if (clock.textContent !== label) clock.textContent = label;
  clock.dateTime = d.toISOString();
  clock.title = d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function wire() {
  document.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = btn.parentElement.querySelector(':scope > .menu-pop');
      if (pop) togglePop(btn, pop);
    });
  });

  document.querySelectorAll('.menu-subwrap').forEach((wrap) => {
    const pop = wrap.querySelector('.submenu');
    wrap.addEventListener('mouseenter', () => { if (pop) pop.hidden = false; });
    wrap.addEventListener('mouseleave', () => { if (pop) pop.hidden = true; });
  });

  document.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (t.closest('.menu') || t.closest('.menu-pop') || t.closest('.combo') || t.closest('.start-anchor') || t.closest('#sysBtn')) {
      return;
    }
    closeMenus();
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.menu-btn') || e.target.closest('#startBtn') || e.target.closest('#driveBtn') || e.target.closest('#sysBtn')) {
      return;
    }
    const speedEl = e.target.closest('[data-speed]');
    if (speedEl && speedEl.closest('.menu-pop')) {
      setSpeed(speedEl.dataset.speed);
      closeMenus();
      return;
    }
    const driveEl = e.target.closest('#drivePop [data-drive]');
    if (driveEl) {
      setDrive(driveEl.dataset.drive, false);
      closeMenus();
      return;
    }
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl || actionEl.disabled) return;
    closeMenus();
    runAction(actionEl.dataset.action);
  });

  $('btnStart').addEventListener('click', onStart);
  $('btnPause').addEventListener('click', onPause);
  $('btnStop').addEventListener('click', onStop);
  document.querySelectorAll('input[name="speed"]').forEach((r) => {
    r.addEventListener('change', () => { if (r.checked) setSpeed(r.value); });
  });

  $('btnMin').addEventListener('click', minimizeDefrag);
  $('btnMax').addEventListener('click', toggleMax);
  $('btnClose').addEventListener('click', closeDefrag);
  $('sysBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePop($('sysBtn'), $('sysMenu'));
  });
  $('titleBar').addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    toggleMax();
  });

  $('startBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePop($('startBtn'), $('startMenu'));
  });
  $('driveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePop($('driveBtn'), $('drivePop'));
  });

  $('taskDefrag').addEventListener('click', () => {
    if (closed || minimized || win.hidden) showDefrag();
    else if (win.classList.contains('active')) minimizeDefrag();
    else activate(win);
  });
  $('taskPc').addEventListener('click', () => {
    if (winPc.hidden) openPc();
    else if (winPc.classList.contains('active')) minPc();
    else activate(winPc);
  });

  $('pcMin').addEventListener('click', minPc);
  $('pcClose').addEventListener('click', closePc);

  document.querySelectorAll('.icon').forEach((btn) => {
    let last = 0;
    btn.addEventListener('click', () => {
      selectIcon(btn);
      const now = performance.now();
      if (now - last < 450) {
        openIcon(btn.dataset.icon);
        last = 0;
      } else {
        last = now;
      }
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openIcon(btn.dataset.icon);
    });
  });

  document.querySelectorAll('.drive').forEach((btn) => {
    let last = 0;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.drive').forEach((el) => el.classList.toggle('selected', el === btn));
      const now = performance.now();
      if (now - last < 450) {
        showDefrag();
        setDrive(btn.dataset.driveOpen, true);
        last = 0;
      } else {
        last = now;
      }
    });
  });

  document.querySelectorAll('[data-dlg-x]').forEach((btn) => {
    btn.addEventListener('click', () => closeOpenDlg());
  });

  $('shutOk').addEventListener('click', () => {
    const choice = document.querySelector('input[name="shut"]:checked').value;
    if (isBusy()) onStop();
    hideDlg();
    if (choice === 'shut') {
      desktop.inert = true;
      $('safe').hidden = false;
    } else if (choice === 'restart') {
      $('reboot').hidden = false;
      setTimeout(() => location.reload(), 650);
    } else {
      desktop.inert = true;
      $('dos').hidden = false;
    }
  });

  $('shutHelp').addEventListener('click', () => {
    hideDlg();
    showMsg(
      'Shut Down Windows',
      'This is a toy desktop. Shut down only leaves the picture. Your computer stays on.',
      () => showDlg($('dlgShut'))
    );
  });

  $('shade').addEventListener('pointerdown', () => {
    if (!openDlg) return;
    openDlg.classList.add('flash');
    setTimeout(() => openDlg.classList.remove('flash'), 70);
    setTimeout(() => {
      if (!openDlg) return;
      openDlg.classList.add('flash');
      setTimeout(() => openDlg && openDlg.classList.remove('flash'), 70);
    }, 130);
  });

  $('safe').addEventListener('click', () => {
    $('safe').hidden = true;
    desktop.inert = false;
  });
  $('dos').addEventListener('click', () => {
    $('dos').hidden = true;
    desktop.inert = false;
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - rect.left) / rect.width) * COLS);
    const gy = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS);
    if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) {
      hideTip();
      return;
    }
    hover = gy * COLS + gx;
    updateTipText();
    placeTip(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointerleave', hideTip);

  desktop.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.window') || e.target.closest('.taskbar') || e.target.closest('.start-anchor')) return;
    if (!e.target.closest('.icon')) {
      document.querySelectorAll('.icon').forEach((el) => el.classList.remove('selected'));
    }
    document.querySelectorAll('.window:not(.dialog)').forEach((w) => w.classList.remove('active'));
  });

  document.querySelectorAll('.window:not(.dialog)').forEach((w) => {
    w.addEventListener('pointerdown', () => {
      if (!openDlg) activate(w);
    });
  });

  makeDraggable(win, $('titleBar'));
  makeDraggable(winPc, $('pcTitleBar'));

  const grip = $('grip');
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || isMax) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = win.offsetWidth;
    const startH = win.offsetHeight;
    grip.setPointerCapture(e.pointerId);
    function move(ev) {
      const maxW = Math.max(360, desktop.clientWidth - 8);
      const maxH = Math.max(320, desktop.clientHeight - 36);
      const w = Math.max(480, Math.min(maxW, startW + ev.clientX - startX));
      const h = Math.max(380, Math.min(maxH, startH + ev.clientY - startY));
      win.style.width = w + 'px';
      win.style.height = h + 'px';
      win.classList.add('sized');
    }
    function up() {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      layoutMap();
    }
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
  });

  document.addEventListener('keydown', (e) => {
    if (!$('dos').hidden) {
      $('dos').hidden = true;
      desktop.inert = false;
      e.preventDefault();
      return;
    }
    if (!$('safe').hidden) {
      $('safe').hidden = true;
      desktop.inert = false;
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (openDlg) {
        e.preventDefault();
        closeOpenDlg();
        return;
      }
      closeMenus();
      return;
    }
    if (e.key === 'Enter' && openDlg && !e.target.closest('button')) {
      const btn = openDlg.querySelector('[data-default]');
      if (btn) {
        e.preventDefault();
        btn.click();
      }
      return;
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.repeat && !openDlg) {
      const k = e.key.toLowerCase();
      if (k === 'd') {
        e.preventDefault();
        togglePop($('menuDefrag'), $('menuDefrag').parentElement.querySelector('.menu-pop'));
      } else if (k === 's') {
        e.preventDefault();
        togglePop($('menuSettings'), $('menuSettings').parentElement.querySelector('.menu-pop'));
      } else if (k === 'h') {
        e.preventDefault();
        togglePop($('menuHelp'), $('menuHelp').parentElement.querySelector('.menu-pop'));
      } else if (e.key === ' ') {
        e.preventDefault();
        if (!win.hidden) togglePop($('sysBtn'), $('sysMenu'));
      }
    }
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => layoutMap());
    ro.observe(mapWell);
  }
  window.addEventListener('resize', () => {
    if (isMax) layoutMap();
  });
}

let lastNow = 0;
function frame(now) {
  const dt = lastNow ? Math.min(50, now - lastNow) : 16;
  lastNow = now;

  if (mode === 'running' || mode === 'finishing') {
    runClock += dt;
    elapsedMs += dt;
    if (mode === 'running') {
      if (runClock >= nextStallAt) {
        stallUntil = runClock + 550 + Math.random() * 850;
        nextStallAt = stallUntil + 12000 + Math.random() * 16000;
        statusText('Checking drive...');
      }
      const stalled = runClock < stallUntil;
      if (!stalled) sessionMs += dt * speed;
      if (sessionMs >= SESSION_MS) beginFinish();
      else if (runClock >= nextBurstAt) {
        if (stalled) scanSweep(true);
        else doBurst();
        const gap = (stalled ? 150 : (70 + Math.random() * 130) * personality.tempo) / speed;
        nextBurstAt = runClock + gap;
      }
      if (mode === 'running') drainPending();
    } else {
      stepFinish(dt);
      if (mode === 'finishing') drainPending();
    }
  }

  if (mode === 'running' || mode === 'finishing' || dirty) {
    render();
    dirty = false;
  }
  if (mode === 'running' && now - lastFragAt > 280) {
    lastFragAt = now;
    updateFrag();
  }
  updateHud();
  updateTipText();
  requestAnimationFrame(frame);
}

function fitInitial() {
  const dw = desktop.clientWidth;
  const dh = desktop.clientHeight;
  const w = Math.max(560, Math.min(1040, dw - 116));
  win.style.width = w + 'px';
  win.style.height = 'auto';
  win.style.left = '100px';
  win.style.top = '12px';
  layoutMap();
  requestAnimationFrame(() => {
    const maxH = dh - 44;
    if (win.offsetHeight > maxH && cellSize > 5) {
      const drop = Math.max(1, Math.ceil((win.offsetHeight - maxH) / ROWS));
      cellCap = Math.max(5, cellSize - drop);
      layoutMap();
    }
  });
}

function init() {
  paintSwatches();
  wire();
  setSpeed('normal');
  newMap();
  activate(win);
  fitInitial();
  tickClock();
  setInterval(tickClock, 1000);
  requestAnimationFrame(frame);
  if (params.has('selftest')) {
    window.__defrag = {
      cells,
      lockKind,
      canvas,
      get mode() { return mode; },
      get speedName() { return speedName; },
      FREE, USED, OPT, UNMOV, BAD,
    };
  }
}

window.WinShell = { activate: activate, makeDraggable: makeDraggable, showMsg: showMsg };
init();
