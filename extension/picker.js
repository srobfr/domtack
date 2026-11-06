// Injected on demand into every frame; the block scope lets it be injected again without redeclaration errors.
// Page content never travels through window.postMessage, which the embedding pages' scripts can read: the clicked frame
// sends its context straight to the background, and only a nonce and a hop count go up the frame chain. Each ancestor
// reports its iframe's geometry to the background, and the top frame asks for the capture and writes the clipboard
// (the click's user activation reaches ancestors).
{
  if (window.__domtackPicking) window.__domtackPicking();
  const isTop = window === window.top;
  const BOX = 'all:initial;position:fixed;z-index:2147483647;pointer-events:none;';
  const overlay = document.createElement('div');
  overlay.style.cssText = BOX + 'display:none;outline:2px solid #e8590c;background:rgba(232,89,12,.12);';
  document.documentElement.append(overlay);
  // Some pages make iframes ignore the mouse (rrweb replays set pointer-events: none); the frame's own picker needs it.
  // Set through CSSOM, which a page's CSP doesn't block, and restored on stop.
  const framePointer = [...document.querySelectorAll('iframe, frame')].map(f => {
    const saved = [f.style.getPropertyValue('pointer-events'), f.style.getPropertyPriority('pointer-events')];
    f.style.setProperty('pointer-events', 'auto', 'important');
    return () => f.style.setProperty('pointer-events', ...saved);
  });
  let target = null;

  const selectorOf = el => {
    const parts = [];
    for (; el && el.nodeType === 1 && el !== document.documentElement; el = el.parentElement) {
      // Pages reuse ids (YouTube has dozens of #text), so an id only anchors the selector when it's unique.
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const same = el.parentElement ? [...el.parentElement.children].filter(s => s.localName === el.localName) : [el];
      parts.unshift(same.length > 1 ? `${el.localName}:nth-of-type(${same.indexOf(el) + 1})` : el.localName);
    }
    return parts.join(' > ');
  };

  // Clips a rect to this frame's viewport: the part outside it is not visible to the capture anyway.
  const clip = r => {
    const x = Math.max(0, r.x), y = Math.max(0, r.y);
    return { x, y, width: Math.max(0, Math.min(innerWidth, r.x + r.width) - x), height: Math.max(0, Math.min(innerHeight, r.y + r.height) - y) };
  };

  const snackbar = text => {
    const bar = document.createElement('div');
    bar.style.cssText = BOX + 'left:50%;bottom:24px;transform:translateX(-50%);padding:8px 16px;border-radius:6px;background:#212529;color:#fff;font:14px system-ui,sans-serif;';
    bar.textContent = text;
    document.documentElement.append(bar);
    setTimeout(() => bar.remove(), 2500);
  };

  const isFrame = el => el.localName === 'iframe' || el.localName === 'frame';

  // What the user sees, as HTML: rendered elements only (no scripts, styles, metadata, comments, hidden or collapsed
  // nodes), form fields with their current values (passwords masked), open shadow roots inlined, no event handlers.
  // ponytail: a visible child under a visibility:hidden parent is dropped with it; rare, add a per-child check if needed.
  const DROPPED = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'base', 'head']);
  const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'source', 'track', 'wbr']);
  const escapeHtml = (s, attribute) => s.replace(attribute ? /[&"<>]/g : /[&<>]/g, c => `&#${c.charCodeAt(0)};`);
  const shown = el => el.checkVisibility({ visibilityProperty: true }) || getComputedStyle(el).display === 'contents';
  const visibleHtml = root => {
    const out = [];
    const walk = node => {
      if (node.nodeType === Node.TEXT_NODE) return out.push(escapeHtml(node.data));
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const name = node.localName;
      if (DROPPED.has(name) || !shown(node)) return;
      const typed = name === 'input' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file'].includes(node.type);
      const attributes = [...node.attributes].filter(a => !(a.name.startsWith('on') && (node[a.name] === null || typeof node[a.name] === 'function'))
        && !['style', 'nonce', 'integrity', 'checked', 'selected'].includes(a.name) && !(typed && a.name === 'value'));
      out.push('<' + name, ...attributes.map(a => ` ${a.name}="${escapeHtml(a.value.startsWith('data:') && a.value.length > 200 ? a.value.slice(0, 40) + '…' : a.value, true)}"`));
      if (typed) out.push(` value="${escapeHtml(node.type === 'password' ? '•'.repeat(node.value.length) : node.value, true)}"`);
      if (node.checked || node.selected) out.push(node.checked ? ' checked' : ' selected');
      out.push('>');
      if (VOID.has(name)) return;
      if (node.shadowRoot) { out.push('<template shadowrootmode="open">'); node.shadowRoot.childNodes.forEach(walk); out.push('</template>'); }
      if (name === 'textarea') out.push(escapeHtml(node.value));
      else if (name === 'select') [...node.selectedOptions].forEach(o => out.push(`<option selected>${escapeHtml(o.text)}</option>`)); // closed list: only the choice shows
      else node.childNodes.forEach(walk);
      out.push(`</${name}>`);
    };
    walk(root);
    return out.join('');
  };

  const onMove = e => {
    if (!e.isTrusted || e.target === target) return;
    target = e.target;
    // Inside a frame, that frame's own picker draws the outline.
    overlay.style.display = isFrame(target) ? 'none' : '';
    const r = target.getBoundingClientRect();
    Object.assign(overlay.style, { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' });
  };
  const onLeave = () => { overlay.style.display = 'none'; target = null; };

  const block = e => { e.preventDefault(); e.stopImmediatePropagation(); };

  const onStopMessage = msg => { if (msg.type === 'tack-stop') stop(); };

  const stop = () => {
    removeEventListener('mousemove', onMove, true);
    removeEventListener('keydown', onKey, true);
    for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) removeEventListener(t, block, true);
    removeEventListener('click', onClick, true);
    removeEventListener('message', onUp);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    chrome.runtime.onMessage.removeListener(onStopMessage);
    overlay.remove();
    framePointer.forEach(restore => restore());
    delete window.__domtackPicking;
  };
  // Ends picking in every frame of the tab.
  const stopAll = () => { stop(); chrome.runtime.sendMessage({ type: 'stop' }).catch(() => {}); };

  const onKey = e => { if (e.isTrusted && e.key === 'Escape') { block(e); stopAll(); } };

  const finish = (nonce, hops) => {
    stopAll();
    const viewport = { width: innerWidth, height: innerHeight, devicePixelRatio, scrollX, scrollY };
    // Two frames so the removed overlays are painted out before the capture.
    const result = new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)))
      .then(() => chrome.runtime.sendMessage({ type: 'tack', nonce, hops, viewport }))
      .then(r => { if (!r?.png) throw new Error(r?.error ?? 'no answer from the extension'); return r; });
    const item = p => new ClipboardItem({
      'text/plain': p.then(r => new Blob([r.clip], { type: 'text/plain' })),
      'image/png': p.then(r => new Blob([Uint8Array.from(atob(r.png), c => c.charCodeAt(0))], { type: 'image/png' })),
      // Rich editors take the HTML: the image alone, with the reference kept in its alt text for whoever reads the HTML.
      'text/html': p.then(r => new Blob([`<img src="data:image/png;base64,${r.png}" alt="${r.clip.replace(/[&"<>]/g, c => `&#${c.charCodeAt(0)};`)}">`], { type: 'text/html' })),
    });
    // Write while the click's user activation is live; values resolve later.
    navigator.clipboard.write([item(result)])
      .catch(() => result.then(r => navigator.clipboard.write([item(Promise.resolve(r))])))
      .then(() => result)
      .then(r => snackbar(r.saved ? `Copied ${r.id}` : 'Copied the element and its context'))
      .catch(err => snackbar('DomTack failed: ' + err.message));
  };

  const forward = (nonce, hop) => isTop ? finish(nonce, hop) : parent.postMessage({ domtack: 'up', nonce, hop: hop + 1 }, '*');

  const onClick = e => {
    block(e);
    // Mouse clicks only: Enter or Space on an element the page focused also fires a trusted click, with detail 0.
    if (!e.isTrusted || e.detail < 1) return;
    const el = e.target;
    const nonce = crypto.randomUUID();
    if (!isTop) stop();
    chrome.runtime.sendMessage({ type: 'part', nonce, hop: 0, url: location.href, title: document.title, ctx: {
      selector: selectorOf(el),
      rect: clip(el.getBoundingClientRect().toJSON()),
      text: el.innerText ?? el.textContent,
      html: visibleHtml(el),
      page: '<!doctype html>' + visibleHtml(document.documentElement),
    } }).catch(() => {});
    forward(nonce, 0);
  };

  // A child frame was clicked: report where that iframe sits in this frame, then pass the nonce on.
  const onUp = async e => {
    const { domtack, nonce, hop } = e.data ?? {};
    if (domtack !== 'up' || typeof nonce !== 'string' || !/^[0-9a-f-]{36}$/.test(nonce) || !Number.isInteger(hop) || hop < 1 || hop > 32) return;
    const frame = [...document.querySelectorAll('iframe, frame')].find(f => f.contentWindow === e.source);
    if (!frame) return;
    // Pages can post these messages too: act only on a pick the background has seen start with a real click.
    if (!await chrome.runtime.sendMessage({ type: 'known', nonce }).catch(() => false)) return;
    const fr = frame.getBoundingClientRect(), cs = getComputedStyle(frame);
    // On-screen vs layout size gives the frame's CSS scale (rrweb-player shrinks its replay); rotations are not handled.
    const sx = fr.width / frame.offsetWidth || 1, sy = fr.height / frame.offsetHeight || 1;
    const ox = fr.x + (frame.clientLeft + parseFloat(cs.paddingLeft)) * sx, oy = fr.y + (frame.clientTop + parseFloat(cs.paddingTop)) * sy;
    if (!isTop) stop();
    chrome.runtime.sendMessage({ type: 'part', nonce, hop, url: location.href, title: document.title,
      frame: { selector: selectorOf(frame), ox, oy, sx, sy, width: innerWidth, height: innerHeight } }).catch(() => {});
    forward(nonce, hop);
  };

  addEventListener('mousemove', onMove, true);
  addEventListener('keydown', onKey, true);
  for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) addEventListener(t, block, true);
  addEventListener('click', onClick, true);
  addEventListener('message', onUp);
  document.documentElement.addEventListener('mouseleave', onLeave);
  chrome.runtime.onMessage.addListener(onStopMessage);
  window.__domtackPicking = stop;
}
