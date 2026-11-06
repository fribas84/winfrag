/* Windows 98 Notepad on the toy desktop.
   Save and Open use a file on the user's computer. Nothing is sent to a server. */

'use strict';

(function () {

const noteWin = document.getElementById('winNote');
const noteTitleBar = document.getElementById('noteTitleBar');
const noteTitle = document.getElementById('noteTitle');
const noteText = document.getElementById('noteText');
const noteStatus = document.getElementById('noteStatus');
const notePos = document.getElementById('notePos');
const noteTask = document.getElementById('taskNote');
const noteDlg = document.getElementById('dlgNote');
const noteAskText = document.getElementById('noteAskText');
const noteGlyphMax = document.getElementById('noteGlyphMax');
const noteGlyphRestore = document.getElementById('noteGlyphRestore');
const noteMaxBtn = document.getElementById('noteMax');
const noteShade = document.getElementById('shade');
const noteDesktop = document.getElementById('desktop');

let fileHandle = null;
let fileName = 'Untitled';
let savedText = '';
let dirty = false;
let closed = true;
let maximized = false;
let savedRect = null;
let pending = null;
let statusTimer = 0;
const history = [''];
let applying = false;
let historyTimer = 0;

function isAbort(err) {
  return err && err.name === 'AbortError';
}

function isTextFile(file) {
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.txt') || file.type === 'text/plain';
}

function suggestedName() {
  if (fileName && fileName !== 'Untitled') {
    return fileName.toLowerCase().endsWith('.txt') ? fileName : fileName + '.txt';
  }
  return 'Untitled.txt';
}

function updateTitle() {
  noteTitle.textContent = fileName + ' - Notepad';
}

function updateCaret() {
  const pos = noteText.selectionStart || 0;
  const lines = noteText.value.slice(0, pos).split('\n');
  notePos.textContent = 'Ln ' + lines.length + ', Col ' + (lines[lines.length - 1].length + 1);
}

function setStatus(text) {
  clearTimeout(statusTimer);
  noteStatus.textContent = text;
  if (!text) return;
  statusTimer = setTimeout(() => {
    noteStatus.textContent = dirty ? 'Modified' : '';
  }, 2500);
}

function updateChrome() {
  updateTitle();
  if (!noteStatus.textContent || noteStatus.textContent === 'Modified') {
    noteStatus.textContent = dirty ? 'Modified' : '';
  }
  updateCaret();
}

function pushHistory() {
  if (applying) return;
  const value = noteText.value;
  if (history[history.length - 1] === value) return;
  history.push(value);
  if (history.length > 80) history.shift();
}

function scheduleHistory() {
  clearTimeout(historyTimer);
  historyTimer = setTimeout(pushHistory, 350);
}

function loadText(name, text, handle) {
  applying = true;
  noteText.value = text;
  applying = false;
  fileHandle = handle || null;
  fileName = name || 'Untitled';
  savedText = text;
  dirty = false;
  history.length = 0;
  history.push(text);
  updateChrome();
  setStatus('');
  noteText.focus();
}

function blank() {
  loadText('Untitled', '', null);
}

function markSaved(name, how) {
  fileName = name || suggestedName();
  savedText = noteText.value;
  dirty = false;
  pushHistory();
  updateTitle();
  setStatus(how + ' ' + fileName);
}

function downloadText(text, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function writeHandle(handle, text) {
  const writable = await handle.createWritable();
  await writable.write(new Blob([text], { type: 'text/plain' }));
  await writable.close();
}

async function save() {
  const text = noteText.value;
  const name = suggestedName();
  if (fileHandle && fileHandle.createWritable) {
    try {
      await writeHandle(fileHandle, text);
      markSaved(fileHandle.name || name, 'Saved');
      return true;
    } catch (err) {
      if (isAbort(err)) return false;
    }
  }
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'Text Documents', accept: { 'text/plain': ['.txt'] } }],
      });
      await writeHandle(handle, text);
      fileHandle = handle;
      markSaved(handle.name || name, 'Saved');
      return true;
    } catch (err) {
      if (isAbort(err)) return false;
    }
  }
  downloadText(text, name);
  fileHandle = null;
  markSaved(name, 'Downloaded');
  return true;
}

function rejectFile() {
  if (window.WinShell) window.WinShell.showMsg('Notepad', 'Open a .txt file.');
}

async function readPicked(file, handle) {
  if (!isTextFile(file)) {
    rejectFile();
    return;
  }
  const text = await file.text();
  loadText(file.name, text, handle || null);
  setStatus('Opened ' + file.name);
}

function pickWithInput() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,text/plain';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (file) readPicked(file, null);
  });
  input.click();
}

async function pickFile() {
  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Text Documents', accept: { 'text/plain': ['.txt'] } }],
      });
      const file = await handle.getFile();
      await readPicked(file, handle);
      return;
    } catch (err) {
      if (isAbort(err)) return;
    }
  }
  pickWithInput();
}

function showAsk() {
  noteAskText.textContent = 'The text in the ' + fileName + ' file has changed.\n\nDo you want to save the changes?';
  noteDlg.hidden = false;
  noteShade.hidden = false;
  noteDesktop.inert = true;
  document.getElementById('noteYes').focus();
}

function hideAsk() {
  noteDlg.hidden = true;
  noteShade.hidden = true;
  noteDesktop.inert = false;
}

function afterClean(action) {
  if (action === 'new') blank();
  else if (action === 'open') pickFile();
  else if (action === 'exit') {
    blank();
    hideWindow();
  }
}

function request(action) {
  if (!dirty) {
    afterClean(action);
    return;
  }
  pending = action;
  showAsk();
}

function syncTask() {
  if (closed) {
    noteTask.hidden = true;
    return;
  }
  noteTask.hidden = false;
  const pressed = !noteWin.hidden && noteWin.classList.contains('active') && noteShade.hidden && noteDlg.hidden;
  noteTask.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

function open() {
  closed = false;
  noteWin.hidden = false;
  noteTask.hidden = false;
  if (window.WinShell) window.WinShell.activate(noteWin);
  syncTask();
  noteText.focus();
}

function minimize() {
  noteWin.hidden = true;
  syncTask();
}

function hideWindow() {
  closed = true;
  noteWin.hidden = true;
  if (maximized) toggleMax();
  syncTask();
}

function toggleMax() {
  if (!maximized) {
    savedRect = {
      left: noteWin.style.left,
      top: noteWin.style.top,
      width: noteWin.style.width,
      height: noteWin.style.height,
    };
    maximized = true;
    noteWin.classList.add('maximized');
  } else {
    maximized = false;
    noteWin.classList.remove('maximized');
    if (savedRect) {
      noteWin.style.left = savedRect.left;
      noteWin.style.top = savedRect.top;
      noteWin.style.width = savedRect.width;
      noteWin.style.height = savedRect.height;
    }
  }
  noteGlyphMax.hidden = maximized;
  noteGlyphRestore.hidden = !maximized;
  noteMaxBtn.setAttribute('aria-label', maximized ? 'Restore' : 'Maximize');
}

function selectedText() {
  return noteText.value.slice(noteText.selectionStart, noteText.selectionEnd);
}

function insertText(text) {
  const start = noteText.selectionStart;
  const end = noteText.selectionEnd;
  noteText.setRangeText(text, start, end, 'end');
  noteText.dispatchEvent(new Event('input', { bubbles: true }));
  noteText.focus();
}

async function copy() {
  const text = selectedText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    document.execCommand('copy');
  }
}

async function cut() {
  const text = selectedText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    document.execCommand('copy');
  }
  insertText('');
}

async function paste() {
  try {
    insertText(await navigator.clipboard.readText());
  } catch (err) {
    noteText.focus();
    document.execCommand('paste');
  }
}

function undo() {
  if (history.length < 2) return;
  history.pop();
  applying = true;
  noteText.value = history[history.length - 1];
  applying = false;
  dirty = noteText.value !== savedText;
  updateChrome();
  noteText.focus();
}

function wire() {
  noteText.addEventListener('input', () => {
    if (applying) return;
    dirty = noteText.value !== savedText;
    scheduleHistory();
    updateChrome();
  });
  noteText.addEventListener('keyup', updateCaret);
  noteText.addEventListener('click', updateCaret);
  noteText.addEventListener('select', updateCaret);

  document.getElementById('noteMin').addEventListener('click', minimize);
  noteMaxBtn.addEventListener('click', toggleMax);
  document.getElementById('noteClose').addEventListener('click', () => request('exit'));
  noteTitleBar.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    toggleMax();
  });

  document.getElementById('noteYes').addEventListener('click', () => {
    const action = pending;
    save().then((ok) => {
      if (!ok) return;
      hideAsk();
      pending = null;
      afterClean(action);
    });
  });
  document.getElementById('noteNo').addEventListener('click', () => {
    const action = pending;
    hideAsk();
    pending = null;
    dirty = false;
    afterClean(action);
  });
  function cancelAsk() {
    hideAsk();
    pending = null;
  }
  document.getElementById('noteCancel').addEventListener('click', cancelAsk);
  document.getElementById('noteAskX').addEventListener('click', cancelAsk);

  noteTask.addEventListener('click', () => {
    if (closed || noteWin.hidden) open();
    else if (noteWin.classList.contains('active')) minimize();
    else if (window.WinShell) window.WinShell.activate(noteWin);
    syncTask();
  });

  if (window.WinShell) window.WinShell.makeDraggable(noteWin, noteTitleBar);
  new MutationObserver(syncTask).observe(noteWin, { attributes: true, attributeFilter: ['class', 'hidden'] });
  new MutationObserver(syncTask).observe(noteShade, { attributes: true, attributeFilter: ['hidden'] });

  document.addEventListener('keydown', (e) => {
    if (!noteDlg.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        hideAsk();
        pending = null;
      }
      return;
    }
    const here = !noteWin.hidden && (document.activeElement === noteText || noteWin.classList.contains('active'));
    if (!here) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();
        save();
      } else if (key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        request('open');
      } else if (key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        request('new');
      }
    }
  }, true);

  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  updateTitle();
  updateCaret();
}

wire();

window.NotePad = {
  open: open,
  newFile: () => request('new'),
  openFile: () => request('open'),
  save: save,
  exit: () => request('exit'),
  undo: undo,
  cut: cut,
  copy: copy,
  paste: paste,
  deleteSelection: () => insertText(''),
  selectAll: () => {
    noteText.focus();
    noteText.select();
    updateCaret();
  },
  snapshot: () => ({
    fileName: fileName,
    dirty: dirty,
    text: noteText.value,
    hidden: noteWin.hidden,
    closed: closed,
    title: noteTitle.textContent,
  }),
};
})();
