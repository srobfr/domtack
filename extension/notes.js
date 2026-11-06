// The notes panel: drafts of text and tacks. Each draft keeps its own copy of its tacks' context, so a draft survives
// history deletes and exports to one file that carries everything, on machines without the native host too.
// Storage: the draft under note:<uuid>, its tacks under tacks:note:<uuid>, written only when a tack is added, so that
// saving while typing doesn't rewrite every page snapshot.
const picker = document.querySelector('#doc');
const titleInput = document.querySelector('#title');
const editor = document.querySelector('#editor');
const deleteButton = document.querySelector('[data-action="delete"]');
const toastEl = document.querySelector('.toast');
const ID = /^domtack:[a-z2-7]{8}$/;
let docs = [];
let doc;
let lastRange; // the caret, kept while focus is on the page: picks land where the user was typing
let saveTimer, toastTimer, deleteTimer;

const now = () => new Date().toISOString();
const png = entry => 'data:image/png;base64,' + entry.png;

function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2500);
}

function newDoc() {
  return { id: 'note:' + crypto.randomUUID(), title: 'Untitled notes', createdAt: now(), updatedAt: now(), html: '', tacks: {} };
}

function fillPicker() {
  picker.replaceChildren(...docs.map(d => new Option(d.title, d.id, false, d.id === doc.id)));
}

// Drafts are only written by this page (pastes and drops go in as plain text), yet what comes back from storage is
// rebuilt from an allowlist: the text formatting contenteditable makes, and the tack images.
const TAGS = new Set(['div', 'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'ul', 'ol', 'li', 'img']);
const ATTRIBUTES = new Set(['class', 'data-tack', 'alt']);
function parse(html) {
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  for (const element of [...body.querySelectorAll('*')]) {
    if (!TAGS.has(element.localName)) { element.replaceWith(...element.childNodes); continue; }
    for (const { name } of [...element.attributes]) if (!ATTRIBUTES.has(name)) element.removeAttribute(name);
  }
  return [...body.childNodes];
}

function show(target) {
  doc = target;
  titleInput.value = doc.title;
  editor.replaceChildren(...parse(doc.html));
  for (const img of editor.querySelectorAll('img.tack')) {
    const entry = doc.tacks[img.dataset.tack];
    if (entry) img.src = png(entry);
  }
  lastRange = undefined;
  fillPicker();
}

async function save() {
  clearTimeout(saveTimer);
  const copy = editor.cloneNode(true);
  copy.querySelectorAll('img.tack').forEach(img => img.removeAttribute('src')); // the screenshot is in doc.tacks
  doc.html = copy.innerHTML;
  doc.title = titleInput.value.trim() || 'Untitled notes';
  doc.updatedAt = now();
  const { tacks, ...draft } = doc;
  await chrome.storage.local.set({ [doc.id]: draft });
  docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  fillPicker();
}
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

// A tack shows as its screenshot only, inline with the text; its context lives in doc.tacks.
function imageFor(entry) {
  const img = Object.assign(document.createElement('img'), { className: 'tack', src: png(entry), alt: entry.id });
  img.dataset.tack = entry.id;
  return img;
}

function insertTack(entry) {
  const { clip, favicon, ...context } = entry; // clip repeats html, favicon only serves the history page
  doc.tacks[entry.id] = context;
  chrome.storage.local.set({ ['tacks:' + doc.id]: doc.tacks });
  const img = imageFor(entry);
  if (lastRange && editor.contains(lastRange.startContainer)) {
    lastRange.collapse(false);
    lastRange.insertNode(img);
  } else {
    editor.append(img);
  }
  // Typing goes on right after the tack.
  lastRange = document.createRange();
  lastRange.setStartAfter(img);
  // Moved even without focus: when the panel gets focus back, the selection it reports must be this one, not the old one.
  getSelection().setBaseAndExtent(lastRange.startContainer, lastRange.startOffset, lastRange.startContainer, lastRange.startOffset);
  img.scrollIntoView({ block: 'nearest' });
  save();
}

const gunzip = b64 => new Response(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))]).stream()
  .pipeThrough(new DecompressionStream('gzip'))).text();
const linkable = url => /^(https?|file):/.test(url);

async function exportDoc() {
  await save();
  const body = editor.cloneNode(true);
  const tacks = {};
  for (const img of body.querySelectorAll('img.tack')) {
    const entry = doc.tacks[img.dataset.tack];
    if (!entry) continue;
    img.src = png(entry);
    img.title = [entry.title || entry.url, ...(entry.frames ?? []).map(frame => frame.title || frame.url), entry.selector].join(' › ');
    const { png: _, pageGz, saved, ...context } = entry; // the screenshot is the img itself; saved only means something here
    tacks[entry.id] ??= { ...context, page: pageGz ? await gunzip(pageGz) : undefined };
  }
  const html = exportNotes({ title: doc.title, exportedAt: now(), body: body.innerHTML, tacks });
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([html], { type: 'text/html' })),
    download: (doc.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'notes') + '.html',
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  const count = Object.keys(tacks).length;
  toast(`Exported with ${count} tack${count === 1 ? '' : 's'}`);
}

async function remove() {
  // First click arms the button, the second one deletes.
  if (!deleteButton.classList.contains('armed')) {
    deleteButton.classList.add('armed');
    deleteTimer = setTimeout(() => deleteButton.classList.remove('armed'), 3000);
    return;
  }
  clearTimeout(deleteTimer);
  deleteButton.classList.remove('armed');
  clearTimeout(saveTimer);
  await chrome.storage.local.remove([doc.id, 'tacks:' + doc.id]);
  docs = docs.filter(d => d !== doc);
  if (!docs.length) docs.push(newDoc());
  show(docs[0]);
  toast('Draft deleted');
}

document.querySelector('header').addEventListener('click', async e => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'pick') chrome.runtime.sendMessage({ type: 'pick' });
  if (action === 'new') { await save(); docs.unshift(newDoc()); show(docs[0]); await save(); titleInput.select(); }
  if (action === 'export') exportDoc();
  if (action === 'delete') remove();
});
picker.addEventListener('change', async () => {
  const target = docs.find(d => d.id === picker.value); // save() refills the list, read the choice first
  await save();
  show(target);
});
titleInput.addEventListener('input', saveSoon);
titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') editor.focus(); });
editor.addEventListener('input', saveSoon);
// selectionchange is async and can arrive once focus has left: input and blur keep the caret exact.
const keepCaret = () => {
  const selection = getSelection();
  if (selection.rangeCount && editor.contains(selection.anchorNode)) lastRange = selection.getRangeAt(0).cloneRange();
};
document.addEventListener('selectionchange', keepCaret);
editor.addEventListener('input', keepCaret);
editor.addEventListener('blur', keepCaret);

// Pastes and drops arrive as plain text, so nothing from outside (markup, remote images) gets into a draft. A tack id,
// or the context the picker copies without the native host, becomes the tack itself when this browser has it.
editor.addEventListener('paste', async e => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  const trimmed = text.trim();
  const id = ID.test(trimmed) ? trimmed : trimmed.match(/^--- DomTack page data \((domtack:[a-z2-7]{8})\)/)?.[1];
  const entry = id && (await chrome.storage.local.get(id))[id];
  if (entry) insertTack(entry);
  else document.execCommand('insertText', false, text);
});
editor.addEventListener('drop', e => {
  e.preventDefault();
  document.execCommand('insertText', false, e.dataTransfer.getData('text/plain'));
});

// A pick started with this panel's Pick button goes into the current draft; one panel per window.
// Not an async listener: Chrome takes a returned promise as the reply, which would answer the picker's messages first.
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'tacked' && doc) insert(msg);
});
async function insert({ id, windowId }) {
  if (windowId !== (await chrome.windows.getCurrent()).id) return;
  const entry = (await chrome.storage.local.get(id))[id];
  if (entry) insertTack(entry);
}

(async () => {
  const all = await chrome.storage.local.get(null);
  docs = Object.values(all).filter(d => d?.id?.startsWith('note:')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const draft of docs) draft.tacks = all['tacks:' + draft.id] ?? {};
  if (!docs.length) docs.push(newDoc());
  show(docs[0]);
})();
