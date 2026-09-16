/* ============================================================
   app.js --- 画面の組み立てと操作。保存は Storage 経由のみ。
   ============================================================ */
(() => {
'use strict';

/* ---------- 小さな道具 ---------- */
const $  = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const WEEK = ['日','月','火','水','木','金','土'];

const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const toDate = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };

/** 深夜はまだ「前日」として扱う */
function logicalToday() {
  const d = new Date();
  if (d.getHours() < CONFIG.DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const trimHM = (hm) => hm ? hm.replace(/^0/, '') : '';

function daysUntil(targetStr, fromStr) {
  const a = toDate(fromStr), b = toDate(targetStr);
  return Math.round((b - a) / 86400000);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 1600);
}

/* ---------- 状態 ---------- */
const state = { date: logicalToday(), rec: null, view: 'today', slot: null };
let saveTimer = null;

async function load(date) {
  state.date = date;
  state.rec  = await Storage.getDay(date);
  paint();
}

/** データを変更して保存 */
function mutate(fn, { immediate = true } = {}) {
  fn(state.rec);
  if (immediate) {
    clearTimeout(saveTimer);
    Storage.saveDay(state.date, state.rec);
  } else {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => Storage.saveDay(state.date, state.rec), 500);
  }
  paint();
}
function flush() { clearTimeout(saveTimer); Storage.saveDay(state.date, state.rec); }

/* ---------- 達成数 ---------- */
function score(rec) {
  let done = 0;
  for (const k of SCORE_ITEMS) {
    if (k === 'condition') {
      if (CONDITION_ITEMS.some(c => rec.condition[c.key] !== null && rec.condition[c.key] !== undefined)) done++;
    } else if (k in rec.times) {
      if (rec.times[k]) done++;
    } else if (k in rec.checks) {
      if (rec.checks[k]) done++;
    }
  }
  return { done, total: SCORE_ITEMS.length };
}

/* ============================================================
   画面の組み立て（最初に1度だけ）
   ============================================================ */
function buildTimeList() {
  const wrap = $('timeList');
  wrap.innerHTML = '';
  for (const s of TIME_SLOTS) {
    const el = document.createElement('div');
    el.className = 'slot';
    el.dataset.slot = s.key;
    el.innerHTML = `
      <div class="slot-main">
        <button type="button" class="tapbtn" data-act="tap" aria-label="${s.label}">
          <span class="lbl">${s.label}</span><span class="val">--:--</span>
        </button>
        ${s.meal ? `<button type="button" class="more" data-act="detail">詳細 ▾</button>` : ''}
      </div>
      ${s.meal ? `
      <div class="detail" data-meal="${s.meal}" hidden>
        <input type="text" data-field="text" placeholder="食べたもの（任意）">
        <div class="chips">
          <button type="button" class="chip" data-field="protein">たんぱく質</button>
          <button type="button" class="chip" data-field="veggie">野菜・果物</button>
        </div>
      </div>` : ''}
    `;
    wrap.appendChild(el);
  }
}

function buildCheckList() {
  const wrap = $('checkList');
  wrap.innerHTML = '';
  for (const c of CHECK_ITEMS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (SCORE_ITEMS.includes(c.key) ? '' : ' opt');
    b.dataset.check = c.key;
    b.textContent = c.label;
    wrap.appendChild(b);
  }
}

function buildCondList() {
  const wrap = $('condList');
  wrap.innerHTML = '';
  for (const c of CONDITION_ITEMS) {
    const el = document.createElement('div');
    el.className = 'cond';
    el.dataset.cond = c.key;
    const cells = Array.from({ length: 11 }, (_, i) =>
      `<button type="button" class="sc" data-v="${i}">${i}</button>`).join('');
    el.innerHTML = `
      <div class="cond-head"><span class="name">${c.label}</span><span class="now">未入力</span></div>
      <div class="scale">${cells}<button type="button" class="sc clear" data-v="">消す</button></div>`;
    wrap.appendChild(el);
  }
}

/* ============================================================
   画面の描画（値を流し込むだけ。作り直さない）
   ============================================================ */
function paint() {
  const rec = state.rec;
  if (!rec) return;
  const d = toDate(state.date);

  /* ヘッダー */
  $('hDate').textContent = `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}（${WEEK[d.getDay()]}）`;
  const left = daysUntil(CONFIG.TARGET_DATE, state.date);
  $('hCountdown').innerHTML = left >= 0
    ? `${CONFIG.TARGET_DATE.replace(/-/g,'/')} まで あと <b>${left}</b> 日`
    : `${CONFIG.TARGET_DATE.replace(/-/g,'/')} から <b>${-left}</b> 日経過`;
  const sc = score(rec);
  $('hScore').textContent = sc.done;
  $('hScoreMax').textContent = sc.total;
  $('hProgress').style.width = Math.round(sc.done / sc.total * 100) + '%';

  const isToday = state.date === logicalToday();
  $('editBar').hidden = isToday;

  /* 時刻ボタン */
  for (const s of TIME_SLOTS) {
    const el = document.querySelector(`.slot[data-slot="${s.key}"]`);
    const v  = rec.times[s.key];
    el.classList.toggle('done', !!v);
    el.querySelector('.val').textContent = v || '--:--';
    if (s.meal) {
      const m = rec.meals[s.meal];
      const det = el.querySelector('.detail');
      const txt = det.querySelector('[data-field="text"]');
      if (document.activeElement !== txt) txt.value = m.text || '';
      det.querySelector('[data-field="protein"]').classList.toggle('on', !!m.protein);
      det.querySelector('[data-field="veggie"]').classList.toggle('on', !!m.veggie);
    }
  }

  /* チェック */
  for (const c of CHECK_ITEMS) {
    document.querySelector(`[data-check="${c.key}"]`).classList.toggle('on', !!rec.checks[c.key]);
  }

  /* 体調 */
  for (const c of CONDITION_ITEMS) {
    const el = document.querySelector(`[data-cond="${c.key}"]`);
    const v  = rec.condition[c.key];
    const now = el.querySelector('.now');
    now.textContent = (v === null || v === undefined) ? '未入力' : `${v} / 10`;
    now.classList.toggle('set', v !== null && v !== undefined);
    el.querySelectorAll('.sc').forEach(b => {
      b.classList.toggle('on', b.dataset.v !== '' && Number(b.dataset.v) === v);
    });
  }

  /* 任意記録 */
  const w = $('inWeight'), ws = $('inWaist'), me = $('inMemo');
  if (document.activeElement !== w)  w.value  = rec.weight ?? '';
  if (document.activeElement !== ws) ws.value = rec.waist  ?? '';
  if (document.activeElement !== me) me.value = rec.memo   ?? '';
}

/* ============================================================
   操作
   ============================================================ */
function bindEvents() {

  /* --- 時刻ボタン・食事詳細 --- */
  $('timeList').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const slotEl = btn.closest('.slot');
    const key = slotEl.dataset.slot;

    if (btn.dataset.act === 'tap') {
      if (state.rec.times[key]) { openSheet(key); }
      else {
        const t = nowHM();
        mutate(r => { r.times[key] = t; });
        const label = TIME_SLOTS.find(s => s.key === key).label;
        toast(`${label}　${t}`);
      }
      return;
    }
    if (btn.dataset.act === 'detail') {
      const det = slotEl.querySelector('.detail');
      det.hidden = !det.hidden;
      btn.classList.toggle('open', !det.hidden);
      btn.textContent = det.hidden ? '詳細 ▾' : '閉じる ▴';
      return;
    }
    const field = btn.dataset.field;           // protein / veggie
    if (field) {
      const meal = btn.closest('.detail').dataset.meal;
      mutate(r => { r.meals[meal][field] = !r.meals[meal][field]; });
    }
  });

  $('timeList').addEventListener('input', (e) => {
    const inp = e.target;
    if (inp.dataset.field !== 'text') return;
    const meal = inp.closest('.detail').dataset.meal;
    mutate(r => { r.meals[meal].text = inp.value; }, { immediate: false });
  });

  /* --- チェック項目 --- */
  $('checkList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-check]');
    if (!b) return;
    const k = b.dataset.check;
    mutate(r => { r.checks[k] = !r.checks[k]; });
  });

  /* --- 体調 --- */
  $('condList').addEventListener('click', (e) => {
    const b = e.target.closest('.sc');
    if (!b) return;
    const k = b.closest('[data-cond]').dataset.cond;
    const v = b.dataset.v === '' ? null : Number(b.dataset.v);
    mutate(r => { r.condition[k] = (r.condition[k] === v) ? null : v; });
  });

  /* --- 任意記録 --- */
  const num = (el) => el.value.trim() === '' ? null : Number(el.value);
  $('inWeight').addEventListener('input', () => mutate(r => { r.weight = num($('inWeight')); }, { immediate: false }));
  $('inWaist') .addEventListener('input', () => mutate(r => { r.waist  = num($('inWaist'));  }, { immediate: false }));
  $('inMemo')  .addEventListener('input', () => mutate(r => { r.memo   = $('inMemo').value;  }, { immediate: false }));
  ['inWeight','inWaist','inMemo'].forEach(id => $(id).addEventListener('blur', flush));

  /* --- 報告文 --- */
  $('btnReport').addEventListener('click', () => {
    $('reportText').value = buildReport(state.rec);
    $('reportWrap').hidden = false;
    $('copyHint').textContent = '長押しでも選択できます';
    $('reportText').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('btnSelect').addEventListener('click', () => { $('reportText').focus(); $('reportText').select(); });
  $('btnCopy').addEventListener('click', async () => {
    const text = $('reportText').value;
    try {
      await navigator.clipboard.writeText(text);
      $('copyHint').textContent = 'コピーしました';
    } catch {
      $('reportText').focus(); $('reportText').select();
      const ok = document.execCommand && document.execCommand('copy');
      $('copyHint').textContent = ok ? 'コピーしました' : '選択しました。長押しでコピーしてください';
    }
    toast('報告文をコピー');
  });

  /* --- タブ --- */
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchView(t.dataset.view));
  });
  $('btnBackToday').addEventListener('click', async () => {
    await load(logicalToday());
    switchView('today');
  });

  /* --- 履歴 --- */
  $('histList').addEventListener('click', async (e) => {
    const row = e.target.closest('[data-date]');
    if (!row) return;
    await load(row.dataset.date);
    switchView('today');
    window.scrollTo(0, 0);
  });

  /* --- 修正シート --- */
  $('sheet').addEventListener('click', (e) => { if (e.target.dataset.close) closeSheet(); });
  $('sheetNow').addEventListener('click', () => { $('sheetTime').value = nowHM(); });
  $('sheetSave').addEventListener('click', () => {
    const v = $('sheetTime').value;
    if (!v) { toast('時刻を入力してください'); return; }
    const k = state.slot;
    mutate(r => { r.times[k] = v; });
    closeSheet(); toast('修正しました');
  });
  $('sheetDelete').addEventListener('click', () => {
    const k = state.slot;
    const label = TIME_SLOTS.find(s => s.key === k).label;
    if (!confirm(`${label}の記録を削除します。よろしいですか。`)) return;
    mutate(r => { r.times[k] = null; });
    closeSheet(); toast('削除しました');
  });

  /* --- 日付またぎ対策：復帰時に今日が変わっていたら読み直す --- */
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (state.date !== logicalToday() && !state._manual) await load(logicalToday());
  });
}

function openSheet(key) {
  state.slot = key;
  $('sheetTitle').textContent = TIME_SLOTS.find(s => s.key === key).label + ' の修正';
  $('sheetTime').value = state.rec.times[key] || nowHM();
  $('sheet').hidden = false;
}
function closeSheet() { $('sheet').hidden = true; state.slot = null; }

async function switchView(name) {
  state.view = name;
  $('viewToday').hidden   = name !== 'today';
  $('viewHistory').hidden = name !== 'history';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-on', t.dataset.view === name));
  if (name === 'history') await renderHistory();
  window.scrollTo(0, 0);
}

/* ============================================================
   履歴
   ============================================================ */
async function renderHistory() {
  const days = await Storage.listDays();
  const wrap = $('histList');
  wrap.innerHTML = '';
  $('histEmpty').hidden = days.length > 0;
  const today = logicalToday();
  for (const rec of days) {
    const d = toDate(rec.date);
    const sc = score(rec);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hist' + (rec.date === today ? ' today' : '');
    b.dataset.date = rec.date;
    b.innerHTML = `
      <span class="d">${pad(d.getMonth()+1)}/${pad(d.getDate())}<small>${WEEK[d.getDay()]}曜</small></span>
      <span class="s">${sc.done}/${sc.total}</span>
      <span>${rec.times.wake  || '--:--'}</span>
      <span>${rec.times.sleep || '--:--'}</span>
      <span>${rec.checks.workout ? '○' : '×'}</span>`;
    wrap.appendChild(b);
  }
}

/* ============================================================
   報告文
   ============================================================ */
function buildReport(rec) {
  const d = toDate(rec.date);
  const L = [];
  const mark = (b) => b ? '○' : '×';
  const time = (k) => rec.times[k] ? trimHM(rec.times[k]) : '未記録';

  L.push(`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`);
  L.push(`起床 ${time('wake')}`);
  L.push(`朝食 ${time('breakfast')}`);
  L.push(`昼食 ${time('lunch')}`);
  L.push(`夕食 ${time('dinner')}`);
  L.push(`入浴 ${time('bath')}`);
  L.push(`朝スキンケア ${mark(rec.checks.skinAM)}`);
  L.push(`夜スキンケア ${mark(rec.checks.skinPM)}`);
  L.push(`ストレッチ ${mark(rec.checks.stretch)}`);
  L.push(`筋トレ ${mark(rec.checks.workout)}`);

  const meals = Object.values(rec.meals);
  L.push(`たんぱく質 ${meals.filter(m => m.protein).length}/${meals.length}食`);
  L.push(`野菜・果物 ${meals.filter(m => m.veggie).length}/${meals.length}食`);

  const cond = (k, label) => {
    const v = rec.condition[k];
    if (v === null || v === undefined) return;
    L.push(`${label} ${v}/10`);
  };
  cond('fatigue', '疲労');
  cond('skin', '肌');
  cond('mood', '気分');

  L.push(`就寝 ${time('sleep')}`);

  if (rec.weight != null) L.push(`体重 ${rec.weight}kg`);
  if (rec.waist  != null) L.push(`ウエスト ${rec.waist}cm`);
  if (rec.memo && rec.memo.trim()) L.push(`メモ ${rec.memo.trim()}`);

  const sc = score(rec);
  L.push(`達成 ${sc.done}/${sc.total}`);
  return L.join('\n');
}

/* ============================================================
   起動
   ============================================================ */
async function init() {
  buildTimeList();
  buildCheckList();
  buildCondList();
  bindEvents();
  await load(logicalToday());

  /* Service Worker（https または localhost のときだけ有効） */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {/* http直開きでは無効。記録機能には影響しない */});
  }
}

window.App = { state, load, buildReport, score, logicalToday, switchView };
init();

})();
