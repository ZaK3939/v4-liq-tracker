import { BigNumber } from "ethers";

interface Position {
  id: string;
  tickLower: string | number;
  tickUpper: string | number;
  liquidity: string | number;
}

interface PoolInfo {
  id: string;
  tick?: string | number;
  tickSpacing?: string | number;
  token0Price?: string | number;
  token1Price?: string | number;
}

interface TickData {
  id: string;
  tickIdx: string;
  liquidityNet: string;
  liquidityGross: string;
  price0: string;
  price1: string;
}

/**
 * 流動性ポジションからティックデータを生成する
 * @param positions - 流動性ポジションの配列
 * @param poolInfo - プールの基本情報
 * @returns ティックデータの配列
 */
export function generateTicksFromPositions(
  positions: Position[],
  poolInfo?: PoolInfo,
): TickData[] {
  if (!positions || positions.length === 0) return [];

  const tickMap = new Map();
  const currentTick = poolInfo?.tick ? parseInt(String(poolInfo.tick)) : 0;
  const tickSpacing = poolInfo?.tickSpacing
    ? parseInt(String(poolInfo.tickSpacing))
    : 60;

  // 現在の価格を基準にティック範囲を生成
  const rangeSize = 50;
  for (let i = -rangeSize; i <= rangeSize; i++) {
    const tickIdx =
      Math.floor(currentTick / tickSpacing) * tickSpacing + i * tickSpacing;

    // 各ティックのデータを初期化
    tickMap.set(tickIdx.toString(), {
      id: poolInfo?.id ? `${poolInfo.id}-${tickIdx}` : `tick-${tickIdx}`,
      tickIdx: tickIdx.toString(),
      liquidityGross: "0",
      liquidityNet: "0",
      price0: calculatePrice0FromTick(tickIdx).toString(),
      price1: calculatePrice1FromTick(tickIdx).toString(),
    });
  }

  // 各ポジションの境界ティックに流動性を割り当て
  positions.forEach((position) => {
    const liquidityAmount = String(position.liquidity || "0");
    if (liquidityAmount === "0") return; // 流動性がない場合はスキップ

    const tickLower = String(position.tickLower || "0");
    const tickUpper = String(position.tickUpper || "0");

    // 下限ティック
    if (!tickMap.has(tickLower)) {
      tickMap.set(tickLower, {
        id: poolInfo?.id ? `${poolInfo.id}-${tickLower}` : `tick-${tickLower}`,
        tickIdx: tickLower,
        liquidityGross: "0",
        liquidityNet: "0",
        price0: calculatePrice0FromTick(parseInt(tickLower)).toString(),
        price1: calculatePrice1FromTick(parseInt(tickLower)).toString(),
      });
    }

    const lowerTick = tickMap.get(tickLower);

    // BigIntで安全に計算
    let newLowerNetLiquidity, newLowerGrossLiquidity;
    try {
      newLowerNetLiquidity = (
        BigInt(lowerTick.liquidityNet) + BigInt(liquidityAmount)
      ).toString();
      newLowerGrossLiquidity = (
        BigInt(lowerTick.liquidityGross) + BigInt(liquidityAmount)
      ).toString();
    } catch (e) {
      // BigIntの変換に失敗した場合、通常の数値計算にフォールバック
      const lowerNetNum = Number(lowerTick.liquidityNet) || 0;
      const lowerGrossNum = Number(lowerTick.liquidityGross) || 0;
      const liquidityNum = Number(liquidityAmount) || 0;

      newLowerNetLiquidity = (lowerNetNum + liquidityNum).toString();
      newLowerGrossLiquidity = (lowerGrossNum + liquidityNum).toString();
    }

    tickMap.set(tickLower, {
      ...lowerTick,
      liquidityNet: newLowerNetLiquidity,
      liquidityGross: newLowerGrossLiquidity,
    });

    // 上限ティック
    if (!tickMap.has(tickUpper)) {
      tickMap.set(tickUpper, {
        id: poolInfo?.id ? `${poolInfo.id}-${tickUpper}` : `tick-${tickUpper}`,
        tickIdx: tickUpper,
        liquidityGross: "0",
        liquidityNet: "0",
        price0: calculatePrice0FromTick(parseInt(tickUpper)).toString(),
        price1: calculatePrice1FromTick(parseInt(tickUpper)).toString(),
      });
    }

    const upperTick = tickMap.get(tickUpper);

    // BigIntで安全に計算
    let newUpperNetLiquidity, newUpperGrossLiquidity;
    try {
      newUpperNetLiquidity = (
        BigInt(upperTick.liquidityNet) - BigInt(liquidityAmount)
      ).toString();
      newUpperGrossLiquidity = (
        BigInt(upperTick.liquidityGross) + BigInt(liquidityAmount)
      ).toString();
    } catch (e) {
      // BigIntの変換に失敗した場合、通常の数値計算にフォールバック
      const upperNetNum = Number(upperTick.liquidityNet) || 0;
      const upperGrossNum = Number(upperTick.liquidityGross) || 0;
      const liquidityNum = Number(liquidityAmount) || 0;

      newUpperNetLiquidity = (upperNetNum - liquidityNum).toString();
      newUpperGrossLiquidity = (upperGrossNum + liquidityNum).toString();
    }

    tickMap.set(tickUpper, {
      ...upperTick,
      liquidityNet: newUpperNetLiquidity,
      liquidityGross: newUpperGrossLiquidity,
    });
  });

  // Mapから配列に変換してソート
  return Array.from(tickMap.values()).sort(
    (a, b) => parseInt(a.tickIdx) - parseInt(b.tickIdx),
  );
}

/**
 * ティックからtoken0の価格を計算
 * @param tick - ティックインデックス
 * @returns token0の価格
 */
function calculatePrice0FromTick(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * ティックからtoken1の価格を計算
 * @param tick - ティックインデックス
 * @returns token1の価格
 */
function calculatePrice1FromTick(tick: number): number {
  return 1 / calculatePrice0FromTick(tick);
}
