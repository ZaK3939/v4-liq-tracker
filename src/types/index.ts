// GraphQLから取得されるプールデータの型定義
export interface Pool {
  chainId: string;
  createdAtTimestamp: string;
  feeTier: string;
  hooks: string;
  id: string;
  liquidityProviderCount: string;
  name: string;
  sqrtPrice: string;
  tick: string;
  tickSpacing: string;
  token0: string;
  token1: string;
  totalValueLockedUSD: string;
  txCount: string;
  createdAtBlockNumber?: string;
  liquidity?: string;
  token0Price?: string;
  token1Price?: string;
  totalValueLockedToken0?: string;
  totalValueLockedToken1?: string;
  totalValueLockedETH?: string;
  volumeUSD?: string;
  feesUSD?: string;
  __typename?: string;
}

// GraphQLから取得されるトークンデータの型定義
export interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
  derivedETH?: string;
  __typename?: string;
}

// GraphQLから取得されるHook統計データの型定義
export interface HookStats {
  id: string;
  chainId: string;
  numberOfPools: string;
  numberOfSwaps: string;
  firstPoolCreatedAt: string;
  totalValueLockedUSD: string;
  totalVolumeUSD: string;
  totalFeesUSD: string;
  __typename?: string;
}

// プール一覧クエリの結果型
export interface PoolsQueryResult {
  Pool?: Pool[];
  Token?: Token[];
}

// Hook統計クエリの結果型
export interface HookStatsQueryResult {
  HookStats?: HookStats[];
}

// プール詳細クエリの結果型
export interface PoolDetailsQueryResult {
  Pool_by_pk?: Pool;
  token0?: Token;
  token1?: Token;
}

// ETH価格クエリの結果型
export interface EthPriceQueryResult {
  Bundle_by_pk?: {
    ethPriceUSD: string;
  };
}

// 流動性イベントの型定義
export interface LiquidityEvent {
  id: string;
  timestamp: string;
  liquidity: string;
  sqrtPrice: string;
  tick: string;
  totalValueLockedUSD: string;
  totalValueLockedToken0: string;
  totalValueLockedToken1: string;
  __typename?: string;
}

// 流動性履歴クエリの結果型
export interface LiquidityHistoryQueryResult {
  liquidityEvents?: LiquidityEvent[];
}

// 流動性変更イベントの型定義
export interface ModifyLiquidityEvent {
  id: string;
  timestamp: string;
  sender: string;
  origin?: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  type?: string; // Mint または Burn を表す
  tickLower: string;
  tickUpper: string;
  liquidityDelta?: string; // 追加: 流動性の変化量
  transaction: string; // 追加: トランザクションハッシュ
  pool?: string; // 追加: プールの参照
  chainId?: string; // 追加: チェーンID
  logIndex?: string; // 追加: ログインデックス
  __typename?: string;
}

// 流動性変更イベントクエリの結果型
export interface ModifyLiquidityEventsQueryResult {
  ModifyLiquidity?: ModifyLiquidityEvent[];
}

// スワップイベントの型定義
export interface SwapEvent {
  id: string;
  timestamp: string;
  sender: string;
  origin: string;
  amount0: string;
  amount1: string;
  amountUSD: string;
  sqrtPriceX96?: string;
  tick?: string;
  transaction: string; // トランザクションハッシュ
  pool?: string; // プールの参照
  chainId?: string; // チェーンID
  logIndex?: string; // ログインデックス
  __typename?: string;
}

// スワップイベントクエリの結果型
export interface SwapEventsQueryResult {
  Swap?: SwapEvent[];
}

// Tickデータの型定義
export interface Tick {
  id?: string;
  tickIdx?: string;
  tickLower?: string;
  tickUpper?: string;
  liquidityNet?: string;
  liquidityGross?: string;
  liquidity?: string;
  price0?: string;
  price1?: string;
  __typename?: string;
}

// Tickデータクエリの結果型
export interface TicksQueryResult {
  positions?: Tick[];
}

// チャートデータポイントの型定義
export interface ChartDataPoint {
  date: Date;
  timestamp: number;
  tvlUSD: number;
  liquidity: number;
  token0Amount: number;
  token1Amount: number;
  sqrtPrice: number;
  tick: number;
  feesUSD?: number; // 手数料（USD）
}

// LiquidityPositionの型定義
export interface LiquidityPosition {
  id: string;
  owner: string;
  pool?: string;
  tickLower: string;
  tickUpper: string;
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0?: string;
  withdrawnToken1?: string;
  collectedFeesToken0?: string;
  collectedFeesToken1?: string;
  createdAtTimestamp?: string;
  createdAtBlockNumber?: string;
  __typename?: string;
}

// LiquidityPositionsクエリ結果の型定義
export interface LiquidityPositionsQueryResult {
  LiquidityPosition?: LiquidityPosition[];
}

// バンドルクエリ結果の型定義
export interface BundleQueryResult {
  Bundle_by_pk?: {
    id: string;
    ethPriceUSD: string;
  };
}
