# Daily Care v0.1

毎日の健康・美容記録アプリ。スマホ（iPhone）縦画面専用。サーバ不要・ログイン不要。

## ファイル構成
```
daily-app/
├ index.html            画面の骨組み
├ manifest.webmanifest  ホーム画面アプリとしての名前・アイコン設定
├ sw.js                 オフライン起動用（Service Worker）
├ css/style.css         見た目
├ js/config.js          設定（目標日・項目一覧・達成数の分母）
├ js/storage.js         保存と読み出し ← 将来ここだけ差し替える
├ js/app.js             画面の動き
└ icons/                アプリアイコン（192/512px）
```

## 起動方法（PC）
```
cd daily-app
python3 -m http.server 8000
```
ブラウザで http://localhost:8000 を開く。

## iPhoneから開く
PCとiPhoneを同じWi-Fiにつなぎ、PCのIPアドレスを調べて
`http://192.168.x.x:8000` を Safari で開く。

## ホーム画面に追加（PWA）
Safariで開く → 共有ボタン → 「ホーム画面に追加」

## 項目を増やしたいとき
`js/config.js` の TIME_SLOTS / CHECK_ITEMS / CONDITION_ITEMS に1行足す。
達成数の分母に入れたい場合は SCORE_ITEMS にもキーを足す。

## 保存先を変えたいとき
`js/storage.js` の getDay / saveDay / listDays / deleteDay の中身だけを
Supabase や Google Sheets の処理に置き換える。app.js は触らない。
