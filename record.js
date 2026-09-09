/* RoomLab 自动试玩录制台：AB 分屏 + 指标指示 + 自动驱动 + MediaRecorder 合成 */
(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
function log() { var d = $('log'); d.textContent += Array.prototype.slice.call(arguments).join(' ') + '\n'; d.scrollTop = d.scrollHeight; }
function st(t) { $('status').textContent = t; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function waitFor(fn, timeout, iv) {
  var t0 = Date.now(); iv = iv || 100;
  while (Date.now() - t0 < timeout) { try { var v = fn(); if (v) return v; } catch (e) {} await sleep(iv); }
  return null;
}

/* ---------- 玩法配置（15 个，与 PLAYGROUNDS/expansion 一致） ---------- */
var MODES = [
  { id: 'maze',     name: '通风潜行',   net: false, time: 120, exp: false },
  { id: 'dial',     name: '双人搜台',   net: true,  time: 100, exp: false },
  { id: 'wires',    name: '警报拆线',   net: true,  time: 90,  exp: false },
  { id: 'code',     name: '接头暗号',   net: false, time: 120, exp: false },
  { id: 'vault',    name: '档案窃取',   net: true,  time: 120, exp: false },
  { id: 'catch',    name: '情报空投',   net: true,  time: 60,  exp: false },
  { id: 'shield',   name: '双人屏障',   net: true,  time: 60,  exp: false },
  { id: 'beam',     name: '破障搬运',   net: true,  time: 65,  exp: false },
  { id: 'beat',     name: '信号节拍',   net: true,  time: 60,  exp: false },
  { id: 'pressure', name: '动力稳压',   net: true,  time: 90,  exp: false },
  { id: 'boss',     name: '双人拆机战', net: true,  time: 120, exp: false },
  { id: 'lookback', name: '你别回头',   net: true,  time: 85,  exp: true },
  { id: 'caller',   name: '真假接线员', net: true,  time: 110, exp: true },
  { id: 'shadow',   name: '影子替身',   net: true,  time: 100, exp: true },
  { id: 'lockbox',   name: '机关盒',   net: true, time: 240, exp: false },
  { id: 'silhouette',name: '影子拼图', net: true, time: 240, exp: false },
  { id: 'evidence',  name: '证物还原', net: true, time: 240, exp: false },
  { id: 'mirrors',   name: '镜面引光', net: true, time: 240, exp: false },
  { id: 'dungeon',  name: '密室爬塔',   net: true,  time: 180, exp: false }
];

/* 预置练习模式跳过（coop-upgrade 的 coop-practice-v1） */
(function () {
  var seen = {};
  MODES.forEach(function (m) { seen[m.id + 'A'] = true; seen[m.id + 'B'] = true; });
  try { sessionStorage.setItem('coop-practice-v1', JSON.stringify(seen)); } catch (e) {}
})();

var A = function () { return $('fA').contentWindow; };
var B = function () { return $('fB').contentWindow; };
var DOC = function (w) { return w.document; };

function loadIF(which, url) {
  return new Promise(function (res) {
    var f = $('f' + which);
    f.onload = function () { res(); };
    f.src = url;
  });
}

/* ---------- 开局流程 ---------- */
async function setupNet(mode) {
  await loadIF('A', 'roomlab.html?m=' + mode + '&role=A&v=rec');
  var code = await waitFor(function () {
    var w = A(); var t = '';
    var s1 = w.document.querySelector('#stage .msg'); if (s1) t += s1.textContent;
    var s2 = w.document.getElementById('x-lobby-status'); if (s2) t += s2.textContent;
    var s3 = w.document.getElementById('pp-status'); if (s3) t += s3.textContent;
    var m = t.match(/(\d{4})/);
    return m ? m[1] : null;
  }, 30000);
  if (!code) throw new Error(mode + ' A 建房超时');
  log(mode, '房间码', code);
  await loadIF('B', 'roomlab.html?m=' + mode + '&role=B&v=rec');
  var rc = await waitFor(function () { return B().document.getElementById('rc'); }, 15000);
  if (!rc) throw new Error(mode + ' B 加载超时');
  rc.value = code;
  B().document.getElementById('joing').click();
  log(mode, 'B 已加入房间');
  await sleep(500);
}
/* dungeon：密室选择页 → 创建/加入 → 等双方卷轴地图就绪 */
async function setupDungeon() {
  await loadIF('A', 'roomlab.html?m=dungeon&role=A&v=rec');
  var dm2 = await waitFor(function () { return A().document.getElementById('dm2'); }, 15000);
  if (!dm2) throw new Error('dungeon A 选择页超时');
  dm2.click();
  var code = await waitFor(function () {
    var box = A().document.getElementById('dgroom');
    if (!box) return null;
    var m = box.innerHTML.match(/房间码[：:]\s*(\d{4})/);
    return m ? m[1] : null;
  }, 30000);
  if (!code) throw new Error('dungeon A 建房超时');
  log('dungeon', '房间码', code);
  await loadIF('B', 'roomlab.html?m=dungeon&role=B&v=rec');
  var dm3 = await waitFor(function () { return B().document.getElementById('dm3'); }, 15000);
  if (!dm3) throw new Error('dungeon B 选择页超时');
  dm3.click();
  var rc = await waitFor(function () { return B().document.getElementById('rc'); }, 15000);
  if (!rc) throw new Error('dungeon B 输码框超时');
  rc.value = code;
  B().document.getElementById('joing').click();
  log('dungeon', 'B 已加入房间');
  await sleep(800);
}
async function setupOffline(mode) {
  await Promise.all([
    loadIF('A', 'roomlab.html?m=' + mode + '&role=A&v=rec'),
    loadIF('B', 'roomlab.html?m=' + mode + '&role=B&v=rec')
  ]);
  await sleep(800);
}
async function waitStarted(mode) {
  var mcfg = MODES.find(function (m) { return m.id === mode; });
  var isExp = !!(mcfg && mcfg.exp);
  if (mode === 'beam') { await waitReadyMobile('BeamMobile', '#bm-ready', 'beam'); return; }
  if (mode === 'wires') { await waitReadyMobile('WiresMobile', '#wm-ready', 'wires'); return; }
  if (mode === 'boss') { await waitReadyMobile('BossMobile', '#mb-ready', 'boss'); return; }
  if (mode === 'dial') { await waitRadioReady(); return; }
  if (mode === 'vault') { await waitVaultStart(); return; }
  if (mode === 'dungeon') {
    var okDg = await waitFor(function () {
      try { return !!(A().document.getElementById('dgmap') && A().DUNGEON && B().document.getElementById('dgmap') && B().DUNGEON); } catch (e) { return false; }
    }, 30000);
    if (!okDg) throw new Error('dungeon 地图加载超时');
    await sleep(300);
    return;
  }
  if (isExp) {
    /* expansion：先驱动双方练习 + 准备，才能触发倒计时开局 */
    var t0 = Date.now();
    while (Date.now() - t0 < 40000) {
      try { if (expReady(mode)) break; } catch (e) {}
      await sleep(200);
    }
  }
  var ok = await waitFor(function () {
    var w = A();
    try {
      if (isExp) { var v = w.RoomLabExpansion && w.RoomLabExpansion.view; return !!(v && v.ready.A && v.ready.B && v.cd === 0); }
      if (mode === 'boss' || mode === 'pressure') { return !!(w.RT && w.RT.ready && w.RT.cd === 0); }
      return !!(w.S && w.S.mod === mode && w.S.time > 0);
    } catch (e) { return false; }
  }, 45000);
  if (!ok) throw new Error(mode + ' 开局超时');
  await sleep(4200);
}

/* beam/wires 手游模块：双方点准备按钮 → 等 3 秒倒计时结束 */
async function waitReadyMobile(api, btn, label) {
  var ok = await waitFor(function () {
    try {
      var sa = A()[api] && A()[api].state();
      var sb = B()[api] && B()[api].state();
      return !!(sa && sb);
    } catch (e) { return false; }
  }, 30000);
  if (!ok) throw new Error(label + ' 手游界面加载超时');
  var started = false;
  var t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    try {
      var sa = A()[api].state();
      started = api === 'BossMobile'
        ? !!(sa.ready.A && sa.ready.B && sa.phase !== 'ready')
        : !!(sa.ready.A && sa.ready.B && sa.cd === 0);
      if (!started) {
        var ra = DOC(A()).querySelector(btn); if (ra && !ra.hidden && !ra.disabled) ra.click();
        var rb = DOC(B()).querySelector(btn); if (rb && !rb.hidden && !rb.disabled) rb.click();
      }
    } catch (e) { /* 忽略单帧异常 */ }
    if (started) break;
    await sleep(250);
  }
  if (!started) throw new Error(label + ' 双方准备超时');
  await sleep(api === 'BossMobile' ? 3600 : 3600);
}

/* dial 双人搜台：先各按一次调节键（练习），再点准备 */
async function waitRadioReady() {
  var ok = await waitFor(function () {
    try {
      var sa = A().RadioMobile && A().RadioMobile.state();
      var sb = B().RadioMobile && B().RadioMobile.state();
      return !!(sa && sb);
    } catch (e) { return false; }
  }, 30000);
  if (!ok) throw new Error('dial 手游界面加载超时');
  [A(), B()].forEach(function (w) {
    try { w.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); } catch (e) {}
    try { w.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); } catch (e) {}
  });
  var started = false;
  var t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    try {
      var sa = A().RadioMobile.state();
      started = !!(sa.ready.A && sa.ready.B && sa.cd === 0);
      if (!started) {
        var ra = DOC(A()).getElementById('radio-ready'); if (ra && !ra.hidden && !ra.disabled) ra.click();
        var rb = DOC(B()).getElementById('radio-ready'); if (rb && !rb.hidden && !rb.disabled) rb.click();
      }
    } catch (e) { /* 忽略单帧异常 */ }
    if (started) break;
    await sleep(250);
  }
  if (!started) throw new Error('dial 双方准备超时');
  await sleep(3600);
}

/* vault 档案窃取：等 A 点「开始扫描」进入 show 阶段 */
async function waitVaultStart() {
  var ok = await waitFor(function () {
    try {
      var sa = A().VaultMobile && A().VaultMobile.state();
      var sb = B().VaultMobile && B().VaultMobile.state();
      return !!(sa && sb);
    } catch (e) { return false; }
  }, 30000);
  if (!ok) throw new Error('vault 手游界面加载超时');
  var t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    var ph = null;
    try { ph = A().VaultMobile.state().phase; } catch (e) {}
    if (ph && ph !== 'read') break;
    try { var st = DOC(A()).getElementById('vm-start'); if (st) st.click(); } catch (e) {}
    await sleep(250);
  }
  await sleep(600);
}

/* ---------- 录制 ---------- */
var rec = null, chunks = [], driveTimer = null, recording = false;
function startRec() {
  /* 每局全新 canvas：同一 canvas 多次 captureStream 会污染帧流（首局可播、后续卡 0.2s） */
  var old = $('out');
  var c = document.createElement('canvas');
  c.id = 'out';
  c.width = W; c.height = H;
  if (old) {
    c.style.cssText = old.style.cssText;
    old.parentNode && old.parentNode.replaceChild(c, old);
  } else {
    $('wrap').appendChild(c);
  }
  window.__outCanvas = c;
  var stream = c.captureStream(15);
  var mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].filter(function (m) { return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m); })[0] || '';
  rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 3500000 });
  chunks = [];
  rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  recording = true;
}
function stopRec() {
  return new Promise(function (res) {
    if (!rec) { res(null); return; }
    rec.onstop = function () {
      var blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' });
      rec = null; recording = false; res(blob);
    };
    rec.stop();
  });
}

/* ---------- 绘制 ---------- */
var W = 990, H = 1650, GAP = 8;
var aOp = '', bOp = '', aSub = '', bSub = '', topProg = '', topPhase = '';
function drawText(ctx, text, x, y, size, color, bold, align) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px system-ui,"PingFang SC",sans-serif';
  ctx.fillStyle = color || '#e5e9f0';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}
function drawPill(ctx, x, y, w, h, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
}
async function shot(win) {
  if (!window.html2canvas) return null;
  try {
    var doc = win.document;
    var w = win.innerWidth, h = win.innerHeight;
    // Rasterize SVG node icons with the browser before html2canvas handles the
    // cloned DOM. Its SVG image sizing can crop viewBox-only resources.
    var mapIcons = Array.from(doc.querySelectorAll('.dg-node > img')).map(function (img) {
      if (!img.complete || !img.naturalWidth) return null;
      var width = img.clientWidth, height = img.clientHeight;
      if (!width || !height) return null;
      var canvas = doc.createElement('canvas');
      canvas.width = width * 2; canvas.height = height * 2;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return { canvas: canvas, width: width, height: height };
    });
    var mapLocks = await Promise.all(Array.from(doc.querySelectorAll('.dg-node-lock')).map(function (svg) {
      return new Promise(function (resolve) {
        var image = new Image(), width = svg.clientWidth, height = svg.clientHeight;
        var xml = new XMLSerializer().serializeToString(svg).replace(/currentColor/g, win.getComputedStyle(svg).color);
        image.onload = function () {
          var canvas = doc.createElement('canvas'); canvas.width = width * 2; canvas.height = height * 2;
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas);
        };
        image.onerror = function () { resolve(null); };
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      });
    }));
    /* 只截视口 + scale 1.0：大幅提速（帧率↑ = 不闪） */
    var cv = await html2canvas(doc.documentElement, {
      backgroundColor: '#0d1226', scale: 1.0, logging: false, useCORS: true,
      width: w, height: h, windowWidth: w, windowHeight: h,
      onclone: function (clone) {
        clone.querySelectorAll('.dg-node-lock').forEach(function (svg, i) {
          var source = mapLocks[i]; if (!source) return;
          var canvas = clone.createElement('canvas'); canvas.className = 'dg-node-lock';
          canvas.width = source.width; canvas.height = source.height;
          canvas.getContext('2d').drawImage(source, 0, 0); svg.replaceWith(canvas);
        });
        clone.querySelectorAll('.dg-node > img').forEach(function (img, i) {
          var item = mapIcons[i]; if (!item) return;
          var canvas = clone.createElement('canvas');
          canvas.width = item.canvas.width; canvas.height = item.canvas.height;
          canvas.style.cssText = 'display:block;flex:none;width:' + item.width + 'px;height:' + item.height + 'px;pointer-events:none;opacity:' + (img.parentElement.classList.contains('blocked') ? '.57' : '1');
          canvas.getContext('2d').drawImage(item.canvas, 0, 0);
          img.replaceWith(canvas);
        });
      }
    });
    return cv;
  } catch (e) { return null; }
}
async function drawOnce(mode) {
  var c = window.__outCanvas || $('out'), ctx = c.getContext('2d');
  try { window.__lastDraw = Date.now(); window.__frameCount = (window.__frameCount || 0) + 1; } catch (e) {}
  /* 关键：先截完两个画面（并行），再一次性画完整帧 —— 避免每帧之间长时间停留在半成品画布造成闪烁 */
  var shots = await Promise.all([shot(A()), shot(B())]);
  var pa = shots[0], pb = shots[1];
  ctx.fillStyle = '#0b0f1a'; ctx.fillRect(0, 0, W, H);  // 顶部指标
  ctx.fillStyle = '#111a33'; ctx.fillRect(0, 0, W, 120);
  drawText(ctx, modeName(mode), 24, 40, 30, '#8ab4ff', true);
  var cnt = countdown(mode);
  drawText(ctx, cnt, W / 2, 40, 36, '#f1f5f9', true, 'center');
  drawText(ctx, topProg, W - 24, 36, 26, '#4ade80', true, 'right');
  drawText(ctx, topPhase, W - 24, 82, 22, '#cbd5e1', false, 'right');
  drawText(ctx, 'RoomLab 自动试玩 · ' + modeName(mode) + ' · 双端同屏', 24, 88, 20, '#64748b', false);
  // 游戏画面
  drawScreen(ctx, pa, 0, 495, 'A', '现场 / 操作台', mode);
  drawScreen(ctx, pb, 495, 495, 'B', '手册 / 加入端', mode);
  // 底部操作指示
  ctx.fillStyle = '#111a33'; ctx.fillRect(0, H - 140, W, 140);
  ctx.fillStyle = '#1e2740'; ctx.fillRect(W / 2 - 1, H - 140, 2, 140);
  drawOpPanel(ctx, 0, 'A', aOp, aSub);
  drawOpPanel(ctx, 495, 'B', bOp, bSub);
}
function drawScreen(ctx, cv, x0, w, role, tag, mode) {
  var y0 = 130, y1 = H - 150;
  ctx.fillStyle = '#0d1226'; ctx.fillRect(x0, y0, w, y1 - y0);
  if (cv) {
    var s = Math.min(w / cv.width, (y1 - y0) / cv.height);
    var dw = cv.width * s, dh = cv.height * s;
    ctx.drawImage(cv, x0 + (w - dw) / 2, y0 + ((y1 - y0) - dh) / 2, dw, dh);
  } else {
    drawText(ctx, role + ' 画面渲染失败（html2canvas 不可用）', x0 + 20, y0 + (y1 - y0) / 2, 24, '#94a3b8', true);
  }
  ctx.fillStyle = 'rgba(11,15,26,.78)'; ctx.fillRect(x0, y0, w, 34);
  drawText(ctx, role + ' · ' + tag, x0 + 14, y0 + 17, 20, role === 'A' ? '#60a5fa' : '#fb923c', true);
}
function drawOpPanel(ctx, x0, role, op, sub) {
  var y0 = H - 140, y1 = H;
  var on = op && op.indexOf('·') < 0 ? op !== '—' && op !== '松开' && op !== '等待' : true;
  var green = op && op.indexOf('按住') >= 0;
  ctx.beginPath(); ctx.arc(x0 + 52, y0 + 38, 22, 0, Math.PI * 2);
  ctx.fillStyle = green ? '#22c55e' : (on ? '#f59e0b' : '#334155');
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  drawText(ctx, role + ' 操作', x0 + 14, y0 + 92, 22, role === 'A' ? '#60a5fa' : '#fb923c', true);
  drawText(ctx, op || '—', x0 + 92, y0 + 38, 32, '#f8fafc', true);
  drawText(ctx, sub || '', x0 + 92, y0 + 92, 22, '#cbd5e1', false);
}
function modeName(id) { var m = MODES.find(function (x) { return x.id === id; }); return m ? m.name : id; }

/* ---------- 指标读取 ---------- */
function countdown(mode) {
  var w = A();
  try {
    if (mode === 'dungeon') {
      var wm0 = w.S && w.S.mod;
      if (wm0 && wm0 !== 'dungeon') return countdown(wm0);
      return '🗺 地图';
    }
    if (mode === 'pressure') { var rt = w.RT; if (rt) return Math.max(0, Math.ceil(rt.time)) + 's'; }
    if (mode === 'boss') {
      var bo = w.BossMobile && w.BossMobile.state();
      if (bo) return bo.done ? '—' : (bo.phase === 'attack' || bo.phase === 'defense' || bo.phase === 'ready') && bo.left != null ? Math.max(0, Math.ceil(bo.left)) + 's' : '—';
    }
    if (['lookback', 'caller', 'shadow'].indexOf(mode) >= 0) { var v = w.RoomLabExpansion && w.RoomLabExpansion.view; if (v) return Math.max(0, Math.ceil(v.time)) + 's'; }
    if (mode === 'vault') { var vs = w.VaultMobile && w.VaultMobile.state(); if (vs) return vs.time == null ? '—' : Math.max(0, Math.ceil(vs.time)) + 's'; }
    if (mode === 'wires') {
      var ws = w.WiresMobile && w.WiresMobile.state();
      if (ws) return ws.done ? '—' : ws.rescue ? '救场' : (!ws.ready.A || !ws.ready.B) ? '—' : Math.max(0, Math.ceil(ws.time)) + 's';
    }
    if (w.S && w.S.time != null) return Math.max(0, Math.ceil(w.S.time)) + 's';
  } catch (e) {}
  return '--s';
}
function readProg(mode) {
  var wa = A(), wb = B();
  try {
    if (mode === 'dungeon') {
      var D0 = wa.DUNGEON;
      if (!D0) return '';
      var d0 = 0; D0.nodes.forEach(function (x) { if (x.done && x.type === 'event') d0++; });
      return '生命 ' + D0.hp + ' / ' + D0.maxHp + ' · 通关 ' + d0 + ' 关';
    }
    switch (mode) {
      case 'catch': if (wa._host) return '物资 ' + wa._host.score + ' / 20';
      case 'shield': var sg = wb._guestTwinState; if (sg) return '能量 ' + sg.energy + ' / ' + sg.goal; break;
      case 'beam': var bg = wb.BeamMobile && wb.BeamMobile.state(); if (bg) return '入库 ' + bg.got + ' / ' + bg.goal; break;
      case 'beat': if (wa._host) return '节拍 ' + wa._host.score + ' / 30'; break;
      case 'pressure': var pr = wa.RT; if (pr) return '稳压 ' + pr.seals + ' / 3'; break;
      case 'boss': var br = wa.BossMobile && wa.BossMobile.state(); if (br) return '拆机 ' + (6 - br.armor.reduce(function (a, b) { return a + b; }, 0)) + ' / 6 · 护盾 ' + br.hp + ' / 5'; break;
      case 'lockbox': case 'silhouette': case 'evidence': case 'mirrors': { var pp = wa.PuzzlePack && wa.PuzzlePack.state(); if (pp) return mode === 'lockbox' ? '机关层 ' + Math.min(3, pp.stage + 1) + ' / 3' : '进度 ' + pp.level + ' / 3'; break; }
      case 'dial': var rd = wa.RadioMobile && wa.RadioMobile.state(); if (rd) return '情报 ' + rd.got + ' / 3'; break;
      case 'wires': var wr = wa.WiresMobile && wa.WiresMobile.state(); if (wr) return '拆线 ' + Math.min(3, wr.round) + ' / 3'; break;
      case 'vault': var vt = wa.VaultMobile && wa.VaultMobile.state(); if (vt) return vt.cfg.count + ' 位 · 机会 ' + vt.left + ' / ' + vt.cfg.chances; break;
      case 'maze': if (wa.MAZE && wa.MAZE.path && wa.MAZE.path[0]) return '进度 ' + mazeStep + ' / ' + wa.MAZE.path[0].length; break;
      case 'code': if (wa._codeSyms) return '暗号 ' + codeIdx + ' / 4'; break;
      case 'lookback': case 'caller': case 'shadow':
        var v = wa.RoomLabExpansion && wa.RoomLabExpansion.view;
        if (v) return '进度 ' + v.completed + ' / ' + (mode === 'shadow' ? 2 : 5);
    }
  } catch (e) {}
  return '';
}
function readPhase(mode) {
  var wa = A(), wb = B();
  try {
    if (mode === 'dungeon') {
      var wm1 = wa.S && wa.S.mod;
      if (wm1 && wm1 !== 'dungeon') return readPhase(wm1);
      var dm = DOC(wa).getElementById('dgmsg');
      if (dm && dm.textContent) return dm.textContent;
      return '双人行动路线';
    }
    if (mode === 'pressure') { var rt = wa.RT; if (rt && rt.msg && rt.msg.txt) return rt.msg.txt; }
    if (['lookback', 'caller', 'shadow'].indexOf(mode) >= 0) { var v = wa.RoomLabExpansion && wa.RoomLabExpansion.view; if (v && v.message) return v.message; }
    var m = DOC(wa).getElementById('msg'); if (m && m.textContent) return m.textContent;
    var xm = DOC(wa).getElementById('x-message'); if (xm && xm.textContent) return xm.textContent;
  } catch (e) {}
  return '';
}
function readMsg(which, mode) {
  var w = which === 'A' ? A() : B();
  try {
    if (['lookback', 'caller', 'shadow'].indexOf(mode) >= 0) {
      var xm = DOC(w).getElementById('x-message'); if (xm && xm.textContent) return xm.textContent;
    }
    var m = DOC(w).getElementById('msg'); if (m && m.textContent) return m.textContent;
  } catch (e) {}
  return '';
}

/* ---------- 结束检测 ---------- */
function isDone(mode) {
  var w = A();
  try {
    if (w._dead) return true;
    var fb = w.document.getElementById('fb-box');
    if (fb && fb.offsetParent !== null) return true;
    if (mode === 'boss' || mode === 'pressure') { if (w.RT && w.RT.done) return true; }
    if (mode === 'beam') { var bs = w.BeamMobile && w.BeamMobile.state(); if (bs && bs.done) return true; }
    if (mode === 'dial') { var rs = w.RadioMobile && w.RadioMobile.state(); if (rs && rs.done) return true; }
    if (mode === 'boss') { var bs3 = w.BossMobile && w.BossMobile.state(); if (bs3 && bs3.done) return true; }
    if (mode === 'wires') { var ws2 = w.WiresMobile && w.WiresMobile.state(); if (ws2 && ws2.done) return true; }
    if (mode === 'vault') { var vs2 = w.VaultMobile && w.VaultMobile.state(); if (vs2 && vs2.done) return true; }
    if (['lockbox', 'silhouette', 'evidence', 'mirrors'].indexOf(mode) >= 0) { var ps = w.PuzzlePack && w.PuzzlePack.state(); if (ps && ps.done) return true; }
    if (mode === 'dungeon') {
      var D = w.DUNGEON;
      if (D) {
        var dn = 0; D.nodes.forEach(function (x) { if (x.done && x.type === 'event') dn++; });
        if (dn >= 2 || D.over) return true;
      }
    }
    if (['lookback', 'caller', 'shadow'].indexOf(mode) >= 0) { var v = w.RoomLabExpansion && w.RoomLabExpansion.view; if (v && v.done) return true; }
  } catch (e) {}
  return false;
}

/* ================== 驱动器 ================== */
var driveState = {};
function resetDrivers() {
  driveState = {
    mazeStep: 1, mazeLast: 0,
    dialLast: 0, dialLocked: false,
    wiresStep: 0, wiresRem: null,
    codeIdx: 0, codeLast: 0,
    vaultPos: 0, vaultFilled: 0, vaultSub: false,
    beatLast: 0,
    bossHold: {}, bossSeq: { A: 0, B: 0 }, bossLast: 0,
    pressSeq: { A: 0, B: 0 }, pressLast: 0,
    expReady: { A: false, B: false }, expPrac: { A: false, B: false }, expActionLast: 0,
    inL: false, inR: false, lastSend: 0,
    holdA: false, holdB: false, catchT: null,
    radioA: 0, radioB: 0,
    wiresRound: -1, wiresSel: null, wiresClicked: false, wiresDemo: false, wiresHold: false, wiresBypass: false,
    wiresLast: 0, wiresHoldAt: 0,
    bossRound: -1, bossActed: false, bossActAt: 0,
    vaultIdx: -1, vaultPending: null, vaultFocus: -1,
    dgTarget: null, dgBAt: 0, dgInGame: false, dgStartAt: 0,
    callerQ: 0, shadowLast: 0, ppLast: 0
  };
  aOp = ''; bOp = ''; aSub = ''; bSub = '';
}
function drive(mode) {
  try {
    aSub = readMsg('A', mode); bSub = readMsg('B', mode);
    topProg = readProg(mode); topPhase = readPhase(mode);
    switch (mode) {
      case 'maze': driveMaze(); break;
      case 'dial': driveDial(); break;
      case 'wires': driveWires(); break;
      case 'code': driveCode(); break;
      case 'vault': driveVault(); break;
      case 'catch': driveCatch(); break;
      case 'shield': driveShield(); break;
      case 'beam': driveBeam(); break;
      case 'beat': driveBeat(); break;
      case 'pressure': drivePressure(); break;
      case 'boss': driveBoss(); break;
      case 'lookback': driveLookback(); break;
      case 'caller': driveCaller(); break;
      case 'shadow': driveShadow(); break;
      case 'lockbox': case 'silhouette': case 'evidence': case 'mirrors': drivePuzzle(mode); break;
      case 'dungeon': {
        try {
          /* coop「行动准备」面板：双方各点一次准备好了 */
          var ca = DOC(A()).querySelector('#coop-work button');
          if (ca && !ca.disabled) ca.click();
          var cb = DOC(B()).querySelector('#coop-work button');
          if (cb && !cb.disabled) cb.click();
          var wmR = A().S && A().S.mod;
          if (wmR === 'beam' || wmR === 'wires' || wmR === 'boss') {
            var sel2 = wmR === 'beam' ? '#bm-ready' : wmR === 'wires' ? '#wm-ready' : '#mb-ready';
            var ra2 = DOC(A()).querySelector(sel2); if (ra2 && !ra2.hidden && !ra2.disabled) ra2.click();
            var rb2 = DOC(B()).querySelector(sel2); if (rb2 && !rb2.hidden && !rb2.disabled) rb2.click();
          }
          if (wmR === 'dial') {
            var rsd = A().RadioMobile && A().RadioMobile.state();
            if (rsd && !rsd.ready.A) {
              [A(), B()].forEach(function (w) {
                try { w.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); w.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' })); } catch (e) {}
                var rr = DOC(w).getElementById('radio-ready'); if (rr && !rr.hidden && !rr.disabled) rr.click();
              });
            }
          }
        } catch (e) {}
        var wmD = A().S && A().S.mod;
        if (wmD && wmD !== 'dungeon') drive(wmD);
        else driveDungeon();
        break;
      }
    }
  } catch (e) { /* 单帧驱动异常忽略 */ }
}
function clickX(win, key) {
  var b = DOC(win).querySelector('#x-actions [data-x="' + key + '"]');
  if (b && !b.disabled) b.click();
}
function sendIn2R(v) {
  var wb = B();
  try { if (wb.PEER && wb.PEER.conn && wb.PEER.conn.open) wb.PEER.conn.send({ t: 'in2', which: 'r', v: v ? 1 : 0 }); } catch (e) {}
}

/* maze 新版：B 地图只有阀门位置无路线；A 沿路走到阀门，报现场符号，B 查表开蓝/橙/绿阀 */
function driveMaze() {
  var wa = A(), now = Date.now();
  if (now - driveState.mazeLast < 420) return;
  driveState.mazeLast = now;
  var route = wa.MAZE && wa.MAZE.path && wa.MAZE.path[0];
  if (!route) return;
  var seed = wa._mazeSeed != null ? wa._mazeSeed : 0;
  var tabs = DOC(B()).querySelectorAll('.mz-tab');
  if (tabs.length) {
    var on = DOC(B()).querySelector('.mz-tab.on');
    if (!on || +on.dataset.mz !== seed) { tabs[seed] && tabs[seed].click(); }
  }
  /* 阀门面板打开：读现场符号，按 B 的对照表开阀 */
  var panel = DOC(wa).getElementById('maze-valve');
  if (panel && !panel.hidden) {
    var syms = ['○', '△', '□', '⊕', '◇', '☆'];
    var ans = [0, 1, 2, 2, 0, 1];
    var clue = DOC(wa).getElementById('maze-valve-clue');
    var txt = clue ? clue.textContent : '';
    var si = -1;
    syms.forEach(function (sy, i) { if (si < 0 && txt.indexOf(sy) >= 0) si = i; });
    if (si >= 0) {
      var vb = panel.querySelector('[data-valve="' + ans[si] + '"]');
      if (vb) { vb.click(); aOp = '🔧 符号「' + syms[si] + '」→ 开' + ['蓝阀', '橙阀', '绿阀'][ans[si]]; bOp = 'B · 查表：选' + ['蓝阀', '橙阀', '绿阀'][ans[si]]; }
    }
    return;
  }
  if (driveState.mazeStep >= route.length) { aOp = '到达出口'; bOp = 'B · 出口确认'; return; }
  var cur = route[driveState.mazeStep - 1].split(',').map(Number);
  var nxt = route[driveState.mazeStep].split(',').map(Number);
  var dr = nxt[0] - cur[0], dc = nxt[1] - cur[1];
  var dirTxt = dr < 0 ? '↑ 向上' : dr > 0 ? '↓ 向下' : dc < 0 ? '← 向左' : '→ 向右';
  if (dr || dc) wa._mazeMove(dr, dc);
  /* 走到阀门格会被挡下并弹出行板——此时不推进步数 */
  var p2 = DOC(wa).getElementById('maze-valve');
  if (p2 && !p2.hidden) { aOp = '遇到阀门！报现场符号给 B…'; bOp = 'B · 准备查表'; return; }
  driveState.mazeStep++;
  aOp = '移动 ' + dirTxt + '（' + driveState.mazeStep + ' / ' + route.length + '）';
  bOp = 'B · 规划路线避陷阱';
}

/* dial 双人搜台：A 调频率、B 调增益，两端都对准并保持 2 秒收录一段情报 */
function radioDir(wantA, wantB) {
  var set = function (win, want, prop) {
    var cur = driveState[prop];
    if (want === cur) return;
    try {
      if (cur !== 0) win.dispatchEvent(new KeyboardEvent('keyup', { key: cur > 0 ? 'ArrowRight' : 'ArrowLeft' }));
      if (want !== 0) win.dispatchEvent(new KeyboardEvent('keydown', { key: want > 0 ? 'ArrowRight' : 'ArrowLeft' }));
    } catch (e) {}
    driveState[prop] = want;
  };
  set(A(), wantA, 'radioA');
  set(B(), wantB, 'radioB');
}
function driveDial() {
  var wa = A();
  var s = wa.RadioMobile && wa.RadioMobile.state();
  if (!s || s.done) {
    radioDir(0, 0);
    aOp = s && s.done ? (s.win ? '✔ 三段情报收录完成！' : '本轮结束') : '等待'; bOp = aOp;
    return;
  }
  if (!s.ready.A || !s.ready.B || s.cd > 0) { aOp = '准备 / 倒计时中'; bOp = '准备 / 倒计时中'; return; }
  var tf = s.tf + (s.got === 1 ? Math.sin(s.phase * .5) * 7 : 0);
  var wantA = s.f < tf - 2 ? 1 : s.f > tf + 2 ? -1 : 0;
  var wantB = s.g < s.tg - 2.5 ? 1 : s.g > s.tg + 2.5 ? -1 : 0;
  radioDir(wantA, wantB);
  aOp = wantA > 0 ? '＋ 升高频率（' + (88 + s.f * .2).toFixed(1) + ' MHz）' : wantA < 0 ? '－ 降低频率（' + (88 + s.f * .2).toFixed(1) + ' MHz）' : '✔ 频率对准，保持住';
  bOp = wantB > 0 ? '＋ 增益调高' : wantB < 0 ? '－ 增益调低' : '✔ 增益对准，保持住';
}

/* wires 警报拆线：首刀故意剪错演示旁路救场，随后按 B 规则正确剪三刀 */
function driveWires() {
  var wa = A(), wb = B();
  var s = wa.WiresMobile && wa.WiresMobile.state();
  if (!s || s.done) {
    pressKey(wa, false);
    aOp = s && s.done ? (s.win ? '✔ 拆线成功，警报解除！' : '本轮结束') : '等待'; bOp = aOp;
    return;
  }
  if (!s.ready.A || !s.ready.B || s.cd > 0) { aOp = '阅读职责 / 准备中'; bOp = aOp; return; }
  if (s.round !== driveState.wiresRound) {
    driveState.wiresRound = s.round;
    driveState.wiresSel = null; driveState.wiresClicked = false; driveState.wiresBypass = false;
  }
  if (s.rescue) {
    /* 救场：A 按住断路开关（空格）报符号，B 听清后点同形旁路；节奏放慢便于看清 */
    if (!driveState.wiresHold) { pressKey(wa, true); driveState.wiresHold = true; driveState.wiresHoldAt = Date.now(); }
    driveState.wiresClicked = false; driveState.wiresSel = null;
    aOp = '⚠ 按住断路开关 · 报符号「' + s.rescue.symbol + '」';
    bOp = '⚠ 听到符号「' + s.rescue.symbol + '」，准备选同形旁路';
    var bs = wb.WiresMobile && wb.WiresMobile.state();
    if (bs && bs.rescue && bs.rescue.held && !driveState.wiresBypass && Date.now() - driveState.wiresHoldAt > 1800) {
      var sym = DOC(wb).querySelector('[data-symbol="' + s.rescue.symbol + '"]');
      if (sym) { sym.click(); driveState.wiresBypass = true; bOp = '✔ 旁路 ' + s.rescue.symbol + ' 接通'; }
    }
    return;
  }
  if (driveState.wiresHold) { pressKey(wa, false); driveState.wiresHold = false; }
  var correct = wa.WiresMobile.target(s);
  var wireId = correct;
  if (!driveState.wiresDemo) {
    /* 演示：第一刀故意剪错，触发 8 秒协作救场 */
    var wrong = null;
    s.wires.forEach(function (w) { if (!w.cut && w.id !== correct && wrong === null) wrong = w.id; });
    if (wrong != null) { wireId = wrong; driveState.wiresDemo = true; aOp = '✖ 听错剪了 ' + wrong + ' 号线…'; bOp = 'B · 短路了！准备救场'; }
  }
  if (!driveState.wiresClicked) {
    var now = Date.now();
    if (now - (driveState.wiresLast || 0) < 1300) return;
    var sel = DOC(wa).querySelector('[data-wire="' + wireId + '"]');
    if (sel && !sel.disabled) {
      sel.click(); driveState.wiresSel = wireId;
      var cut = DOC(wa).getElementById('wm-cut');
      if (cut && !cut.disabled) { cut.click(); driveState.wiresClicked = true; driveState.wiresLast = now; if (wireId === correct) { aOp = '✂ 剪断 ' + wireId + ' 号线'; bOp = 'B · 报线号 ' + wireId; } }
    }
  }
  if (!aOp) { aOp = 'B 报线号中…'; bOp = 'B · 按规则报线号'; }
}

/* vault 档案窃取：A 扫描报位，B 记录，扫描结束核对提交 */
function driveVault() {
  var wa = A(), wb = B();
  var s = wa.VaultMobile && wa.VaultMobile.state();
  if (!s || s.done) { aOp = s && s.done ? (s.win ? '✔ 档案解锁，机密到手！' : '本轮结束') : '等待'; bOp = aOp; return; }
  if (s.phase === 'read') {
    var st = DOC(wa).getElementById('vm-start');
    if (st) { st.click(); aOp = 'A · 开始扫描'; bOp = 'B · 准备记录'; }
    return;
  }
  var flash = s.cfg.flash || 1.2;
  if (s.phase === 'show') {
    var i = Math.min(s.cfg.count - 1, Math.floor(s.elapsed / flash));
    if (i !== driveState.vaultIdx) {
      driveState.vaultIdx = i;
      var idx = s.order[i];
      driveState.vaultPending = { idx: idx, want: String(s.answer[idx]) };
      aOp = 'A · 观察并描述';
      bOp = 'B · 听同伴记录';
    }
  }
  /* B 把最近报的一位记到对应格子（按期望值校验，占位符字符不限） */
  var p = driveState.vaultPending;
  if (p) {
    var slot = DOC(wb).querySelector('.vm-slot[data-i="' + p.idx + '"]');
    if (slot) {
      var curTxt = slot.querySelector('strong').textContent;
      if (curTxt !== p.want) {
        slot.click();
        var nx = p.want.charAt(!curTxt || curTxt === '—' || curTxt === '·' ? 0 : curTxt.length);
        if (nx) wb.dispatchEvent(new KeyboardEvent('keydown', { key: nx.toLowerCase() }));
        return;
      }
      driveState.vaultPending = null;
    }
  }
  if (s.phase === 'write') {
    /* 扫描结束：补齐漏记位（逐字符），然后提交 */
    var slots = DOC(wb).querySelectorAll('.vm-slot');
    for (var k = 0; k < slots.length; k++) {
      var sl = slots[k], i2 = +sl.dataset.i, want2 = String(s.answer[i2]);
      var cur2 = sl.querySelector('strong').textContent;
      if (cur2 !== want2) {
        sl.click();
        var nx2 = want2.charAt(!cur2 || cur2 === '—' || cur2 === '·' ? 0 : cur2.length);
        if (nx2) wb.dispatchEvent(new KeyboardEvent('keydown', { key: nx2.toLowerCase() }));
        aOp = 'A · 核对记录'; bOp = 'B · 补记录';
        return;
      }
    }
    var sub = DOC(wb).getElementById('vm-submit');
    if (sub && !sub.disabled) { sub.click(); aOp = 'A · 等 B 提交'; bOp = 'B · 核对完毕，提交！'; }
    else { aOp = 'A · 等待 B 提交'; bOp = 'B · 核对中'; }
  }
}

/* code：A 看符号直接输入正确数字（演示信息传递过程） */
function driveCode() {
  var wa = A();
  if (!wa._codeSyms) return;
  var now = Date.now();
  if (now - driveState.codeLast < 800) return;
  driveState.codeLast = now;
  if (driveState.codeIdx >= 4) { aOp = '✔ 暗号输入完成'; return; }
  wa._codeIn(wa._codeSyms[driveState.codeIdx]);
  driveState.codeIdx++;
  aOp = '⌨ 输入第 ' + driveState.codeIdx + ' 位数字';
  bOp = 'B · 查符号表报数字';
}

/* catch：A 左移 / B 右移，合力接物（catch 引擎读 PEER.gdir，B 必须走 t:'in' 通道）
   策略：锁定一个「来得及接住」的最低好物直到接住，避免左右摇摆；坏物逼近才躲 */
function driveCatch() {
  var wa = A();
  var h = wa._host;
  if (!h || !h.items) return;
  var fbEl = DOC(wa).getElementById('fb');
  if (fbEl && fbEl.style.display === 'flex') { setIn('A', false); setIn('B', false); driveState.catchT = null; aOp = '✔ 完成'; bOp = '✔ 完成'; return; }
  var px = h.px, BOT = 350, SPEED = 105;
  var tland = function (it) {
    var vy = it.vy || 0.5;
    return Math.max(0.25, (BOT - it.y) / (Math.max(0.4, (vy + 3.2) / 2) * 60));
  };
  /* 目标粘性：接住（离列表）或确认来不及才换目标 */
  var tgt = driveState.catchT;
  if (tgt && (h.items.indexOf(tgt) < 0 || tgt.type === 'bad')) tgt = driveState.catchT = null;
  if (tgt && Math.abs(tgt.x - px) > SPEED * tland(tgt) + 42) tgt = driveState.catchT = null;
  if (!tgt) {
    var goods = h.items.filter(function (it) { return it.type !== 'bad'; });
    goods.sort(function (a, b) { return b.y - a.y; });
    for (var i = 0; i < goods.length; i++) {
      if (Math.abs(goods[i].x - px) <= SPEED * tland(goods[i]) + 16) { tgt = goods[i]; driveState.catchT = tgt; break; }
    }
    if (!tgt && goods.length) { tgt = goods[0]; driveState.catchT = tgt; }
  }
  /* 威胁：坏物即将落进篮子才躲 */
  var L = false, R = false, dodging = false;
  h.items.forEach(function (it) {
    if (it.type !== 'bad' || dodging) return;
    if (tland(it) < 0.85 && Math.abs(it.x - px) < 50) {
      dodging = true;
      if (it.x < px) { R = true; aOp = '—'; bOp = '▶ 躲开红色坏物！'; }
      else { L = true; aOp = '◀ 躲开红色坏物！'; bOp = '—'; }
    }
  });
  if (dodging) { setIn('A', L); setIn('B', R); return; }
  if (tgt) {
    var label = tgt.type === 'gold' ? '接金箱 +2' : '接好物';
    if (tgt.x < px - 7) { L = true; aOp = '◀ ' + label; bOp = '—'; }
    else if (tgt.x > px + 7) { R = true; aOp = '—'; bOp = '▶ ' + label; }
    else { aOp = '接住！'; bOp = '接住！'; }
  } else { aOp = '等待物资'; bOp = '等待物资'; }
  setIn('A', L); setIn('B', R);
}
function setIn(role, v) {
  var w = role === 'A' ? A() : B();
  if (role === 'A') w._inL = !!v; else { try { if (w.PEER && w.PEER.conn && w.PEER.conn.open) w.PEER.conn.send({ t: 'in', v: v ? 1 : 0 }); } catch (e) {} }
}

/* shield：A/B 各挡半区陨石 */
function driveShield() {
  var wb = B(), st = wb._guestTwinState;
  if (!st) return;
  if (driveState.shieldMiss == null) driveState.shieldMiss = 0;
  var rocks = st.rocks || [];
  /* 演示：故意漏接前 2 块，展示“接不住 → 护盾被打”的紧张感 */
  if (driveState.shieldMiss < 2) {
    setIn('A', false); sendIn2R(false);
    var hit = rocks.filter(function (r) { return r.y > 400; });
    if (hit.length) { driveState.shieldMiss++; }
    aOp = '反应慢了！（漏接 ' + driveState.shieldMiss + '/2 演示）'; bOp = '—';
    return;
  }
  var best = null;
  rocks.forEach(function (r) { if (!best || r.y > best.y) best = r; });
  if (!best) { setIn('A', false); sendIn2R(false); aOp = '待命'; bOp = '待命'; return; }
  var left = best.x < 170;
  setIn('A', left); sendIn2R(!left);
  if (left) { aOp = '🛡 左护盾抬起挡陨石'; bOp = '—'; }
  else { aOp = '—'; bOp = '🛡 右护盾抬起挡陨石'; }
}

/* beam 手游模块：用真实键盘事件驱动（空格 = 按住）；监听在 window 上，必须直接派发到 window */
function pressKey(win, down) {
  try { win.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: ' ' })); } catch (e) {}
}
function mobileHold(wantA, wantB) {
  if (driveState.holdA !== wantA) { pressKey(A(), wantA); driveState.holdA = wantA; }
  if (driveState.holdB !== wantB) { pressKey(B(), wantB); driveState.holdB = wantB; }
}

/* beam 新物理：6 种货物单件投放（标准/重/玻璃/圆筒），中央±23 放平保持 0.5 秒入库
   控制：远距冲刺到该货物安全倾角上限 → 松手靠滑行接近 → 近距小倾角脉冲微调 → 放平入库 */
function driveBeam() {
  var wa = A();
  var s = wa.BeamMobile && wa.BeamMobile.state();
  if (!s || s.done) {
    mobileHold(false, false);
    aOp = s && s.done ? (s.win ? '✔ 六件货物安全入库！' : '本轮结束') : '等待'; bOp = aOp;
    return;
  }
  if (!s.ready.A || !s.ready.B || s.cd > 0) { aOp = '准备 / 倒计时中'; bOp = '准备 / 倒计时中'; return; }
  if (s.rescue) { mobileHold(true, true); aOp = '⚠ 快掉了！双方按住救场'; bOp = aOp; return; }
  var b = s.bricks[0];
  if (!b) { mobileHold(false, false); aOp = '等待下一件货物'; bOp = aOp; return; }
  if (!b.on) { mobileHold(false, false); aOp = '放平接住 · 第 ' + (s.got + 1) + ' 件'; bOp = aOp; return; }
  var glass = b.type === 2 || b.type === 5;
  var heavy = b.type === 1 || b.type === 4;
  var tube = b.type === 3;
  /* 按货物滚动系数 k 反推“滑到中央所需倾角”：roll ≈ k·T²；近距用脉冲小倾角微调 */
  var k = glass ? 0.01296 : heavy ? 0.00805 : tube ? 0.02056 : 0.0134;
  var hardCap = glass ? 62 : heavy ? 115 : tube ? 60 : 110;
  var pulseT = glass ? 30 : heavy ? 45 : tube ? 30 : 26;
  var tilt = s.yR - s.yL, at = Math.abs(tilt);
  var dx = b.x - 170, adx = Math.abs(dx);
  var cname = glass ? '玻璃箱' : heavy ? '重箱' : tube ? '圆筒' : '标准箱';
  if (adx <= 23 && at <= 22) {
    mobileHold(false, false);
    aOp = '⏳ 放平保持 ' + Math.max(0, .5 - (b.charge || 0)).toFixed(1) + 's 入库'; bOp = aOp;
    return;
  }
  var cap = Math.min(hardCap, Math.max(pulseT, Math.sqrt(adx / k)));
  var moving = at >= 4;
  var towardCenter = (dx < 0 && tilt > 0) || (dx > 0 && tilt < 0);
  var release = (adx <= 10) || (at >= cap) || (moving && !towardCenter);
  if (release) { mobileHold(false, false); aOp = '松手滑行 · ' + cname + ' 距中央 ' + adx.toFixed(0); bOp = aOp; return; }
  var warn = glass && b.stress > .1 ? ' ⚠ 玻璃在响！' : '';
  if (dx < 0) { mobileHold(true, false); aOp = '↷ 抬左端搬' + cname + '（倾角 ' + at.toFixed(0) + '）' + warn; bOp = '—'; }
  else { mobileHold(false, true); aOp = '↶ 抬右端搬' + cname + '（倾角 ' + at.toFixed(0) + '）' + warn; bOp = '—'; }
}

/* beat：A 按蓝 / B 按橙 / AB 同按 */
function driveBeat() {
  var wa = A(), now = Date.now();
  if (now - driveState.beatLast < 130) return;
  driveState.beatLast = now;
  var notes = wa._host && wa._host.notes;
  if (!notes) return;
  var best = null;
  notes.forEach(function (n) {
    if (n.hit) return;
    if (n.x >= 48 && n.x <= 92) { if (!best || Math.abs(n.x - 70) < Math.abs(best.x - 70)) best = n; }
  });
  if (!best) return;
  if (best.type === 'A') { wa._hostBeatPress('A'); aOp = '♫ 按蓝音符'; bOp = '—'; }
  else if (best.type === 'B') { wa._hostBeatPress('B'); aOp = '—'; bOp = '♫ 按橙音符'; }
  else { wa._hostBeatPress('A'); wa._hostBeatPress('B'); aOp = '♫ 双按'; bOp = '♫ 双按'; }
}

/* RT 通用输入 */
function rtSend(who, key, v, tap, mode) {
  var wa = A();
  var s = wa.RT; if (!s) return;
  var seq = ++driveState.pressSeq[who];
  var packet = { t: 'rtInput', id: s.id, mode: mode, seq: seq, key: key, v: !!v, tap: !!tap, round: s.round };
  if (who === 'A') wa.realtimeInput(packet, 'A');
  else { var wb = B(); try { wb.netSend(packet); } catch (e) {} }
}

/* pressure：A 调压到 B 的安全区间，B 开阀校准 */
function drivePressure() {
  var wa = A(), s = wa.RT, wb = B(), v = wb.RT_VIEW;
  if (!s || !v || s.done) return;
  var lo = v.lo, hi = v.hi, val = s.val;
  var up = val < lo + 1.5, down = val > hi - 1.5;
  rtSend('A', 'up', up, false, 'pressure');
  rtSend('A', 'down', down, false, 'pressure');
  if (up) { aOp = '＋ 加压（读数 ' + val.toFixed(1) + '）'; }
  else if (down) { aOp = '－ 减压（读数 ' + val.toFixed(1) + '）'; }
  else { aOp = '✔ 稳定在 ' + lo + '—' + hi; }
  var inside = val >= lo && val <= hi;
  var open = inside && s.cooldown === 0;
  rtSend('B', 'action', open, false, 'pressure');
  bOp = inside ? (open ? '⏳ 按住校准阀 ' + s.charge.toFixed(1) + '/4s' : '冷却中，等待') : '区间外，别按！';
}

/* boss v2 蓄力交叉攻防：蓄力期 A 报方向瞄准 + B 报弱点部署盾；挡住后 2.2 秒反击窗口 A 打弱点 */
function driveBoss() {
  var wa = A(), wb = B();
  var s = wa.BossMobile && wa.BossMobile.state();
  if (!s || s.done) {
    aOp = s && s.done ? (s.win ? '✔ 核心停机，突破成功！' : '护盾耗尽') : '等待'; bOp = aOp;
    return;
  }
  if (s.phase === 'ready') { aOp = '读懂分工 · 准备开战'; bOp = aOp; return; }
  if (s.phase === 'impact') {
    aOp = s.effect === 'block' ? '🛡 挡住了！准备反击' : s.effect === 'hit' ? '✦ 命中！' : '💥 弹幕命中，护盾 −1';
    bOp = aOp;
    return;
  }
  if (driveState.bossRound !== s.round) { driveState.bossRound = s.round; driveState.bossActed = false; driveState.bossActAt = 0; }
  var parts = ['左臂', '头顶', '右臂'], dirs = ['左侧', '上方', '右侧'];
  if (s.phase === 'defense') {
    aOp = '🛸 来袭「' + dirs[s.dir] + '」报给 B · 瞄准「' + parts[s.weak] + '」（B 报弱点）';
    bOp = '🗣 弱点「' + parts[s.weak] + '」报给 A · 部署盾挡「' + dirs[s.dir] + '」';
    if (!driveState.bossActed) {
      var now = Date.now();
      if (!driveState.bossActAt) driveState.bossActAt = now + 1500;
      if (now >= driveState.bossActAt) {
        var ba = DOC(wa).querySelector('[data-mb="' + s.weak + '"]');
        var bb = DOC(wb).querySelector('[data-mb="' + s.dir + '"]');
        if (ba) ba.click();
        if (bb) bb.click();
        driveState.bossActed = true;
        aOp = '🎯 已瞄准「' + parts[s.weak] + '」· 盾位交给 B';
        bOp = '🛡 盾已部署「' + dirs[s.dir] + '」· 等弹幕';
      }
    }
    return;
  }
  if (s.phase === 'attack') {
    aOp = '⚔ 反击窗口！开火「' + parts[s.weak] + '」';
    bOp = '🗣 喊弱点：「' + parts[s.weak] + '」！';
    if (!driveState.bossActed) {
      var now2 = Date.now();
      if (!driveState.bossActAt) driveState.bossActAt = now2 + 600;
      if (now2 >= driveState.bossActAt) {
        var btn = DOC(wa).querySelector('[data-mb="' + s.weak + '"]');
        if (btn && !btn.disabled) { btn.click(); driveState.bossActed = true; aOp = '✦ 开火「' + parts[s.weak] + '」！'; }
      }
    }
    return;
  }
}

/* dungeon 密室爬塔：地图阶段演示 A/B 先后移动 → 集合读条 → 进入玩法（子玩法由对应驱动器接管）→ 通关回图再打一关 */
function dgDoneEvents(D) {
  var n = 0;
  D.nodes.forEach(function (x) { if (x.done && x.type === 'event') n++; });
  return n;
}
function driveDungeon() {
  var wa = A(), wb = B();
  var D = wa.DUNGEON;
  if (!D) return;
  /* 上一关目标已完成（通关回图）→ 重新选目标 */
  if (driveState.dgTarget) {
    var tn = null;
    D.nodes.forEach(function (x) { if (x.id === driveState.dgTarget) tn = x; });
    if (!tn || tn.done) { driveState.dgTarget = null; driveState.dgBAt = 0; }
  }
  if (D.over) { aOp = D.win ? '✔ 全塔通关！' : '本次挑战结束'; bOp = aOp; return; }
  if (dgDoneEvents(D) >= 2) { aOp = '✔ 爬塔演示完成'; bOp = '✔ 演示完成'; return; }
  if (!driveState.dgStartAt) driveState.dgStartAt = Date.now() + 3200;
  if (Date.now() < driveState.dgStartAt) { aOp = '观察卷轴地图…'; bOp = aOp; return; }
  var posA = D.posA, posB = D.posB;
  if (!driveState.dgTarget) {
    var cur = null;
    D.nodes.forEach(function (x) { if (x.id === posA) cur = x; });
    var cands = [];
    (cur ? cur.next : []).forEach(function (nid) {
      D.nodes.forEach(function (x) { if (x.id === nid && x.type === 'event' && !x.done) cands.push(x); });
    });
    if (!cands.length) { aOp = '查看路线…'; bOp = aOp; return; }
    driveState.dgTarget = cands[0].id;
    driveState.dgBAt = 0;
  }
  var tgt = driveState.dgTarget, tgtName = '';
  D.nodes.forEach(function (x) { if (x.id === tgt) tgtName = x.mode || x.type; });
  if (posA !== tgt) {
    var na = DOC(wa).querySelector('.dg-node[data-id="' + tgt + '"]');
    if (na) { na.click(); aOp = '🔵 点击节点前进（' + tgtName + '）'; bOp = 'B · 随后跟上'; }
    return;
  }
  aOp = '🔵 A 已就位 · 等 B 赶来集合';
  if (posB !== tgt) {
    var now = Date.now();
    if (!driveState.dgBAt) driveState.dgBAt = now + 1500;
    bOp = '🟠 B 前进中（' + tgtName + '）';
    if (now >= driveState.dgBAt) {
      var nb = DOC(wb).querySelector('.dg-node[data-id="' + tgt + '"]');
      if (nb) { nb.click(); bOp = '🟠 B 点节点跟上'; }
    }
    return;
  }
  aOp = '两人已到齐 · 读条 3 秒进入…'; bOp = aOp;
}

/* puzzle-pack 四个不限时合作解谜：机关盒 / 影子拼图 / 证物还原 / 镜面引光 */
var PP_ANSWERS = [[0, 0, 1], [1, 2, 2], [2, 1, 0]];
function ppHold(win, down) {
  var b = DOC(win).getElementById('pp-hold');
  if (!b) return;
  if (down) {
    if (!b._ppPatched) { b._ppPatched = true; b.setPointerCapture = function () {}; }
    try { b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true })); } catch (e) {}
  } else {
    try { b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true })); } catch (e) {}
  }
}
function ppTrace(mirrors) {
  var x = -1, y = 3, dx = 1, dy = 0, visited = {}, hit = false;
  for (var i = 0; i < 80; i++) {
    x += dx; y += dy;
    if (x === 7 && y === 4) { hit = true; break; }
    if (x < 0 || x > 6 || y < 0 || y > 5) break;
    var k = x + ',' + y + ',' + dx + ',' + dy;
    if (visited[k]) break;
    visited[k] = 1;
    for (var j = 0; j < mirrors.length; j++) {
      var m = mirrors[j];
      if (m.x === x && m.y === y) { var tx = dx; dx = m.rot ? dy : -dy; dy = m.rot ? tx : -tx; break; }
    }
  }
  return hit;
}
function drivePuzzle(mode) {
  var wa = A(), wb = B();
  var s = wa.PuzzlePack && wa.PuzzlePack.state();
  if (!s || s.done) {
    aOp = s && s.done ? '✔ 合作完成！' : '等待'; bOp = aOp;
    return;
  }
  if (!s.started) {
    var ra = DOC(wa).getElementById('pp-ready'); if (ra && !ra.disabled) ra.click();
    var rb = DOC(wb).getElementById('pp-ready'); if (rb && !rb.disabled) rb.click();
    aOp = '阅读分工 · 准备'; bOp = aOp;
    return;
  }
  var now = Date.now();
  if (now - (driveState.ppLast || 0) < 650) return;
  var clicked = false;
  if (mode === 'lockbox') {
    if (s.stage === 0) {
      if (!s.holds.B) { ppHold(wb, true); clicked = true; bOp = 'B · 按住背面锁销'; }
      else { var sa = DOC(wa).getElementById('pp-slide'); if (sa) { sa.click(); clicked = true; } bOp = 'B · 锁销已抬起'; }
      aOp = 'A · 推动滑块 ' + s.slide + ' / 3';
    } else if (s.stage === 1) {
      var sb1 = wb.PuzzlePack.state();
      if (sb1 && sb1.aligned) {
        var la = DOC(wb).getElementById('pp-latch'); if (la) { la.click(); clicked = true; }
        aOp = '齿轮已对齐 · 等 B 扣卡扣'; bOp = 'B · 对齐了，扣上卡扣！';
      } else {
        var ga = DOC(wa).getElementById('pp-gear'); if (ga) { ga.click(); clicked = true; }
        aOp = '↻ 转动齿轮（问 B 校准窗）'; bOp = 'B · 看校准窗回报';
      }
    } else {
      if (!s.holds.A) ppHold(wa, true);
      if (!s.holds.B) ppHold(wb, true);
      aOp = '🤝 合力拉开 ' + Math.min(100, Math.round(s.pull * 100)) + '%'; bOp = aOp;
      driveState.ppLast = now;
      return;
    }
  } else if (mode === 'silhouette') {
    var sb2 = wb.PuzzlePack.state();
    if (s.lamp !== sb2.targetLamp) {
      var lr = DOC(wa).getElementById(s.lamp < sb2.targetLamp ? 'pp-right' : 'pp-left');
      if (lr) { lr.click(); clicked = true; }
      aOp = '💡 调整灯光角度（' + s.lamp + ' → ' + sb2.targetLamp + '）'; bOp = 'B · 报影子倾斜偏差';
    } else {
      for (var i = 0; i < 3; i++) {
        if (s.rot[i] !== sb2.targetRot[i]) {
          var rb2 = DOC(wb).getElementById('pp-rot-' + i);
          if (rb2) { rb2.click(); clicked = true; }
          aOp = 'A · 灯光已到位'; bOp = 'B · 旋转物件 ' + (i + 1);
          break;
        }
      }
      if (!clicked) {
        var ck = DOC(wb).getElementById('pp-check');
        if (ck) { ck.click(); clicked = true; }
        aOp = 'A · 保持住'; bOp = 'B · 核对轮廓';
      }
    }
  } else if (mode === 'evidence') {
    var ans = PP_ANSWERS[Math.min(2, s.level)];
    for (var k = 0; k < 3; k++) {
      if (s.notes.A[k] !== ans[k]) {
        var na = DOC(wa).querySelector('[data-note="' + k + ',' + ans[k] + '"]');
        if (na) { na.click(); clicked = true; }
        aOp = 'A · 圈选' + ['人物', '工具', '时间'][k]; bOp = 'B · 交换证词';
        break;
      }
    }
    if (!clicked) for (var k2 = 0; k2 < 3; k2++) {
      if (s.notes.B[k2] !== ans[k2]) {
        var nb = DOC(wb).querySelector('[data-note="' + k2 + ',' + ans[k2] + '"]');
        if (nb) { nb.click(); clicked = true; }
        bOp = 'B · 圈选' + ['人物', '工具', '时间'][k2]; aOp = 'A · 等 B';
        break;
      }
    }
    if (!clicked) {
      var sa2 = DOC(wa).getElementById('pp-submit');
      var sb3 = DOC(wb).getElementById('pp-submit');
      if (sa2 && !sa2.disabled) { sa2.click(); clicked = true; }
      if (sb3 && !sb3.disabled) { sb3.click(); clicked = true; }
      aOp = '结论一致 · 提交'; bOp = '结论一致 · 提交';
    }
  } else if (mode === 'mirrors') {
    /* 本地求解：枚举镜面翻转组合，找到命中右侧接收器的光路 */
    var n = s.mirrors.length, solution = null;
    for (var mask = 0; mask < (1 << n) && !solution; mask++) {
      var test = s.mirrors.map(function (m, i) { return { x: m.x, y: m.y, rot: m.rot ^ ((mask >> i) & 1) }; });
      if (ppTrace(test)) solution = test;
    }
    if (solution) {
      var flipped = -1;
      for (var i2 = 0; i2 < n; i2++) {
        if (solution[i2].rot !== s.mirrors[i2].rot) { flipped = i2; break; }
      }
      if (flipped >= 0) {
        var ownerWin = s.mirrors[flipped].owner === 'A' ? wa : wb;
        var mb = DOC(ownerWin).getElementById('pp-mirror-' + flipped);
        if (mb) { mb.click(); clicked = true; }
        aOp = 'A · 转自己的镜片（' + (flipped + 1) + ' 号）'; bOp = 'B · 沿光路检查';
      } else {
        var ck2 = DOC(wa).getElementById('pp-check');
        if (ck2) { ck2.click(); clicked = true; }
        aOp = '光路接通 · 检查接收器'; bOp = aOp;
      }
    } else { aOp = '分析光路…'; bOp = aOp; }
  }
  if (clicked) driveState.ppLast = now;
}

/* expansion：准备 + 行动 */
function expReady(mode) {
  var wa = A(), wb = B();
  if (!driveState.expPrac.A) {
    var p = DOC(wa).querySelector('#x-practice [data-x]');
    if (p) { p.click(); driveState.expPrac.A = true; }
  }
  if (!driveState.expPrac.B) {
    var p2 = DOC(wb).querySelector('#x-practice [data-x]');
    if (p2) { p2.click(); driveState.expPrac.B = true; }
  }
  if (!driveState.expReady.A) {
    var r = DOC(wa).getElementById('x-ready');
    if (r && !r.disabled) { r.click(); driveState.expReady.A = true; }
  }
  if (!driveState.expReady.B) {
    var r2 = DOC(wb).getElementById('x-ready');
    if (r2 && !r2.disabled) { r2.click(); driveState.expReady.B = true; }
  }
  var v = wa.RoomLabExpansion && wa.RoomLabExpansion.view;
  return v && v.ready.A && v.ready.B && v.cd === 0;
}
function driveLookback() {
  if (!expReady('lookback')) { aOp = '练习 / 准备中'; bOp = '练习 / 准备中'; return; }
  var wa = A(), wb = B();
  var av = wa.RoomLabExpansion.view, bv = wb.RoomLabExpansion.view;
  if (!av || av.done) return;
  if (av.phase === 'travel') {
    clickX(wa, 'go');
    clickX(wb, av.door === 'left' ? 'left' : 'right');
    aOp = '↑ 前进（报门向：' + (av.door === 'left' ? '左门' : '右门') + '）';
    bOp = '开' + (av.door === 'left' ? '左门' : '右门') + '（听 A 报方向）';
  } else if (av.phase === 'warning') {
    clickX(wa, 'stop');
    aOp = '■ 停下听 B 指挥'; bOp = '监控发现动静！报应对';
  } else if (av.phase === 'danger') {
    var act = { ears: 'stop', eyes: 'go', nose: 'hide' }[bv.monster] || 'stop';
    clickX(wa, act);
    var name = { ears: '听声怪→停步', eyes: '凝视怪→前进', nose: '嗅探怪→躲藏' }[bv.monster] || '';
    aOp = '执行：' + name; bOp = '⚠ 怪物出现：' + name;
  } else if (av.phase === 'safe') {
    aOp = '安全，准备下一段'; bOp = '安全，准备下一段';
  }
}
/* caller v2：B 指定两项核验 → A 免费问两项 → 双方独立投票（可改票） */
function driveCaller() {
  if (!expReady('caller')) { aOp = '练习 / 准备中'; bOp = '练习 / 准备中'; return; }
  var wa = A(), wb = B();
  var av = wa.RoomLabExpansion.view, bv = wb.RoomLabExpansion.view;
  if (!av || av.done) { aOp = av && av.done ? (av.win ? '✔ 值班室安全！' : '结束') : '等待'; bOp = aOp; return; }
  if (av.phase === 'verdict') { aOp = '本通处理完成 · 等下一通'; bOp = '等下一通来电'; return; }
  var checks = bv.checks || [];
  var asked = av.questions || [];
  var names = { code: '工号', task: '任务', route: '来路' };
  var need = checks.filter(function (k) { return asked.indexOf(k) < 0; });
  if (need.length) {
    var now = Date.now();
    if (now - (driveState.callerQ || 0) > 1000) {
      driveState.callerQ = now;
      clickX(wa, need[0]);
      aOp = '☎ 询问「' + names[need[0]] + '」（B 指定核验项）';
      bOp = 'B · 核验项：' + checks.map(function (k) { return names[k]; }).join('＋');
    } else { aOp = '☎ 等待对方回答…'; bOp = 'B · 听回答查档案'; }
    return;
  }
  /* 判定真伪：核验项与档案一致（来路不能是封闭通道） */
  var roster = bv.roster || [], closed = bv.closed || '';
  var claim = av.claim || {};
  var person = null;
  roster.forEach(function (x) { if (x.name === claim.name) person = x; });
  var real = true;
  checks.forEach(function (k) {
    if (k === 'code') real = real && person != null && claim.code != null && claim.code === person.code;
    else if (k === 'task') real = real && person != null && claim.task != null && claim.task === person.task;
    else if (k === 'route') real = real && claim.route != null && claim.route.indexOf(closed) < 0;
  });
  var vote = real ? 'admit' : 'reject';
  var label = real ? '✔ 核验一致 → 放行' : '✖ 发现矛盾 → 拒绝';
  if (av.votes.A === null) { clickX(wa, vote); aOp = label + ' · A 已投票'; } else aOp = label + ' · 等 B 投票';
  if (av.votes.B === null) { clickX(wb, vote); bOp = label + ' · B 已投票'; } else bOp = label + ' · B 已投';
}
/* shadow v2 小房间：A 录影 8 秒踩住黄色按钮（门开），B 回放时穿门拿钥匙 */
function driveShadow() {
  if (!expReady('shadow')) { aOp = '练习 / 准备中'; bOp = '练习 / 准备中'; return; }
  var wa = A(), wb = B();
  var av = wa.RoomLabExpansion.view;
  if (!av || av.done) { aOp = av && av.done ? (av.win ? '✔ 拿到钥匙，配合成功！' : '结束') : '等待'; bOp = aOp; return; }
  var now = Date.now();
  if (av.phase === 'plan') {
    clickX(wa, 'record');
    driveState.shadowLast = 0;
    aOp = '● A 开始录影（8 秒）'; bOp = 'B · 看影子等门开';
    return;
  }
  if (av.phase === 'record') {
    var pa = av.positions.A;
    if (pa < 2 && now - (driveState.shadowLast || 0) > 400) { driveState.shadowLast = now; clickX(wa, 'right'); pa++; }
    aOp = pa >= 2 ? '🟡 踩住黄色按钮 · 门开了！' : 'A 向右走向按钮';
    bOp = 'B · 看 A 的影子开门';
    return;
  }
  if (av.phase === 'waiting') {
    if (now - (driveState.shadowLast || 0) > 900) { driveState.shadowLast = now; clickX(wb, 'replay'); }
    aOp = '录影完成，影子准备出发'; bOp = '▶ B · 播放影子';
    return;
  }
  if (av.phase === 'replay') {
    var pb = av.positions.B;
    if (pb < 6 && now - (driveState.shadowLast || 0) > 430) { driveState.shadowLast = now; clickX(wb, 'right'); pb++; }
    aOp = '影子踩着按钮 · 门保持打开';
    bOp = '🏃 B 向右走（' + pb + ' / 6）拿钥匙';
    return;
  }
  if (av.phase === 'retry') {
    if (now - (driveState.shadowLast || 0) > 700) { driveState.shadowLast = now; clickX(wa, 'record'); }
    aOp = '↻ A 重新录影，多踩一会儿'; bOp = 'B · 等待新影子';
    return;
  }
}
function laneName(n) { return ['左', '中', '右'][n] || '?'; }

/* ================== 主流程 ================== */
async function saveBlob(mode, blob) {
  for (var i = 0; i < 3; i++) {
    try {
      var r = await fetch('/save?name=' + encodeURIComponent(mode + '.webm'), { method: 'POST', body: blob });
      if (r.ok) { var j = await r.json(); log(mode, '已保存', j.file, (j.size / 1048576).toFixed(2) + 'MB'); return; }
    } catch (e) {}
    await sleep(800);
  }
  log('!!', mode, '保存失败（3 次重试）');
}
async function recordOne(m) {
  st('准备 ' + m.name + ' …');
  resetDrivers();
  if (m.id === 'dungeon') await setupDungeon();
  else if (m.net) await setupNet(m.id);
  else await setupOffline(m.id);
  await waitStarted(m.id);
  st('录制中 ' + m.name);
  log('== 开始录制', m.name, '==');
  startRec();
  driveTimer = setInterval(function () { drive(m.id); }, 60);
  var t0 = Date.now(), done = false, endAt = 0;
  while (true) {
    var elapsed = (Date.now() - t0) / 1000;
    if (!done) {
      if (isDone(m.id)) { log(m.id, '结束条件：游戏结束，补录 2.6s 结算画面'); done = true; endAt = Date.now() + 2600; }
      else if (elapsed > m.time + 25) { log(m.id, '结束条件：超时'); done = true; endAt = Date.now() + 800; }
    }
    if (done && Date.now() >= endAt) break;
    await drawOnce(m.id);
    await sleep(110);
  }
  clearInterval(driveTimer); driveTimer = null;
  try {
    if (mode === 'beam' || mode === 'wires' || mode === 'dungeon') { pressKey(A(), false); pressKey(B(), false); }
    if (mode === 'beam' || mode === 'dial' || mode === 'dungeon') { radioDir(0, 0); }
  } catch (e) {}
  var blob = await stopRec();
  if (blob) { await saveBlob(m.id, blob); }
  else log(m.id, '录制失败（无数据）');
  $('fA').src = 'about:blank'; $('fB').src = 'about:blank';
  await sleep(600);
}
async function run() {
  var only = (location.search.match(/only=([a-z,]+)/) || [])[1] || null;
  var list = only ? MODES.filter(function (m) { return only.split(',').indexOf(m.id) >= 0; }) : MODES;
  log('共 ' + list.length + ' 个玩法，开始按顺序录制' + (only ? '（仅 ' + only + '）' : ''));
  for (var i = 0; i < list.length; i++) {
    try { await recordOne(list[i]); }
    catch (e) { log('!!', list[i].id, '失败：', e && e.message || e); }
  }
  st('全部完成 ✓');
  log('== 全部录制完成 ==');
}
window.__runRec = run;
window.__recDebug = function () {
  return {
    recState: rec ? rec.state : 'none',
    chunks: chunks.length,
    bytes: chunks.reduce(function (a, b) { return a + (b ? b.size : 0); }, 0),
    lastDraw: window.__lastDraw || 0,
    frameCount: window.__frameCount || 0,
    now: Date.now()
  };
};
log('录制台就绪。调用 __runRec() 开始。');
})();
