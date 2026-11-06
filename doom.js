/* DOOM window. The game runs in doom-player.html. Closing this window
   throws that page away, which stops the emulator and its sound. */

'use strict';

(function () {
  const PLAYER = 'doom-player.html';
  const win = document.getElementById('winDoom');
  const titleBar = document.getElementById('doomTitleBar');
  const frame = document.getElementById('doomFrame');
  const task = document.getElementById('taskDoom');
  const glyphMax = document.getElementById('doomGlyphMax');
  const glyphRestore = document.getElementById('doomGlyphRestore');
  const maxBtn = document.getElementById('doomMax');
  const status = document.getElementById('doomStatus');

  let closed = true;
  let maximized = false;
  let savedRect = null;
  let running = false;

  function setStatus(text) {
    status.textContent = text;
  }

  function syncTask() {
    if (closed) {
      task.hidden = true;
      return;
    }
    task.hidden = false;
    const shade = document.getElementById('shade');
    const pressed = !win.hidden && win.classList.contains('active') && shade.hidden;
    task.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function startGame() {
    if (running) return;
    running = true;
    frame.src = PLAYER;
  }

  function stopGame() {
    if (document.fullscreenElement) {
      const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
      if (exitFs) exitFs.call(document);
    }
    frame.src = 'about:blank';
    running = false;
    setStatus('Click the picture to start. DOOM is loaded from js-dos.com.');
  }

  function open() {
    closed = false;
    win.hidden = false;
    task.hidden = false;
    if (window.WinShell) window.WinShell.activate(win);
    syncTask();
    startGame();
  }

  function minimize() {
    win.hidden = true;
    syncTask();
  }

  function exit() {
    stopGame();
    closed = true;
    win.hidden = true;
    if (maximized) toggleMax();
    syncTask();
  }

  function fullScreen() {
    if (!running) return;
    try {
      frame.contentWindow.postMessage({ source: 'doom-parent', cmd: 'fullscreen' }, window.location.origin);
    } catch (err) { /* the player page is gone */ }
    const req = frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (req) req.call(frame);
  }

  function toggleMax() {
    if (!maximized) {
      savedRect = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height
      };
      maximized = true;
      win.classList.add('maximized');
    } else {
      maximized = false;
      win.classList.remove('maximized');
      if (savedRect) {
        win.style.left = savedRect.left;
        win.style.top = savedRect.top;
        win.style.width = savedRect.width;
        win.style.height = savedRect.height;
      }
    }
    glyphMax.hidden = maximized;
    glyphRestore.hidden = !maximized;
    maxBtn.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'doom-player' || !running) return;
    if (typeof data.text === 'string') setStatus(data.text);
  });

  document.getElementById('doomMin').addEventListener('click', minimize);
  maxBtn.addEventListener('click', toggleMax);
  document.getElementById('doomClose').addEventListener('click', exit);
  titleBar.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    toggleMax();
  });
  task.addEventListener('click', () => {
    if (closed || win.hidden) open();
    else if (win.classList.contains('active')) minimize();
    else if (window.WinShell) window.WinShell.activate(win);
    syncTask();
  });
  if (window.WinShell) window.WinShell.makeDraggable(win, titleBar);
  new MutationObserver(syncTask).observe(win, { attributes: true, attributeFilter: ['class', 'hidden'] });
  new MutationObserver(syncTask).observe(document.getElementById('shade'), { attributes: true, attributeFilter: ['hidden'] });

  window.DoomWin = {
    open: open,
    exit: exit,
    fullScreen: fullScreen,
    snapshot: () => ({
      hidden: win.hidden,
      closed: closed,
      running: running,
      src: frame.getAttribute('src'),
      status: status.textContent
    })
  };
})();
