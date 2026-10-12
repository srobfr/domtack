const main = document.querySelector('main');
const search = document.querySelector('.search input');
const empty = document.querySelector('.empty');
const toastEl = document.querySelector('.toast');
const card = document.getElementById('card').content.firstElementChild;
let entries = [];
let copiedId = null;
let toastTimer;

const DAY = 864e5;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const longDate = d => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

function when(date, now) {
  const mins = Math.round((now - date) / 6e4);
  if (startOfDay(date) === startOfDay(now)) return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  if (startOfDay(date) === startOfDay(now) - DAY) return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function group(date, now) {
  if (startOfDay(date) === startOfDay(now)) return ['Today', longDate(date)];
  if (startOfDay(date) === startOfDay(now) - DAY) return ['Yesterday', longDate(date)];
  return ['Earlier', ''];
}

function toast(before, id = '', after = '') {
  toastEl.replaceChildren(before, Object.assign(document.createElement('b'), { textContent: id }), after);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2500);
}

async function copy(entry, what) {
  const item = {};
  if (what !== 'image') item['text/plain'] = new Blob([entry.clip ?? entry.id], { type: 'text/plain' });
  if (what !== 'id') item['image/png'] = new Blob([Uint8Array.fromBase64(entry.png)], { type: 'image/png' });
  try {
    await navigator.clipboard.write([new ClipboardItem(item)]);
  } catch (e) {
    return toast(`Copy failed: ${e.message}`);
  }
  copiedId = entry.id;
  for (const c of main.querySelectorAll('.card')) {
    c.classList.toggle('copied', c.dataset.id === copiedId);
    c.querySelector('.hint').textContent = c.dataset.id === copiedId ? 'Copied' : 'Copy';
  }
  const text = entry.saved === false ? 'context' : 'id';
  toast('Copied ', entry.id, ` · ${{ both: `image + ${text}`, id: text, image: 'image' }[what]}`);
}

function render() {
  const query = search.value.trim().toLowerCase();
  const shown = entries.filter(entry => !query || [entry.id, entry.title, entry.url, entry.text, entry.selector].some(field => typeof field === 'string' && field.toLowerCase().includes(query)));
  const now = new Date();
  document.querySelector('.count').textContent = `${entries.length} tack${entries.length === 1 ? '' : 's'}`;
  main.replaceChildren();
  let grid, current;
  for (const entry of shown) {
    const date = new Date(entry.createdAt);
    const [label, sub] = group(date, now);
    if (label !== current) {
      current = label;
      const heading = document.createElement('h2');
      heading.append(label + ' ', Object.assign(document.createElement('span'), { textContent: sub }));
      grid = Object.assign(document.createElement('section'), { className: 'grid' });
      main.append(heading, grid);
    }
    const cardElement = card.cloneNode(true);
    cardElement.dataset.id = entry.id;
    cardElement.classList.toggle('copied', entry.id === copiedId);
    cardElement.querySelector('.thumb img').src = 'data:image/png;base64,' + entry.png;
    cardElement.querySelector('.hint').textContent = entry.id === copiedId ? 'Copied' : 'Copy';
    if (entry.saved === false) {
      cardElement.querySelector('.thumb').insertAdjacentHTML('beforeend', '<span class="badge" title="Kept in the browser only: copying gives the element\'s context instead of an id. To let agents fetch the full page, run npx domtack install.">clipboard only</span>');
    }
    cardElement.querySelector('.id').textContent = entry.id;
    cardElement.querySelector('.title').textContent = entry.title || entry.url;
    cardElement.querySelector('.title').title = entry.url;
    let host = entry.url;
    try { host = new URL(entry.url).host || entry.url; } catch {}
    cardElement.querySelector('.meta span').textContent = `${host} · ${when(date, now)}`;
    cardElement.querySelector('.meta').title = date.toLocaleString();
    if (entry.favicon?.startsWith('data:image/')) { // inline only: the history page makes no network requests
      const img = cardElement.querySelector('.meta img');
      img.onload = () => { img.hidden = false; };
      img.src = entry.favicon;
    }
    if (entry.selector) {
      // LRM marks keep the right-to-left ellipsis trick from moving leading/trailing punctuation.
      cardElement.querySelector('.selector').textContent = '‎' + entry.selector + '‎';
      cardElement.querySelector('.selector').title = entry.selector;
    }
    grid.append(cardElement);
  }
  empty.hidden = shown.length > 0;
  empty.querySelector('h3').textContent = entries.length ? 'No match' : 'No tacks yet';
  empty.querySelector('p').textContent = entries.length
    ? `Nothing matches “${search.value.trim()}”.`
    : 'Click the DomTack icon in the toolbar, then click any element on the page.';
}

async function load() {
  const all = await chrome.storage.local.get(null);
  entries = Object.values(all).filter(e => e?.id?.startsWith('domtack:')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  render();
}

main.addEventListener('click', async ev => {
  const cardElement = ev.target.closest('.card');
  if (!cardElement) return;
  const entry = entries.find(candidate => candidate.id === cardElement.dataset.id);
  const action = ev.target.closest('.thumb') ? 'both' : ev.target.closest('[data-action]')?.dataset.action;
  if (action === 'both' || action === 'id' || action === 'image') copy(entry, action);
  if (action === 'open') chrome.tabs.create({ url: entry.url });
  if (action === 'delete') {
    // Only the history entry goes; the copy on disk stays so agents can still resolve the id.
    await chrome.storage.local.remove(entry.id);
    toast('Deleted ', entry.id);
  }
});

search.addEventListener('input', render);
search.addEventListener('keydown', e => { if (e.key === 'Escape') { search.value = ''; render(); search.blur(); } });
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== search) { e.preventDefault(); search.focus(); }
});
chrome.storage.onChanged.addListener(load);
load();
