# 3Dゲーム型 マリオカート風レース（Three.js / Vanilla JS）

ブラウザで動く、Three.js CDNベースの軽量なマリオカート風3Dレースのプロトタイプです。

## 特徴
- W / A / D / Shift / Space / Ctrl(C) の操作に対応（A=左、D=右）
- カートYaw主導の走行（車体の向きに進む）
- 三人称追従カメラ（スムージング + 速度FOV + ブースト時追加FOV）
- 長いスプラインコース（完全フラット路面）
- コンクリート調の不透明路面、ガード衝突押し戻し、チェックポイント復帰
- ドリフト + 3段階ミニターボ（青→オレンジ→紫）
- HUD（速度/ラップ）+ デバッグ（steering/yaw/onGround など）+ 簡易ミニマップ
- 屋外演出（空グラデーション、遠景の山・森、フォグ）

## ファイル構成
- `index.html`
- `src/main.js`
- `src/input.js`
- `src/kart.js`
- `src/camera.js`
- `src/track.js`
- `src/collision.js`
- `src/ui.js`
- `src/vfx.js`

## 起動方法
`npm` は不要です。ローカルサーバで起動してください。

```bash
python -m http.server 8000
```

ブラウザで以下を開きます。

```text
http://localhost:8000
```

## 操作
- `W`: アクセル
- `A / D`: ステア（A=左 / D=右）
- `Shift`: ブレーキ（低速でバック）
- `Ctrl` または `C`: ドリフト
- `Space`: ジャンプ（ホップ）
- `R`: 最後のチェックポイントへリスポーン
