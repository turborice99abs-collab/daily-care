# Daily Care v0.2

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

## v0.2 の変更点
- 昨日の就寝を押し忘れたとき、今日の画面のバナーから1タップで入力できる
- 時刻ボタンを2列化・体調を1行化・任意記録を折りたたみ（縦の長さを約4割短縮）
- 「肌の調子」を削除
- 「便通」「生理開始」を任意チェックに追加（達成数の分母には入れない）
- 履歴画面にバックアップの書き出し／復元を追加
- 食事の詳細入力をシート形式に変更

## 更新するときの注意
ファイルを差し替えたら、必ず `sw.js` の `dailycare-vN` の数字を1つ上げること。
上げないと、iPhoneは古い画面を表示し続ける。
