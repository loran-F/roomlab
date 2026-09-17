/* Shared decoded image leases. Classic script: safe before gameplay registration.
 * Limits are soft while consumers pin live artwork; unpinned entries are LRU.
 * Call release when preparation ends. DOM bindings own their own image lease.
 */
(function (g) {
  'use strict';
  if (g.RoomAssets) return;
  const MAX_BYTES = 32 * 1024 * 1024, MAX_ENTRIES = 12, MAX_ACTIVE = 2, TIMEOUT = 45000;
  const cache = new Map(), scopes = new Map(), queue = [], bindings = new Set(), bound = new WeakMap();
  let active = 0, clock = 0, observer = null;
  function abortError() { return new DOMException('Loading canceled', 'AbortError'); }
  function version(src) {
    const u = new URL(src, document.baseURI), v = String(g.APP_VER || '').match(/^v(\d+(?:\.\d+)*)/);
    if (v && /^https?:$/.test(u.protocol) && u.origin === location.origin) u.searchParams.set('v', v[1]);
    return u.href;
  }
  function normalize(d) {
    if (typeof d === 'string') d = { src: d };
    if (!d || !d.src) throw new TypeError('Image descriptor requires src');
    return { id: String(d.id || d.src), src: String(d.src), fallback: d.fallback ? [].concat(d.fallback).map(String) : [], required: d.required === true };
  }
  function merge(list) {
    const out = new Map();
    list.forEach(raw => {
      const d = normalize(raw), key = version(d.src), prior = out.get(key);
      if (prior) { prior.required = prior.required || d.required; prior.fallback = [...new Set(prior.fallback.concat(d.fallback))]; }
      else out.set(key, d);
    });
    return [...out.values()];
  }
  function register(scope, descriptors) { scopes.set(String(scope), merge(descriptors || [])); }
  function manifest(names) { return merge([].concat(names || []).flatMap(name => scopes.get(String(name)) || [])); }
  function bytes() { let n = 0; cache.forEach(e => { n += e.bytes; }); return n; }
  function discard(e) {
    if (e.refs > 0) return;
    if (cache.get(e.key) === e) cache.delete(e.key);
    if (e.state === 'queued' || e.state === 'loading') e.controller.abort();
    if (e.url) URL.revokeObjectURL(e.url);
    e.url = null; e.image = null; e.bytes = 0;
  }
  function prune() {
    const candidates = [...cache.values()].filter(e => !e.refs && e.state !== 'loading' && e.state !== 'queued').sort((a, b) => a.used - b.used);
    while ((cache.size > MAX_ENTRIES || bytes() > MAX_BYTES) && candidates.length) discard(candidates.shift());
  }
  function find(src) {
    const key = version(src), direct = cache.get(key);
    if (direct) return direct;
    return [...cache.values()].find(e => e.state === 'ready' && e.sources.includes(key));
  }
  function url(src) { const e = find(src); return e && e.state === 'ready' && e.url ? e.url : version(src); }
  function raceSignal(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      function canceled() { signal.removeEventListener('abort', canceled); reject(abortError()); }
      signal.addEventListener('abort', canceled, { once: true });
      promise.then(value => { signal.removeEventListener('abort', canceled); resolve(value); }, error => { signal.removeEventListener('abort', canceled); reject(error); });
    });
  }
  async function download(e) {
    let last;
    for (const source of e.sources) {
      let blobURL = null;
      try {
        const response = await fetch(source, { signal: e.controller.signal, cache: 'default', priority: e.priority });
        if (!response.ok) throw new Error('Image HTTP ' + response.status);
        const blob = await response.blob();
        if (e.controller.signal.aborted) throw e.timedOut ? new Error('Image loading timed out') : abortError();
        blobURL = URL.createObjectURL(blob);
        const image = new Image(); image.decoding = 'async'; image.src = blobURL;
        await raceSignal(image.decode(), e.controller.signal);
        if (e.controller.signal.aborted) throw abortError();
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image is empty');
        e.url = blobURL; e.image = image; e.bytes = image.naturalWidth * image.naturalHeight * 4; e.source = source;
        return e;
      } catch (error) {
        if (blobURL) URL.revokeObjectURL(blobURL);
        if (e.controller.signal.aborted) throw e.timedOut ? new Error('Image loading timed out') : abortError();
        last = error;
      }
    }
    throw last || new Error('Image unavailable');
  }
  function pump() {
    queue.sort((a, b) => (a.priority === 'low') - (b.priority === 'low'));
    while (active < MAX_ACTIVE && queue.length) {
      const e = queue.shift();
      if (e.controller.signal.aborted || cache.get(e.key) !== e) { e.state = 'failed'; e.reject(abortError()); continue; }
      active++; e.state = 'loading';
      const deadline = setTimeout(() => { e.timedOut = true; e.controller.abort(); }, TIMEOUT);
      download(e).then(() => { e.state = 'ready'; e.used = ++clock; e.resolve(e); }, error => {
        e.state = 'failed'; e.error = error;
        e.retryAt = Date.now() + 30000;
        if (e.controller.signal.aborted && !e.timedOut && cache.get(e.key) === e) cache.delete(e.key);
        e.reject(error);
      }).finally(() => { clearTimeout(deadline); active--; prune(); pump(); });
    }
  }
  function acquire(d, priority, retry) {
    let e = find(d.src);
    if (e?.state === 'failed' && !d.required && !retry && e.retryAt > Date.now() && d.fallback.every(src => e.sources.includes(version(src)))) {
      e.refs++; let released = false;
      return { entry: e, release() { if (!released) { released = true; e.refs--; prune(); } } };
    }
    if (!e || e.state === 'failed' || e.controller.signal.aborted) {
      const key = version(d.src);
      e = { key, sources: [...new Set([key, ...d.fallback.map(version)])], state: 'queued', refs: 0, used: ++clock, bytes: 0, url: null, image: null, controller: new AbortController(), priority: priority === 'low' ? 'low' : 'high' };
      e.promise = new Promise((resolve, reject) => { e.resolve = resolve; e.reject = reject; });
      // A queued entry can lose every consumer before its task begins.
      e.promise.catch(() => {});
      cache.set(key, e); queue.push(e);
    } else {
      if (priority !== 'low') e.priority = 'high';
      // Another consumer can supply a fallback while the primary is in flight.
      // Mutate this array so the running download iterator sees new candidates.
      d.fallback.map(version).forEach(src => { if (!e.sources.includes(src)) e.sources.push(src); });
    }
    e.refs++; e.used = ++clock;
    queueMicrotask(pump);
    let released = false;
    return { entry: e, release() {
      if (released) return; released = true; e.refs = Math.max(0, e.refs - 1); e.used = ++clock;
      queueMicrotask(() => {
        if (!e.refs && ['queued', 'loading'].includes(e.state)) discard(e);
        prune(); pump();
      });
    } };
  }
  async function prepare(descriptors, options = {}) {
    const list = merge(descriptors || []), signal = options.signal, leases = [];
    let completed = 0, failed = 0, released = false;
    function release() { if (released) return; released = true; leases.forEach(l => l.release()); }
    function progress() { if (!released && options.onProgress && !signal?.aborted) options.onProgress({ completed, total: list.length, failed }); }
    if (signal?.aborted) throw abortError();
    try {
      progress();
      // Acquire all references before any shared request can be canceled.
      list.forEach(d => leases.push(acquire(d, options.priority, options.retry)));
      const items = await Promise.all(list.map(async (d, i) => {
        const e = leases[i].entry;
        try {
          await raceSignal(e.promise, signal);
          if (signal?.aborted) throw abortError();
          completed++; progress();
          return { id: d.id, src: d.src, url: e.url, source: e.source, ok: true, required: d.required };
        } catch (error) {
          if (signal?.aborted) throw abortError();
          completed++; failed++; progress();
          if (d.required) throw error;
          leases[i].release();
          return { id: d.id, src: d.src, url: null, ok: false, required: false, error: error.message };
        }
      }));
      if (signal?.aborted) throw abortError();
      return { release, items };
    } catch (error) { release(); throw error; }
  }
  function observeBindings() {
    if (observer) return;
    observer = new MutationObserver(() => {
      bindings.forEach(b => {
        if (b.el.isConnected) { b.connected = true; clearTimeout(b.timer); }
        else if (b.connected) b.release();
      });
      if (!bindings.size) { observer.disconnect(); observer = null; }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  function bind(el, src, background) {
    if (!el) return { release() {}, ready: Promise.resolve(false) };
    bound.get(el)?.release();
    const controller = new AbortController();
    const b = { el, connected: el.isConnected, timer: null, lease: null, released: false, release() {
      if (b.released) return; b.released = true; controller.abort(); clearTimeout(b.timer); b.lease?.release(); bindings.delete(b);
      if (bound.get(el) === b) bound.delete(el);
    } };
    bound.set(el, b); bindings.add(b); observeBindings();
    if (!b.connected) b.timer = setTimeout(b.release, 30000);
    b.ready = prepare([{ src, required: false }], { signal: controller.signal }).then(async lease => {
      b.lease = lease;
      if (b.released) { lease.release(); return false; }
      const item = lease.items[0]; if (!item?.ok) return false;
      if (background) el.style.backgroundImage = 'url("' + item.url + '")';
      else { el.src = item.url; if (typeof el.decode === 'function') await raceSignal(el.decode(), controller.signal); }
      return !b.released;
    }).catch(() => false);
    // Paint a cache hit in this same frame; prepare above already owns its pin.
    const hit = find(src);
    if (hit?.state === 'ready' && hit.url) {
      if (background) el.style.backgroundImage = 'url("' + hit.url + '")';
      else el.src = hit.url;
    }
    return { release: b.release, ready: b.ready };
  }
  function stats() {
    const entries = [...cache.values()];
    return { entries: entries.length, pending: entries.filter(e => e.state === 'queued' || e.state === 'loading').length, bytes: bytes(), pinned: entries.filter(e => e.refs > 0).length, references: entries.reduce((n, e) => n + e.refs, 0), active, bindings: bindings.size, maxBytes: MAX_BYTES, maxEntries: MAX_ENTRIES };
  }
  g.RoomAssets = { version, url, register, manifest, prepare, bindImage: (el, src) => bind(el, src, false), bindBackground: (el, src) => bind(el, src, true), stats };
})(window);
