/* ============================================================
   config.js  --- アプリ全体の設定値はここだけを直せばよい
   ============================================================ */
const CONFIG = {
  APP_NAME: 'Daily Care',
  VERSION: '0.2.0',

  /* 目標日。ここを書き換えれば残り日数の基準が変わる */
  TARGET_DATE: '2026-10-17',

  /* 深夜0時〜この時刻までは「前日」として扱う。
     例: 4 なら 26:30(=翌0:30)の就寝も前日の記録になる */
  DAY_ROLLOVER_HOUR: 4,

  /* 「昨日の就寝が未記録」バナーで最初に表示する時刻 */
  SLEEP_DEFAULT: '23:00',

  /* 保存キーの接頭辞。将来スキーマを変えるときは v1 → v2 にする */
  STORAGE_PREFIX: 'dailycare:v1:',
};

/* 時刻ボタン（押すと現在時刻が入る） */
const TIME_SLOTS = [
  { key: 'wake',      label: '起床',  meal: null },
  { key: 'breakfast', label: '朝食',  meal: 'breakfast' },
  { key: 'lunch',     label: '昼食',  meal: 'lunch' },
  { key: 'dinner',    label: '夕食',  meal: 'dinner' },
  { key: 'bath',      label: '入浴',  meal: null },
  { key: 'sleep',     label: '就寝',  meal: null },
];

/* ON/OFF のチェック項目
   optional : true なら達成数の分母に入れない（見た目も点線枠）
   marker   : true なら「○のときだけ」報告文に出す  */
const CHECK_ITEMS = [
  { key: 'skinAM',  label: '朝スキンケア' },
  { key: 'skinPM',  label: '夜スキンケア' },
  { key: 'stretch', label: 'ストレッチ' },
  { key: 'workout', label: '筋トレ',     optional: true },
  { key: 'bowel',   label: '便通',       optional: true },
  { key: 'period',  label: '生理開始',   optional: true, marker: true },
];

/* 体調（0〜10・未入力可）。short は報告文で使う短い名前 */
const CONDITION_ITEMS = [
  { key: 'fatigue', label: '疲労感', short: '疲労' },
  { key: 'mood',    label: '気分',   short: '気分' },
];

/* 達成数の分母になる項目。増やしたいときはここに足すだけ */
const SCORE_ITEMS = [
  'wake', 'breakfast', 'lunch', 'dinner', 'bath', 'sleep',
  'skinAM', 'skinPM', 'stretch',
  'condition', // 体調を1つでも入力したら達成
];
