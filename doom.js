/* DOOM in a desktop window. The same bundle as https://js-dos.com/DOOM/
   is downloaded from js-dos.com when you click start. This page does not
   keep a copy of the game. */

'use strict';

(function () {
  const API = 'https://js-dos.com/cdn/js-dos-api.js';
  const BUNDLE = 'https://js-dos.com/cdn/upload/DOOM-@evilution.zip';
  const EXE = './DOOM/DOOM.EXE';

  const win = document.getElementById('winDoom');
  const titleBar = document.getElementById('doomTitleBar');
  const task = document.getElementById('taskDoom');
  const glyphMax = document.getElementById('doomGlyphMax');
  const glyphRestore = document.getElementById('doomGlyphRestore');
  const maxBtn = document.getElementById('doomMax');
  const status = document.getElementById('doomStatus');

  let closed = true;
  let maximized = false;
  let savedRect = null;
  let booting = null;
  let dosbox = null;

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

  function wrap(el) {
    const api = {
      0: el,
      length: el ? 1 : 0,
      jquery: '1',
      append: function (child) {
        const node = child && (child[0] || child);
        if (el && node) el.appendChild(node);
        return api;
      },
      click: function (fn) {
        if (el) el.addEventListener('click', fn);
        return api;
      },
      hide: function () {
        if (el) el.style.display = 'none';
        return api;
      },
      show: function () {
        if (el) el.style.display = '';
        return api;
      },
      html: function (value) {
        if (!el) return '';
        if (value === undefined) return el.textContent;
        el.textContent = String(value);
        return api;
      }
    };
    return api;
  }

  function miniDollar(arg) {
    if (typeof arg !== 'string') return wrap(null);
    if (arg.charAt(0) === '<') {
      const holder = document.createElement('div');
      holder.innerHTML = arg;
      return wrap(holder.firstElementChild);
    }
    if (arg.charAt(0) === '#') return wrap(document.getElementById(arg.slice(1)));
    return wrap(document.querySelector(arg));
  }

  function loadApi() {
    if (window.Dosbox && window.__doomDollar) return Promise.resolve();
    window.__mini$ = miniDollar;
    return fetch(API).then((res) => {
      if (!res.ok) throw new Error('js-dos did not load');
      return res.text();
    }).then((code) => {
      const cut = code.indexOf('Dosbox.UI');
      if (cut < 0) throw new Error('js-dos did not load');
      const patched = code.slice(0, cut) + code.slice(cut).replace(/\$\(/g, 'window.__mini$(');
      (0, eval)(patched);
      window.__doomDollar = true;
    });
  }

  function boot() {
    if (dosbox || booting) return booting || Promise.resolve();
    setStatus('Loading the player from js-dos.com…');
    booting = loadApi().then(() => {
      dosbox = new window.Dosbox({
        id: 'doomBox',
        onload: function (boxApi) {
          boxApi.run(BUNDLE, EXE);
        },
        onrun: function () {
          setStatus('DOOM is running. Arrows move, S fires, W uses, Space runs.');
        }
      });
      setStatus('Click the picture to start. The game is downloaded from js-dos.com.');
    }).catch((err) => {
      booting = null;
      dosbox = null;
      setStatus(err && err.message ? err.message : 'js-dos did not load.');
    });
    return booting;
  }

  function open() {
    closed = false;
    win.hidden = false;
    task.hidden = false;
    if (window.WinShell) window.WinShell.activate(win);
    syncTask();
    boot();
  }

  function minimize() {
    win.hidden = true;
    syncTask();
  }

  function exit() {
    closed = true;
    win.hidden = true;
    if (maximized) toggleMax();
    syncTask();
  }

  function fullScreen() {
    const canvas = document.querySelector('#doomBox canvas');
    const target = canvas || document.getElementById('doomBox');
    const req = target.requestFullscreen || target.webkitRequestFullscreen;
    if (dosbox && dosbox.requestFullScreen) dosbox.requestFullScreen();
    else if (req) req.call(target);
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
      booted: !!dosbox,
      status: status.textContent,
      canvas: !!document.querySelector('#doomBox canvas')
    })
  };
})();
