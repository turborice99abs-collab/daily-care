/* ============================================================
   storage.js --- データの保存・読み出しは必ずここを経由する
   ------------------------------------------------------------
   画面側(app.js)は localStorage の存在を知らない。
   将来 Supabase / Google Sheets に移すときは、
   このファイルの中身だけを差し替えれば済む。
   そのため全ての関数を async（非同期）にしてある。
   ============================================================ */
const Storage = (() => {

  const key  = (date) => CONFIG.STORAGE_PREFIX + date;
  const IDX  = CONFIG.STORAGE_PREFIX + 'index';

  /* 1日分の空データ（この形が唯一の正） */
  function emptyRecord(date) {
    const rec = {
      date,
      times:     {},   // { wake: "06:10", ... }
      checks:    {},   // { skinAM: true, ... }
      meals:     {},   // { breakfast: {食べたもの, protein, veggie} }
      condition: {},   // { fatigue: 5, skin: 7, mood: 6 }
      weight: null,
      waist:  null,
      memo:   '',
      updatedAt: null,
    };
    TIME_SLOTS.forEach(s => { rec.times[s.key] = null; });
    CHECK_ITEMS.forEach(c => { rec.checks[c.key] = false; });
    TIME_SLOTS.filter(s => s.meal).forEach(s => {
      rec.meals[s.meal] = { text: '', protein: false, veggie: false };
    });
    CONDITION_ITEMS.forEach(c => { rec.condition[c.key] = null; });
    return rec;
  }

  /* 古い保存データに新項目が無くても壊れないように埋める */
  function normalize(raw, date) {
    const base = emptyRecord(date);
    if (!raw || typeof raw !== 'object') return base;
    return {
      ...base, ...raw,
      date,
      times:     { ...base.times,     ...(raw.times     || {}) },
      checks:    { ...base.checks,    ...(raw.checks    || {}) },
      condition: { ...base.condition, ...(raw.condition || {}) },
      meals: Object.fromEntries(
        Object.keys(base.meals).map(m => [m, { ...base.meals[m], ...((raw.meals || {})[m] || {}) }])
      ),
    };
  }

  function readIndex() {
    try { return JSON.parse(localStorage.getItem(IDX)) || []; }
    catch { return []; }
  }
  function writeIndex(list) {
    localStorage.setItem(IDX, JSON.stringify([...new Set(list)].sort()));
  }

  return {
    emptyRecord,

    /** 指定日の記録を取得（無ければ空データ） */
    async getDay(date) {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(key(date))); } catch { raw = null; }
      return normalize(raw, date);
    },

    /** 指定日の記録を保存 */
    async saveDay(date, rec) {
      const data = { ...rec, date, updatedAt: new Date().toISOString() };
      localStorage.setItem(key(date), JSON.stringify(data));
      const idx = readIndex();
      if (!idx.includes(date)) writeIndex([...idx, date]);
      return data;
    },

    /** 保存済みの日付一覧（新しい順） */
    async listDates() {
      return readIndex().slice().reverse();
    },

    /** 履歴画面用に全件まとめて取得（新しい順） */
    async listDays(limit = 400) {
      const dates = (await this.listDates()).slice(0, limit);
      return Promise.all(dates.map(d => this.getDay(d)));
    },

    /** 指定日の記録を削除（取り消し不可） */
    async deleteDay(date) {
      localStorage.removeItem(key(date));
      writeIndex(readIndex().filter(d => d !== date));
    },

    /** 全データをJSONで書き出す（バックアップ用） */
    async exportAll() {
      const days = await this.listDays(9999);
      return JSON.stringify({ app: CONFIG.APP_NAME, version: CONFIG.VERSION, days }, null, 2);
    },
  };
})();
