import { ModifyLiquidityEvent, SwapEvent, Pool, LiquidityDataPoint, Token } from '@/types';

/**
 * 流動性イベントを処理してデータポイントマップを生成する関数
 * BigInt流動性の正しい単位変換を行う
 *
 * @param liquidityEvents 流動性変更イベントの配列
 * @param swapEvents スワップイベントの配列
 * @param poolData プールデータ
 * @returns 日付ごとのデータポイントマップ
 */
export function processEventsIntoMap(
  liquidityEvents: ModifyLiquidityEvent[],
  swapEvents: SwapEvent[],
  poolData: Pool,
): Map<string, LiquidityDataPoint> {
  const dateMap = new Map<string, LiquidityDataPoint>();

  // 90日前の開始タイムスタンプを計算
  const now = Math.floor(Date.now() / 1000);
  const startTimestamp = now - 90 * 24 * 60 * 60;

  // 時間範囲内の関連するイベントをフィルタリング
  const relevantLiquidityEvents = liquidityEvents
    .filter((event) => Number(event.timestamp) >= startTimestamp)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  const relevantSwapEvents = swapEvents
    .filter((event) => Number(event.timestamp) >= startTimestamp)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  // 流動性の初期値を0に設定
  let currentLiquidity = BigInt('0');
  let currentTvlUSD = 0;
  let currentToken0 = 0;
  let currentToken1 = 0;
  let currentTick = Number(poolData.tick || '0');
  let currentSqrtPrice = Number(poolData.sqrtPrice || '0');

  // 期間の開始時点のデータポイントを作成
  const startDate = new Date(startTimestamp * 1000);
  const startDateKey = getDateKey(startDate);

  // BigIntを適切なスケールに変換する関数
  // Uniswap v3では流動性は非常に大きな数値になるため表示用にスケーリングする
  const formatLiquidity = (liquidity: bigint): number => {
    // 一般的にUniswap v3の流動性は10^18のスケールで表されることが多い
    // 表示しやすい値にするために10^6で割る (百万単位)
    console.log(liquidity);
    console.log(Number(liquidity) / 1000000);
    return Number(liquidity) / 1000000;
  };

  dateMap.set(startDateKey, {
    date: new Date(startDate.setHours(0, 0, 0, 0)),
    timestamp: Math.floor(startDate.getTime() / 1000),
    liquidity: formatLiquidity(currentLiquidity), // BigIntを適切なスケールに変換
    tvlUSD: currentTvlUSD,
    token0Amount: currentToken0,
    token1Amount: currentToken1,
    tick: currentTick,
    sqrtPrice: currentSqrtPrice,
  });

  // 期間内の流動性イベントをすべて処理
  for (const event of relevantLiquidityEvents) {
    // liquidityDeltaがある場合のみ処理（GraphQLスキーマに合わせて確認）
    if (event.liquidityDelta) {
      // liquidityDeltaの値が正か負かで流動性の追加/削除を判断
      if (event.liquidityDelta.startsWith('-')) {
        // 負の値（流動性削除）の場合、先頭の'-'を取り除いてBigIntに変換
        currentLiquidity -= BigInt(event.liquidityDelta.substring(1));
      } else {
        // 正の値（流動性追加）の場合
        currentLiquidity += BigInt(event.liquidityDelta);
      }

      // トークン量の更新（GraphQLスキーマのBigDecimalからNumber型に変換）
      const amount0 = Number(event.amount0 || '0');
      const amount1 = Number(event.amount1 || '0');

      // 流動性変更の方向に基づいてトークン量を調整
      if (event.liquidityDelta.startsWith('-')) {
        // 流動性削除時はトークン量を減少
        currentToken0 = Math.max(0, currentToken0 - Math.abs(amount0));
        currentToken1 = Math.max(0, currentToken1 - Math.abs(amount1));
      } else {
        // 流動性追加時はトークン量を増加
        currentToken0 = currentToken0 + Math.abs(amount0);
        currentToken1 = currentToken1 + Math.abs(amount1);
      }

      // USD価値の更新
      // GraphQLスキーマに合わせてPoolから直接価格情報を取得
      const token0Price = Number(poolData.token0Price || '0');
      const token1Price = Number(poolData.token1Price || '0');

      // 実効価格を計算
      const effectiveToken0Price = token0Price;
      const effectiveToken1Price = token1Price;

      currentTvlUSD = currentToken0 * effectiveToken0Price + currentToken1 * effectiveToken1Price;
    }

    // 日付ごとのスナップショットを保存
    const timestamp = Number(event.timestamp);
    const date = new Date(timestamp * 1000);
    const dateKey = getDateKey(date);

    // 日付キーでスナップショットを保存または更新
    dateMap.set(dateKey, {
      date: new Date(date.setHours(0, 0, 0, 0)),
      timestamp: Math.floor(date.getTime() / 1000),
      liquidity: formatLiquidity(currentLiquidity), // BigIntを適切なスケールに変換
      tvlUSD: currentTvlUSD,
      token0Amount: currentToken0,
      token1Amount: currentToken1,
      tick: currentTick,
      sqrtPrice: currentSqrtPrice,
    });
  }

  // スワップイベントからティックと価格の最新情報を更新
  for (const swap of relevantSwapEvents) {
    const timestamp = Number(swap.timestamp);
    const date = new Date(timestamp * 1000);
    const dateKey = getDateKey(date);

    // ティックと価格の更新（GraphQLスキーマに合わせて処理）
    if (swap.tick) currentTick = Number(swap.tick);
    if (swap.sqrtPriceX96) currentSqrtPrice = Number(swap.sqrtPriceX96);

    // 日付ごとのスナップショットを更新
    if (dateMap.has(dateKey)) {
      const dataPoint = dateMap.get(dateKey)!;
      dataPoint.tick = currentTick;
      dataPoint.sqrtPrice = currentSqrtPrice;
    } else {
      // その日のデータがまだない場合は新しく作成
      dateMap.set(dateKey, {
        date: new Date(date.setHours(0, 0, 0, 0)),
        timestamp: Math.floor(date.getTime() / 1000),
        liquidity: formatLiquidity(currentLiquidity), // BigIntを適切なスケールに変換
        tvlUSD: currentTvlUSD,
        token0Amount: currentToken0,
        token1Amount: currentToken1,
        tick: currentTick,
        sqrtPrice: currentSqrtPrice,
      });
    }
  }

  return dateMap;
}

/**
 * 日付から一貫したキーを生成する関数
 * @param date 日付オブジェクト
 * @returns YYYY-MM-DD形式の日付キー
 */
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0',
  )}`;
}
