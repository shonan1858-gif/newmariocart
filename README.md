# 3Dゲーム型 マリオカート風レース（Three.js / Vanilla JS）

ブラウザで動く、Three.js CDNベースの軽量なマリオカート風3Dレースのプロトタイプです。

## 特徴
- W / A / D / Shift / Space / R の操作に対応
- 三人称追従カメラ（スムージング + 速度FOV + ドリフト中の視点補正）
- 長いスプラインコース（高低差・バンク・橋）
- オフロード減速、ガード衝突押し戻し、チェックポイント復帰
- ドリフト + 3段階ミニターボ（青→オレンジ→紫）
- HUD（速度/ラップ）+ デバッグ + 簡易ミニマップ
- 屋外演出（空グラデーション、遠景の山・森、地形起伏、フォグ）

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
- `A / D`: ステア
- `Shift`: ブレーキ（低速でバック） / ドリフトトリガー
- `Space`: ジャンプ（ホップ）
- `R`: 最後のチェックポイントへリスポーン
