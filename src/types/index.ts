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

export interface ChartDataPoint {
  /** 日付オブジェクト */
  date: Date;
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 総流動性額 (USD) */
  tvlUSD: number;
  /** プールの流動性 - 数値型に変更 */
  liquidity: number;
  /** トークン0の量 */
  token0Amount: number;
  /** トークン1の量 */
  token1Amount: number;
  /** 平方根価格 - 数値型に変更 */
  sqrtPrice: number;
  /** 現在の価格ティック - 数値型に変更 */
  tick: number;
}

// 日別の集計データ
export interface AggregatedDataPoint extends ExtendedChartDataPoint {
  /** 集計期間の種類 ('day', 'week', 'month') */
  periodType?: string;
}

// 時間別の集計データ
export interface HourlyDataPoint extends ExtendedChartDataPoint {
  /** 時間帯 (0-23) */
  hour: number;
}

/**
 * 基本的なチャートデータポイント
 */
export interface LiquidityDataPoint {
  /** 日付オブジェクト */
  date: Date;
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 流動性額 */
  liquidity: number;
  /** 総流動性額 (USD) */
  tvlUSD: number;
  /** トークン0の量 */
  token0Amount: number;
  /** トークン1の量 */
  token1Amount: number;
  /** 現在の価格ティック */
  tick: number;
  /** 平方根価格 */
  sqrtPrice: number;
}
// types/index.ts に追加する型定義

/**
 * チャートの基本データポイント
 */
export interface ChartDataPoint {
  /** 日付オブジェクト */
  date: Date;
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 総流動性額 (USD) */
  tvlUSD: number;
  /** 流動性額 */
  liquidity: number;
  /** トークン0の量 */
  token0Amount: number;
  /** トークン1の量 */
  token1Amount: number;
  /** 現在の価格ティック */
  tick: number;
  /** 平方根価格 */
  sqrtPrice: number;
}

/**
 * 拡張されたチャートデータポイント（手数料情報付き）
 */
export interface ExtendedChartDataPoint extends ChartDataPoint {
  /** 日次/時間ごとの手数料 (USD) */
  dailyFeeUSD: number;
  /** 日次/時間ごとの取引量 (USD) */
  volumeUSD: number;
  /** 日次/時間ごとのスワップ数 */
  swapCount: number;
}

/**
 * 流動性データポイント（リファクタリング用）
 */
export interface LiquidityDataPoint {
  /** 日付オブジェクト */
  date: Date;
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 流動性額 */
  liquidity: number;
  /** 総流動性額 (USD) */
  tvlUSD: number;
  /** トークン0の量 */
  token0Amount: number;
  /** トークン1の量 */
  token1Amount: number;
  /** 現在の価格ティック */
  tick: number;
  /** 平方根価格 */
  sqrtPrice: number;
}

/**
 * 集計されたチャートデータポイント
 */
export interface AggregatedChartDataPoint extends ExtendedChartDataPoint {
  /** 集計期間の種類 ('day', 'week', 'month') */
  periodType: string;
}

/**
 * 日別の手数料データ
 */
export interface DailyFeeData {
  /** 日付オブジェクト */
  date: Date;
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 日次手数料合計 (USD) */
  feeUSD: number;
  /** 日次取引量合計 (USD) */
  volumeUSD: number;
  /** 日次スワップ数 */
  count: number;
}

/**
 * 期間タイプの型定義
 */
export type PeriodType = 'day' | 'week' | 'month';
