import { BigNumber } from "ethers";

// 数値型に変換済みのTickデータの型定義
interface NormalizedTickData {
  tickIdx: number;
  liquidityNet: number;
  liquidityGross: number;
  price0: number;
  price1: number;
}

// 処理済みのTickデータの型定義
interface ProcessedTickData extends NormalizedTickData {
  liquidityActive: number;
  liquidityDelta: number;
}

// Tick値から価格を計算
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

// 価格からTick値を計算（最も近いTick値を見つける）
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

// sqrt(1.0001^tick)の計算（Q64.96形式）
export function getSqrtRatioAtTick(tick: number): BigNumber {
  // 実際の実装では、より正確な計算方法を使用する必要がある
  // これは簡略化されたバージョン
  const price = Math.pow(1.0001, tick);
  const sqrtPrice = Math.sqrt(price);

  // Q64.96形式に変換
  return BigNumber.from(Math.floor(sqrtPrice * 2 ** 96));
}

// Tick範囲と流動性から計算したToken0の量
export function getAmount0(
  tickLower: number | string,
  tickUpper: number | string,
  currentTick: number | string,
  liquidity: number | string,
  sqrtPriceX96: number | string,
): number {
  const tickLowerNum = Number(tickLower);
  const tickUpperNum = Number(tickUpper);
  const currentTickNum = Number(currentTick);
  const liquidityNum = Number(liquidity);

  // tick範囲外の場合は0を返す
  if (currentTickNum >= tickUpperNum) return 0;

  if (currentTickNum < tickLowerNum) {
    // 範囲下限以下の場合はToken0のみ
    const sqrtRatioA = Math.sqrt(Math.pow(1.0001, tickLowerNum));
    const sqrtRatioB = Math.sqrt(Math.pow(1.0001, tickUpperNum));

    return liquidityNum * (1 / sqrtRatioA - 1 / sqrtRatioB);
  } else {
    // 範囲内の場合
    const sqrtRatioA = Math.sqrt(Math.pow(1.0001, currentTickNum));
    const sqrtRatioB = Math.sqrt(Math.pow(1.0001, tickUpperNum));

    return liquidityNum * (1 / sqrtRatioA - 1 / sqrtRatioB);
  }
}

// Tick範囲と流動性から計算したToken1の量
export function getAmount1(
  tickLower: number | string,
  tickUpper: number | string,
  currentTick: number | string,
  liquidity: number | string,
  sqrtPriceX96: number | string,
): number {
  const tickLowerNum = Number(tickLower);
  const tickUpperNum = Number(tickUpper);
  const currentTickNum = Number(currentTick);
  const liquidityNum = Number(liquidity);

  // tick範囲外の場合は0を返す
  if (currentTickNum <= tickLowerNum) return 0;

  if (currentTickNum >= tickUpperNum) {
    // 範囲上限以上の場合はToken1のみ
    const sqrtRatioA = Math.sqrt(Math.pow(1.0001, tickLowerNum));
    const sqrtRatioB = Math.sqrt(Math.pow(1.0001, tickUpperNum));

    return liquidityNum * (sqrtRatioB - sqrtRatioA);
  } else {
    // 範囲内の場合
    const sqrtRatioA = Math.sqrt(Math.pow(1.0001, tickLowerNum));
    const sqrtRatioB = Math.sqrt(Math.pow(1.0001, currentTickNum));

    return liquidityNum * (sqrtRatioB - sqrtRatioA);
  }
}

// 流動性の厚さを計算
export function calculateLiquidityDelta(
  ticks: NormalizedTickData[],
): ProcessedTickData[] {
  if (!ticks || ticks.length === 0) return [];

  // Tick Indexでソート
  const sortedTicks = [...ticks].sort((a, b) => a.tickIdx - b.tickIdx);

  let currentLiquidity = 0;
  const result: ProcessedTickData[] = [];

  for (const tick of sortedTicks) {
    const tickIdx = tick.tickIdx;
    const liquidityNet = tick.liquidityNet;

    // 流動性の変化を追跡
    currentLiquidity += liquidityNet;

    result.push({
      ...tick,
      liquidityActive: currentLiquidity,
      liquidityDelta: liquidityNet,
    });
  }

  return result;
}

// 指定されたTick範囲内での合計流動性を計算
export function calculateRangeLiquidity(
  ticks: NormalizedTickData[],
  tickLower: number,
  tickUpper: number,
): number {
  if (!ticks || ticks.length === 0) return 0;

  // 特定のTick範囲内のticksをフィルタリング
  const filteredTicks = ticks.filter(
    (tick) => tick.tickIdx >= tickLower && tick.tickIdx <= tickUpper,
  );

  // 各Tickの正味の流動性を合計
  return filteredTicks.reduce((sum, tick) => sum + tick.liquidityNet, 0);
}
