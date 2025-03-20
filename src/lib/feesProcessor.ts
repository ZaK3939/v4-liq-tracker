import { SwapEvent } from '@/types';

/**
 * 日別の手数料データを表す型定義
 */
export interface DailyFeeData {
  /** Unix タイムスタンプ (秒単位) */
  timestamp: number;
  /** 日別の手数料合計 (USD) */
  feeUSD: number;
  /** 日別の取引量合計 (USD) */
  volumeUSD: number;
  /** 日別のスワップ取引数 */
  count: number;
}

/**
 * スワップイベントから日別手数料データを計算する関数
 * GraphQLスキーマのBigDecimal、BigIntに対応
 *
 * @param swapEvents スワップイベントの配列
 * @param feeTier プールの手数料率 (例: 3000 = 0.3%)
 * @returns 日別の手数料データの配列
 */
export function calculateDailyFees(swapEvents: SwapEvent[] | undefined, feeTier: string): DailyFeeData[] {
  if (!swapEvents || swapEvents.length === 0) return [];

  // 手数料レート計算 (例: 3000 -> 0.003 -> 0.3%)
  // GraphQLスキーマのBigIntからNumberに変換
  const feeRate = Number(feeTier) / 1000000;

  // 日付ごとのマップを作成
  const dailyFeesMap = new Map<string, DailyFeeData>();

  swapEvents.forEach((swap) => {
    // timestampをNumberに変換（GraphQLのBigIntから）
    const timestamp = Number(swap.timestamp || 0);
    if (timestamp === 0) return; // 無効なタイムスタンプをスキップ

    const date = new Date(timestamp * 1000);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;

    // amountUSDをNumberに変換（GraphQLのBigDecimalから）
    const swapAmountUSD = Number(swap.amountUSD || 0);
    if (swapAmountUSD === 0) return; // 無効な金額をスキップ

    // スワップ額からその日の手数料を計算
    const feeAmount = swapAmountUSD * feeRate;

    if (dailyFeesMap.has(dateKey)) {
      const dayData = dailyFeesMap.get(dateKey)!;
      dayData.feeUSD += feeAmount;
      dayData.volumeUSD += swapAmountUSD;
      dayData.count += 1;
    } else {
      // 日の始まり（00:00:00）のタイムスタンプを使用
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;

      dailyFeesMap.set(dateKey, {
        timestamp: Math.floor(dayStart),
        feeUSD: feeAmount,
        volumeUSD: swapAmountUSD,
        count: 1,
      });
    }
  });

  // 日付でソートした配列に変換
  return Array.from(dailyFeesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * ページネーションを使用して大量のスワップイベントを処理する関数
 * 複数のAPIコールの結果を統合して手数料を計算
 *
 * @param swapEventsBatches スワップイベントの複数のバッチ (ページネーション結果)
 * @param feeTier プールの手数料率
 * @returns 日別の手数料データの配列
 */
export function calculateDailyFeesFromBatches(swapEventsBatches: SwapEvent[][], feeTier: string): DailyFeeData[] {
  // 手数料レート計算
  const feeRate = Number(feeTier) / 1000000;

  // 日付ごとのマップを作成
  const dailyFeesMap = new Map<string, DailyFeeData>();

  // 各バッチを処理
  swapEventsBatches.forEach((batch) => {
    batch.forEach((swap) => {
      // timestampをNumberに変換
      const timestamp = Number(swap.timestamp || 0);
      if (timestamp === 0) return; // 無効なタイムスタンプをスキップ

      const date = new Date(timestamp * 1000);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;

      // amountUSDをNumberに変換
      const swapAmountUSD = Number(swap.amountUSD || 0);
      if (swapAmountUSD === 0) return; // 無効な金額をスキップ

      // スワップ額からその日の手数料を計算
      const feeAmount = swapAmountUSD * feeRate;

      if (dailyFeesMap.has(dateKey)) {
        const dayData = dailyFeesMap.get(dateKey)!;
        dayData.feeUSD += feeAmount;
        dayData.volumeUSD += swapAmountUSD;
        dayData.count += 1;
      } else {
        // 日の始まり（00:00:00）のタイムスタンプを使用
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000;

        dailyFeesMap.set(dateKey, {
          timestamp: Math.floor(dayStart),
          feeUSD: feeAmount,
          volumeUSD: swapAmountUSD,
          count: 1,
        });
      }
    });
  });

  // 日付でソートした配列に変換
  return Array.from(dailyFeesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 期間ごとにデータを集計する関数
 * @param dailyData 日別データ配列
 * @param periodType 期間タイプ ('week'や'month')
 * @returns 集計されたデータ配列
 */
export function aggregateByPeriod(dailyData: DailyFeeData[], periodType: string): DailyFeeData[] {
  if (!dailyData || dailyData.length === 0) return [];
  if (periodType === 'day') return dailyData;

  const periodMap = new Map<string, DailyFeeData>();

  dailyData.forEach((day) => {
    const date = new Date(day.timestamp * 1000);
    let periodKey: string;

    if (periodType === 'week') {
      // 週の始めの日付を取得
      const firstDayOfWeek = new Date(date);
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 月曜日から始まる週に調整
      firstDayOfWeek.setDate(diff);
      periodKey = `${firstDayOfWeek.getFullYear()}-${String(firstDayOfWeek.getMonth() + 1).padStart(2, '0')}-${String(
        firstDayOfWeek.getDate(),
      ).padStart(2, '0')}`;
    } else if (periodType === 'month') {
      // 月の最初の日
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    } else {
      // デフォルトは日別
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    }

    if (periodMap.has(periodKey)) {
      const existingData = periodMap.get(periodKey)!;
      existingData.feeUSD += day.feeUSD;
      existingData.volumeUSD += day.volumeUSD;
      existingData.count += day.count;
    } else {
      // 期間の始まりの日付をタイムスタンプに変換
      const periodDate = new Date(periodKey);
      periodMap.set(periodKey, {
        timestamp: Math.floor(periodDate.getTime() / 1000),
        feeUSD: day.feeUSD,
        volumeUSD: day.volumeUSD,
        count: day.count,
      });
    }
  });

  // タイムスタンプでソート
  return Array.from(periodMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}
