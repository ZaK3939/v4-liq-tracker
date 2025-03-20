import { useMemo } from 'react';
import { calculateDailyFees, DailyFeeData } from './feesProcessor';
import { processEventsIntoMap } from './eventsProcessor';
import { ModifyLiquidityEvent, SwapEvent, Pool, ExtendedChartDataPoint, LiquidityDataPoint } from '@/types';

/**
 * 流動性と手数料のデータを処理するカスタムフック
 * GraphQLスキーマに合わせて型を正確に扱う
 *
 * @param liquidityEvents 流動性変更イベントの配列
 * @param swapEvents スワップイベントの配列
 * @param poolData プールデータ
 * @param timeRange 時間範囲 (現在は90日固定)
 * @returns 集約されたチャートデータの配列
 */
export function useLiquidityHistory(
  liquidityEvents: ModifyLiquidityEvent[] | undefined,
  swapEvents: SwapEvent[] | undefined,
  poolData: Pool | undefined,
  timeRange: string = '90d', // 現在は90日固定
): ExtendedChartDataPoint[] {
  return useMemo(() => {
    if (!liquidityEvents || !swapEvents || !poolData) return [];

    // 時系列順にイベントをソート
    const sortedLiquidityEvents = [...liquidityEvents].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // 時系列順にスワップイベントをソート
    const sortedSwapEvents = [...swapEvents].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    // GraphQLスキーマに合わせた流動性イベント処理
    const dateMap = processEventsIntoMap(sortedLiquidityEvents, sortedSwapEvents, poolData);

    // 日付でソートした配列に変換
    const sortedDataPoints = Array.from(dateMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // 日別の手数料データを計算
    const dailyFees = calculateDailyFees(sortedSwapEvents, poolData.feeTier);

    // 日別のデータポイントを結合
    const dailyDataPoints = combineDataWithFees(sortedDataPoints, dailyFees);

    // 日付が抜けている場合は補完する
    const completeDataPoints = fillMissingDates(dailyDataPoints);

    return completeDataPoints;
  }, [liquidityEvents, swapEvents, poolData, timeRange]);
}

/**
 * データポイントに手数料情報を結合する関数
 * @param dataPoints 元のデータポイント配列
 * @param feesData 手数料データ配列
 * @returns 手数料情報が追加されたデータポイント配列
 */
function combineDataWithFees(dataPoints: LiquidityDataPoint[], feesData: DailyFeeData[]): ExtendedChartDataPoint[] {
  return dataPoints.map((dataPoint) => {
    const matchingFee = feesData.find((fee) => fee.timestamp === dataPoint.timestamp);
    return {
      ...dataPoint,
      dailyFeeUSD: matchingFee ? matchingFee.feeUSD : 0,
      volumeUSD: matchingFee ? matchingFee.volumeUSD : 0,
      swapCount: matchingFee ? matchingFee.count : 0,
    };
  });
}

/**
 * 日付が抜けているデータポイントを補完する関数
 * @param dataPoints 元のデータポイント配列
 * @returns 補完されたデータポイント配列
 */
function fillMissingDates(dataPoints: ExtendedChartDataPoint[]): ExtendedChartDataPoint[] {
  if (!dataPoints || dataPoints.length === 0) return [];

  const filledData: ExtendedChartDataPoint[] = [...dataPoints];
  const startDate = new Date(dataPoints[0].timestamp * 1000);
  const endDate = new Date(dataPoints[dataPoints.length - 1].timestamp * 1000);

  // 日付をループして抜けている日を埋める
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const currentTimestamp = Math.floor(currentDate.getTime() / 1000);
    const dateExists = filledData.some((point) => {
      const pointDate = new Date(point.timestamp * 1000);
      return (
        pointDate.getFullYear() === currentDate.getFullYear() &&
        pointDate.getMonth() === currentDate.getMonth() &&
        pointDate.getDate() === currentDate.getDate()
      );
    });

    if (!dateExists) {
      // 前日のデータをコピーして流動性を維持
      const previousDay = new Date(currentDate);
      previousDay.setDate(previousDay.getDate() - 1);

      const previousData = filledData.find((point) => {
        const pointDate = new Date(point.timestamp * 1000);
        return (
          pointDate.getFullYear() === previousDay.getFullYear() &&
          pointDate.getMonth() === previousDay.getMonth() &&
          pointDate.getDate() === previousDay.getDate()
        );
      });

      if (previousData) {
        filledData.push({
          date: new Date(currentDate),
          timestamp: currentTimestamp,
          liquidity: previousData.liquidity,
          tvlUSD: previousData.tvlUSD,
          token0Amount: previousData.token0Amount,
          token1Amount: previousData.token1Amount,
          tick: previousData.tick,
          sqrtPrice: previousData.sqrtPrice,
          dailyFeeUSD: 0, // その日の手数料はゼロ
          volumeUSD: 0,
          swapCount: 0,
        });
      }
    }

    // 次の日に進む
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // タイムスタンプでソート
  return filledData.sort((a, b) => a.timestamp - b.timestamp);
}
