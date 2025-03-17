# Uniswap v4 流動性トラッカー

Uniswap v4プールの流動性を時系列で追跡・分析するWebアプリケーション。Envioインデクサーを使用してUniswap v4のデータをインデックス化し、プールごとの流動性推移、Tick分布、イベント履歴などを視覚的に確認できます。

## 特徴

- **流動性の時系列チャート**: プールごとの流動性変動をチャートで確認
- **Tick分布の可視化**: 流動性の厚さをティック範囲ごとに視覚化
- **イベント履歴**: 流動性追加/削除イベントとスワップの詳細履歴
- **Hooks統計**: Uniswap v4のHook別統計情報
- **リアルタイムデータ**: Envioインデクサーによる最新データの表示

## テクノロジー

- **フロントエンド**: Next.js, React, TypeScript
- **スタイリング**: Tailwind CSS
- **データ可視化**: Recharts
- **API通信**: Apollo Client, GraphQL
- **インデクサー**: Envio Uniswap v4 Indexer

## 必要条件

- Node.js 16.x以上
- npm または yarn
- Envio APIアクセス

## インストールと実行

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/uniswap-v4-liquidity-tracker.git
cd uniswap-v4-liquidity-tracker

# 依存関係のインストール
npm install
# または
yarn install

# 開発サーバーの起動
npm run dev
# または
yarn dev
```

ブラウザで `http://localhost:3000` を開いてアプリケーションにアクセスできます。

## 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```
NEXT_PUBLIC_ENVIO_API_URL=https://api.envio.dev/v1/your-endpoint
```

## Envioインデクサーのセットアップ

このフロントエンドアプリケーションは、Envioの[uniswap-v4-indexer](https://github.com/enviodev/uniswap-v4-indexer)と連携して動作します。インデクサーのセットアップ方法については、リポジトリのREADMEを参照してください。

## 主要ファイル構成

```
├── src/
│   ├── components/          # UIコンポーネント
│   │   ├── LiquidityChart.tsx     # 流動性チャート
│   │   ├── LiquidityDepthChart.tsx # Tick分布チャート  
│   │   ├── EventsTable.tsx        # イベントテーブル
│   │   └── PoolSelector.tsx       # プール選択
│   │
│   ├── lib/                # ユーティリティ
│   │   ├── apollo-client.ts # GraphQL設定
│   │   ├── queries.ts       # GraphQLクエリ
│   │   ├── utils.ts         # ヘルパー関数
│   │   └── liquidityMath.ts # 流動性計算
│   │
│   ├── pages/              # Next.jsページ
│   │   ├── index.tsx       # メインページ 
│   │   └── pool/[id].tsx   # プール詳細ページ
│   │
│   └── styles/             # スタイル
│       └── globals.css     # Tailwind CSS
│
├── next.config.js         # Next.js設定
├── tailwind.config.js     # Tailwind設定
└── package.json           # 依存関係
```

## カスタマイズ方法

- **APIエンドポイント**: `src/lib/apollo-client.ts` を編集してEnvio APIの接続先を変更
- **UI/UXのカスタマイズ**: Tailwind CSSとコンポーネントを編集
- **追加データの表示**: `src/lib/queries.ts` に新しいGraphQLクエリを追加

## デプロイ

VercelでNext.jsアプリケーションとしてデプロイできます：

```bash
npm i -g vercel
vercel login
vercel
```

## コントリビューション

プルリクエストや機能追加の提案を歓迎します。大きな変更を加える前には、まずissueを開いて議論してください。

## ライセンス

MIT

## 謝辞

- [Envio](https://envio.dev/) - インデクサーフレームワーク
- [Uniswap](https://uniswap.org/) - DEXプロトコル
- [Recharts](https://recharts.org/) - Reactチャートライブラリ
- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Tailwind CSS](https://tailwindcss.com/) - CSSフレームワーク