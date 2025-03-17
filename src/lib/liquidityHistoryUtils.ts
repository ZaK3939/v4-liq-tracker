import { useMemo } from 'react';
import { ChartDataPoint, ModifyLiquidityEvent, SwapEvent, Pool } from '../types';

/**
 * 流動性イベントから時系列チャートデータを生成する関数
 *
 * 流動性の変動と手数料の推移を追跡します
 */
export function useLiquidityHistory(
  liquidityEvents: ModifyLiquidityEvent[] | undefined,
  swapEvents: SwapEvent[] | undefined,
  poolDetails: Pool | undefined,
  timeRange: string,
): ChartDataPoint[] {
  return useMemo(() => {
    if (!poolDetails) return [];

    // 初期値を設定
    const initialLiquidity = poolDetails.liquidity ? BigInt(poolDetails.liquidity) : BigInt(0);
    const initialTVL = parseFloat(poolDetails.totalValueLockedUSD || '0');
    const initialToken0 = parseFloat(poolDetails.totalValueLockedToken0 || '0');
    const initialToken1 = parseFloat(poolDetails.totalValueLockedToken1 || '0');
    const initialFees = parseFloat(poolDetails.feesUSD || '0');

    // 流動性イベントとスワップイベントをソート
    const sortedLiquidityEvents = liquidityEvents
      ? [...liquidityEvents].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
      : [];

    const sortedSwapEvents = swapEvents
      ? [...swapEvents].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp))
      : [];

    // 時間間隔を決定
    let interval = 3600; // デフォルト: 1時間ごと
    if (timeRange === '24h') interval = 900; // 15分ごと
    else if (timeRange === '90d') interval = 86400; // 1日ごと

    // 時間範囲の開始時間を決定
    const now = Math.floor(Date.now() / 1000);
    let startTime = now;
    if (timeRange === '24h') startTime = now - 86400;
    else if (timeRange === '90d') startTime = now - 86400 * 90;

    // タイムスタンプの取得: 開始時間から現在までの間隔ごとに
    const timestamps: number[] = [];
    for (let t = startTime; t <= now; t += interval) {
      timestamps.push(t);
    }

    // 各タイムスタンプでの状態を再構築
    const chartData: ChartDataPoint[] = timestamps.map((timestamp) => {
      // このタイムスタンプ以前のイベントを全て取得
      const liquidityEventsUntilTimestamp = sortedLiquidityEvents.filter((e) => parseInt(e.timestamp) <= timestamp);

      const swapEventsUntilTimestamp = sortedSwapEvents.filter((e) => parseInt(e.timestamp) <= timestamp);

      // 流動性と価値の計算
      let runningLiquidity = Number(initialLiquidity);
      let runningTVL = 0;
      let runningToken0 = initialToken0;
      let runningToken1 = initialToken1;
      let runningFees = initialFees;

      // 流動性の変動を計算
      liquidityEventsUntilTimestamp.forEach((event) => {
        // liquidityDeltaを使って流動性を更新
        const delta = Number(event.liquidityDelta || 0);
        runningLiquidity += delta;

        // token0とtoken1の量を更新
        const amount0 = parseFloat(event.amount0 || '0');
        const amount1 = parseFloat(event.amount1 || '0');
        runningToken0 += amount0;
        runningToken1 += amount1;

        // TVLを更新
        const amountUSD = parseFloat(event.amountUSD || '0');
        runningTVL += amountUSD;
      });

      // 手数料の累積を計算
      let feesSinceStart = 0;
      swapEventsUntilTimestamp.forEach((event) => {
        const amountUSD = parseFloat(event.amountUSD || '0');
        // 手数料率に基づいて手数料を計算
        const feePercentage = Number(poolDetails.feeTier) / 1000000; // feeTierは100%を1,000,000として表現
        const feeAmount = amountUSD * feePercentage;
        feesSinceStart += feeAmount;
      });

      // 初期の手数料に期間内の手数料を加算
      runningFees += feesSinceStart;

      // 最も近いスワップイベントを使用して価格とティックを取得
      const lastSwap = swapEventsUntilTimestamp[swapEventsUntilTimestamp.length - 1];
      const sqrtPrice = lastSwap ? lastSwap.sqrtPriceX96 : poolDetails.sqrtPrice;
      const tick = lastSwap ? parseInt(lastSwap.tick || poolDetails.tick) : parseInt(poolDetails.tick);

      // データポイントを作成
      const point: ChartDataPoint = {
        date: new Date(timestamp * 1000),
        timestamp,
        tvlUSD: runningTVL,
        liquidity: runningLiquidity,
        token0Amount: runningToken0,
        token1Amount: runningToken1,
        sqrtPrice: Number(sqrtPrice),
        tick,
        feesUSD: runningFees,
      };

      return point;
    });

    return chartData;
  }, [liquidityEvents, swapEvents, poolDetails, timeRange]);
}
