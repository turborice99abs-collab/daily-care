/* ============================================================
   config.js  --- アプリ全体の設定値はここだけを直せばよい
   ============================================================ */
const CONFIG = {
  APP_NAME: 'Daily Care',
  VERSION: '0.1.0',

  /* 目標日。ここを書き換えれば残り日数の基準が変わる */
  TARGET_DATE: '2026-10-17',

  /* 深夜0時〜この時刻までは「前日」として扱う。
     例: 4 なら 26:30(=翌0:30)の就寝も前日の記録になる */
  DAY_ROLLOVER_HOUR: 4,

  /* 保存キーの接頭辞。将来スキーマを変えるときは v1 → v2 にする */
  STORAGE_PREFIX: 'dailycare:v1:',
};

/* 時刻ボタン（押すと現在時刻が入る）の定義 */
const TIME_SLOTS = [
  { key: 'wake',      label: '起床',  meal: null },
  { key: 'breakfast', label: '朝食',  meal: 'breakfast' },
  { key: 'lunch',     label: '昼食',  meal: 'lunch' },
  { key: 'dinner',    label: '夕食',  meal: 'dinner' },
  { key: 'bath',      label: '入浴',  meal: null },
  { key: 'sleep',     label: '就寝',  meal: null },
];

/* ON/OFF のチェック項目 */
const CHECK_ITEMS = [
  { key: 'skinAM',  label: '朝スキンケア' },
  { key: 'skinPM',  label: '夜スキンケア' },
  { key: 'stretch', label: 'ストレッチ' },
  { key: 'workout', label: '筋トレ' },   // 任意項目。達成数の分母には入れない
];

/* 体調（0〜10・未入力可） */
const CONDITION_ITEMS = [
  { key: 'fatigue', label: '疲労感' },
  { key: 'skin',    label: '肌の調子' },
  { key: 'mood',    label: '気分' },
];

/* 達成数の分母になる項目。増やしたいときはここに足すだけ */
const SCORE_ITEMS = [
  'wake', 'breakfast', 'lunch', 'dinner', 'bath', 'sleep',
  'skinAM', 'skinPM', 'stretch',
  'condition', // 体調を1つでも入力したら達成
];
