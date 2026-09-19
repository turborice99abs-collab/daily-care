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
const prevDay = (s) => { const d = toDate(s); d.setDate(d.getDate()-1); return ymd(d); };

/** 深夜はまだ「前日」として扱う */
function logicalToday() {
  const d = new Date();
  if (d.getHours() < CONFIG.DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const trimHM = (hm) => hm ? hm.replace(/^0/, '') : '';

function daysUntil(targetStr, fromStr) {
  return Math.round((toDate(targetStr) - toDate(fromStr)) / 86400000);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 1600);
}

/* ---------- 状態 ---------- */
const state = { date: logicalToday(), rec: null, view: 'today', slot: null, slotDate: null, meal: null };
let saveTimer = null;
let noticeHidden = false;   // 「昨日の就寝」バナーを今回だけ閉じたか

async function load(date) {
  state.date = date;
  state.rec  = await Storage.getDay(date);
  paint();
  await updateSleepNotice();
}

/** データを変更して保存 */
function mutate(fn, { immediate = true } = {}) {
  fn(state.rec);
  clearTimeout(saveTimer);
  if (immediate) Storage.saveDay(state.date, state.rec);
  else saveTimer = setTimeout(() => Storage.saveDay(state.date, state.rec), 500);
  paint();
}
function flush() { clearTimeout(saveTimer); Storage.saveDay(state.date, state.rec); }

/** 今開いていない日付を書き換える（昨日の就寝の修正など） */
async function mutateOther(date, fn) {
  const rec = await Storage.getDay(date);
  fn(rec);
  await Storage.saveDay(date, rec);
}

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
      <button type="button" class="tapbtn" data-act="tap" aria-label="${s.label}">
        <span class="lbl">${s.label}</span><span class="val">--:--</span>
      </button>
      ${s.meal ? `<button type="button" class="more" data-act="detail" aria-label="${s.label}の詳細">＋</button>` : ''}`;
    wrap.appendChild(el);
  }
}

function buildCheckList() {
  const wrap = $('checkList');
  wrap.innerHTML = '';
  for (const c of CHECK_ITEMS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (c.optional ? ' opt' : '');
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
      <div class="cond-head">
        <span class="name">${c.label}</span>
        <span class="right">
          <span class="now">未入力</span>
          <button type="button" class="clear" data-v="">消す</button>
        </span>
      </div>
      <div class="scale">${cells}</div>`;
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

  $('hDate').textContent = `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}（${WEEK[d.getDay()]}）`;
  const left = daysUntil(CONFIG.TARGET_DATE, state.date);
  $('hCountdown').innerHTML = left >= 0
    ? `${CONFIG.TARGET_DATE.replace(/-/g,'/')} まで あと <b>${left}</b> 日`
    : `${CONFIG.TARGET_DATE.replace(/-/g,'/')} から <b>${-left}</b> 日経過`;
  const sc = score(rec);
  $('hScore').textContent = sc.done;
  $('hScoreMax').textContent = sc.total;
  $('hProgress').style.width = Math.round(sc.done / sc.total * 100) + '%';
  $('editBar').hidden = state.date === logicalToday();

  for (const s of TIME_SLOTS) {
    const el = document.querySelector(`.slot[data-slot="${s.key}"]`);
    const v  = rec.times[s.key];
    el.classList.toggle('done', !!v);
    el.querySelector('.val').textContent = v || '--:--';
    if (s.meal) {
      const m = rec.meals[s.meal];
      const filled = !!(m.text || m.protein || m.veggie);
      const btn = el.querySelector('.more');
      btn.classList.toggle('filled', filled);
      btn.textContent = filled ? '●' : '＋';
    }
  }

  for (const c of CHECK_ITEMS) {
    document.querySelector(`[data-check="${c.key}"]`).classList.toggle('on', !!rec.checks[c.key]);
  }

  for (const c of CONDITION_ITEMS) {
    const el = document.querySelector(`[data-cond="${c.key}"]`);
    const v  = rec.condition[c.key];
    const now = el.querySelector('.now');
    const set = v !== null && v !== undefined;
    now.textContent = set ? `${v} / 10` : '未入力';
    now.classList.toggle('set', set);
    el.querySelectorAll('.sc').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === v));
  }

  const w = $('inWeight'), ws = $('inWaist'), me = $('inMemo');
  if (document.activeElement !== w)  w.value  = rec.weight ?? '';
  if (document.activeElement !== ws) ws.value = rec.waist  ?? '';
  if (document.activeElement !== me) me.value = rec.memo   ?? '';
}

/* ---------- 「昨日の就寝が未記録」バナー ---------- */
async function updateSleepNotice() {
  const el = $('sleepNotice');
  if (noticeHidden || state.date !== logicalToday()) { el.hidden = true; return; }
  const y = prevDay(logicalToday());
  const rec = await Storage.getDay(y);
  const used = Object.values(rec.times).some(Boolean) || Object.values(rec.checks).some(Boolean);
  el.hidden = !(used && !rec.times.sleep);
  el.dataset.date = y;
}

/* ============================================================
   操作
   ============================================================ */
function bindEvents() {

  /* --- 時刻ボタン --- */
  $('timeList').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const key = btn.closest('.slot').dataset.slot;

    if (btn.dataset.act === 'tap') {
      if (state.rec.times[key]) { openSheet(key, state.date); return; }
      const t = nowHM();
      mutate(r => { r.times[key] = t; });
      toast(`${TIME_SLOTS.find(s => s.key === key).label}　${t}`);
      return;
    }
    if (btn.dataset.act === 'detail') openMealSheet(TIME_SLOTS.find(s => s.key === key).meal);
  });

  /* --- チェック項目 --- */
  $('checkList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-check]');
    if (!b) return;
    mutate(r => { r.checks[b.dataset.check] = !r.checks[b.dataset.check]; });
  });

  /* --- 体調 --- */
  $('condList').addEventListener('click', (e) => {
    const b = e.target.closest('.sc, .clear');
    if (!b) return;
    const k = b.closest('[data-cond]').dataset.cond;
    const v = b.dataset.v === '' ? null : Number(b.dataset.v);
    mutate(r => { r.condition[k] = (r.condition[k] === v) ? null : v; });
  });

  /* --- 任意記録 --- */
  const num = (el) => el.value.trim() === '' ? null : Number(el.value);
  $('inWeight').addEventListener('input', () => mutate(r => { r.weight = num($('inWeight')); }, { immediate:false }));
  $('inWaist') .addEventListener('input', () => mutate(r => { r.waist  = num($('inWaist'));  }, { immediate:false }));
  $('inMemo')  .addEventListener('input', () => mutate(r => { r.memo   = $('inMemo').value;  }, { immediate:false }));
  ['inWeight','inWaist','inMemo'].forEach(id => $(id).addEventListener('blur', flush));

  /* --- 報告文 --- */
  $('btnReport').addEventListener('click', () => {
    $('reportText').value = buildReport(state.rec);
    $('reportWrap').hidden = false;
    $('copyHint').textContent = '長押しでも選択できます';
  });
  $('btnSelect').addEventListener('click', () => { $('reportText').focus(); $('reportText').select(); });
  $('btnCopy').addEventListener('click', async () => {
    const text = $('reportText').value;
    try {
      await navigator.clipboard.writeText(text);
      $('copyHint').textContent = 'コピーしました';
    } catch {
      $('reportText').focus(); $('reportText').select();
      const okc = document.execCommand && document.execCommand('copy');
      $('copyHint').textContent = okc ? 'コピーしました' : '選択しました。長押しでコピーしてください';
    }
    toast('報告文をコピー');
  });

  /* --- タブ --- */
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchView(t.dataset.view)));
  $('btnBackToday').addEventListener('click', async () => { await load(logicalToday()); switchView('today'); });

  /* --- 昨日の就寝バナー --- */
  $('btnFixSleep').addEventListener('click', () => openSheet('sleep', $('sleepNotice').dataset.date));
  $('btnHideSleep').addEventListener('click', () => { noticeHidden = true; $('sleepNotice').hidden = true; });

  /* --- 履歴 --- */
  $('histList').addEventListener('click', async (e) => {
    const row = e.target.closest('[data-date]');
    if (!row) return;
    await load(row.dataset.date);
    switchView('today');
  });

  /* --- 時刻シート --- */
  $('sheet').addEventListener('click', (e) => { if (e.target.dataset.close) closeSheet(); });
  $('sheetNow').addEventListener('click', () => { $('sheetTime').value = nowHM(); });
  $('sheetSave').addEventListener('click', async () => {
    const v = $('sheetTime').value;
    if (!v) { toast('時刻を入力してください'); return; }
    await applySheet(r => { r.times[state.slot] = v; });
    toast('保存しました');
  });
  $('sheetDelete').addEventListener('click', async () => {
    const label = TIME_SLOTS.find(s => s.key === state.slot).label;
    if (!confirm(`${label}の記録を削除します。よろしいですか。`)) return;
    await applySheet(r => { r.times[state.slot] = null; });
    toast('削除しました');
  });

  /* --- 食事詳細シート --- */
  $('mealSheet').addEventListener('click', (e) => { if (e.target.dataset.close) closeMealSheet(); });
  $('mealText').addEventListener('input', () => mutate(r => { r.meals[state.meal].text = $('mealText').value; }, { immediate:false }));
  $('mealProtein').addEventListener('click', () => toggleMeal('protein'));
  $('mealVeggie') .addEventListener('click', () => toggleMeal('veggie'));

  /* --- バックアップ --- */
  $('btnExport').addEventListener('click', exportBackup);
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', importBackup);

  /* --- 日付またぎ対策 --- */
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (state.date !== logicalToday()) { noticeHidden = false; await load(logicalToday()); }
    else await updateSleepNotice();
  });
}

/* ---------- シート制御 ---------- */
function openSheet(key, date) {
  state.slot = key; state.slotDate = date;
  const label = TIME_SLOTS.find(s => s.key === key).label;
  const other = date !== state.date;
  $('sheetTitle').textContent = (other ? '昨日の ' : '') + label + ' の記録';
  const cur = other ? null : state.rec.times[key];
  $('sheetTime').value = cur || (key === 'sleep' ? CONFIG.SLEEP_DEFAULT : nowHM());
  if (other) Storage.getDay(date).then(r => { if (r.times[key]) $('sheetTime').value = r.times[key]; });
  $('sheet').hidden = false;
}
function closeSheet() { $('sheet').hidden = true; }

/** シートの内容を、対象の日付へ反映する */
async function applySheet(fn) {
  if (state.slotDate === state.date) mutate(fn);
  else await mutateOther(state.slotDate, fn);
  closeSheet();
  await updateSleepNotice();
  if (state.view === 'history') await renderHistory();
}

function openMealSheet(meal) {
  state.meal = meal;
  const label = TIME_SLOTS.find(s => s.meal === meal).label;
  $('mealTitle').textContent = label + ' の詳細';
  const m = state.rec.meals[meal];
  $('mealText').value = m.text || '';
  $('mealProtein').classList.toggle('on', !!m.protein);
  $('mealVeggie') .classList.toggle('on', !!m.veggie);
  $('mealSheet').hidden = false;
}
function closeMealSheet() { flush(); $('mealSheet').hidden = true; }
function toggleMeal(field) {
  mutate(r => { r.meals[state.meal][field] = !r.meals[state.meal][field]; });
  const b = field === 'protein' ? $('mealProtein') : $('mealVeggie');
  b.classList.toggle('on', state.rec.meals[state.meal][field]);
}

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
      <span class="d">${pad(d.getMonth()+1)}/${pad(d.getDate())}${rec.checks.period ? '<span class="pmark">●</span>' : ''}<small>${WEEK[d.getDay()]}曜</small></span>
      <span class="s">${sc.done}/${sc.total}</span>
      <span>${rec.times.wake  || '--:--'}</span>
      <span>${rec.times.sleep || '--:--'}</span>
      <span>${rec.checks.workout ? '○' : '×'}</span>`;
    wrap.appendChild(b);
  }
}

/* ============================================================
   報告文（項目は config.js から自動生成）
   ============================================================ */
function buildReport(rec) {
  const d = toDate(rec.date);
  const L = [];
  const mark = (b) => b ? '○' : '×';
  const time = (k) => rec.times[k] ? trimHM(rec.times[k]) : '未記録';

  L.push(`${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())}`);
  for (const s of TIME_SLOTS) if (s.key !== 'sleep') L.push(`${s.label} ${time(s.key)}`);

  for (const c of CHECK_ITEMS) {
    if (c.marker) { if (rec.checks[c.key]) L.push(`${c.label} ○`); }
    else L.push(`${c.label} ${mark(rec.checks[c.key])}`);
  }

  const meals = Object.values(rec.meals);
  L.push(`たんぱく質 ${meals.filter(m => m.protein).length}/${meals.length}食`);
  L.push(`野菜・果物 ${meals.filter(m => m.veggie).length}/${meals.length}食`);

  for (const c of CONDITION_ITEMS) {
    const v = rec.condition[c.key];
    if (v !== null && v !== undefined) L.push(`${c.short || c.label} ${v}/10`);
  }

  L.push(`就寝 ${time('sleep')}`);
  if (rec.weight != null) L.push(`体重 ${rec.weight}kg`);
  if (rec.waist  != null) L.push(`ウエスト ${rec.waist}cm`);
  if (rec.memo && rec.memo.trim()) L.push(`メモ ${rec.memo.trim()}`);
  const sc = score(rec);
  L.push(`達成 ${sc.done}/${sc.total}`);
  return L.join('\n');
}

/* ============================================================
   バックアップ
   ============================================================ */
async function exportBackup() {
  const json = await Storage.exportAll();
  const name = `daily-care-backup-${logicalToday()}.json`;
  try {
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      toast('書き出しました');
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('書き出しました');
  } catch {
    $('exportText').value = json;
    $('exportText').hidden = false;
    toast('下の文字をコピーして保存してください');
  }
}

async function importBackup(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); }
  catch { alert('ファイルを読み取れませんでした。'); return; }
  if (!data || !Array.isArray(data.days)) { alert('このファイルはバックアップではありません。'); return; }
  if (!confirm(`${data.days.length}日分を復元します。\n同じ日付の記録は上書きされ、取り消せません。\n\nよろしいですか。`)) return;
  let n = 0;
  for (const day of data.days) {
    if (day && typeof day.date === 'string') { await Storage.saveDay(day.date, day); n++; }
  }
  await load(state.date);
  if (state.view === 'history') await renderHistory();
  toast(`${n}日分を復元しました`);
}

/* ============================================================
   起動
   ============================================================ */
async function init() {
  buildTimeList();
  buildCheckList();
  buildCondList();
  bindEvents();
  $('fVer').textContent = CONFIG.VERSION;
  await load(logicalToday());
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

window.App = { state, load, buildReport, score, logicalToday, switchView };
init();

})();
