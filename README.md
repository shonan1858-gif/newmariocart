# 3Dゲーム型 マリオカート風レース（Three.js / Vanilla JS）

ブラウザで動く、Three.js CDNベースの軽量なマリオカート風3Dレースのプロトタイプです。

## 特徴
- W / A / D / Shift / Space / Ctrl(C) / K の操作に対応（A=左、D=右）
- カートYaw主導の走行 + 速度感のある追従カメラ
- コンクリート調の高速道路風ロングコース（不透明路面・中央車線・ガード壁）
- 滑らかなジャンプ台をコース上に配置
- アイテムボックス取得で「ルーレット」演出（左上）
- アイテム: バナナ / 緑甲羅（Kで放物線投擲）
- ドリフト + 3段階ミニターボ（青→オレンジ→紫）
- HUD（速度/ラップ）+ デバッグ（steering/yaw/onGround等）+ ミニマップ

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
- `src/items.js`

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
- `Space`: ジャンプ
- `K`: アイテム投擲（バナナ / 緑甲羅）
- `R`: 最後のチェックポイントへリスポーン
