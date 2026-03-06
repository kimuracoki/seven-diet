# セブンダイエット (7Diet)

セブンイレブンの食品でPFCバランスの良い1日の食事(昼夜2食)を提案するPWAアプリ。

## ターゲット

- 2000 kcal / 日
- P: 145g / F: 55g / C: 230g
- 昼食: 軽め (~600 kcal) / 夕食: しっかり (~1400 kcal)

## 技術スタック

- **フロントエンド**: Vite + React + TypeScript + MUI
- **PWA**: vite-plugin-pwa (Service Worker + Web Manifest)
- **スクレイパー**: Python (requests + BeautifulSoup)
- **デプロイ**: GitHub Pages (GitHub Actions 自動デプロイ)

## 開発

```bash
npm install
npm run dev
```

## スクレイパー

```bash
cd scraper
pyenv local 3.11.11
pip install -r requirements.txt
python scrape.py
```

商品データを `scraper/products.csv` と `src/data/products.json` に出力します。

## ビルド & デプロイ

`main` ブランチに push すると GitHub Actions が自動で GitHub Pages にデプロイします。

```bash
npm run build
```
