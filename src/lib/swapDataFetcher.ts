import { ApolloClient } from '@apollo/client';
import { GET_POOL_SWAP_EVENTS } from './queries';
import { SwapEvent, ChartDataPoint } from '../types';

/**
 * 指定した期間のすべてのスワップイベントを取得する関数
 * ページネーションを使って10万件以上のデータも取得可能
 *
 * @param client ApolloClientインスタンス
 * @param poolId プールID
 * @param startTime 開始タイムスタンプ
 * @param maxBatches 最大バッチ数（デフォルト: 100 = 最大10万件）
 * @param batchSize 1回あたりの取得数（デフォルト: 1000）
 * @param progressCallback 進捗報告用コールバック関数 (オプション)
 * @returns Promise<SwapEvent[]> すべてのスワップイベント
 */
export async function fetchAllSwapEvents(
  client: ApolloClient<any>,
  poolId: string,
  startTime: number,
  maxBatches = 100,
  batchSize = 1000,
  progressCallback?: (percent: number, message: string) => void,
): Promise<SwapEvent[]> {
  let allEvents: SwapEvent[] = [];
  let currentStartTime = startTime;
  let hasMoreData = true;
  let batchCount = 0;

  // 最後に取得したイベントのタイムスタンプを記録
  let lastTimestamp = 0;

  console.log(`データ取得開始: ${new Date(startTime * 1000).toLocaleDateString()}`);
  progressCallback?.(0, 'データ取得を開始します');

  while (hasMoreData && batchCount < maxBatches) {
    try {
      console.log(
        `バッチ ${batchCount + 1}: ${new Date(currentStartTime * 1000).toLocaleDateString()}以降のデータを取得中...`,
      );
      progressCallback?.(
        Math.min(90, (batchCount / maxBatches) * 100),
        `データバッチ ${batchCount + 1}/${maxBatches} を処理中...`,
      );

      // クエリ実行
      const result = await client.query({
        query: GET_POOL_SWAP_EVENTS,
        variables: {
          poolId,
          startTime: currentStartTime,
          first: batchSize,
          orderDirection: 'asc', // 昇順で取得し、次のバッチの開始点を決定しやすくする
        },
        fetchPolicy: 'network-only', // キャッシュを使わず必ず新しいデータを取得
      });

      // 取得したデータ
      const fetchedEvents: SwapEvent[] = result.data?.Swap || [];
      console.log(`${fetchedEvents.length}件のデータを取得しました`);

      // データがない場合は終了
      if (fetchedEvents.length === 0) {
        hasMoreData = false;
        break;
      }

      // 前回と同じデータを取得してしまった場合（安全装置）
      if (lastTimestamp === Number(fetchedEvents[fetchedEvents.length - 1].timestamp)) {
        console.log('前回と同じデータを取得したため終了します');
        hasMoreData = false;
        break;
      }

      // 結果を追加
      allEvents = [...allEvents, ...fetchedEvents];

      // 次のバッチの開始時間を設定
      const lastEvent = fetchedEvents[fetchedEvents.length - 1];
      lastTimestamp = Number(lastEvent.timestamp);

      // 次のバッチの開始時間は、最後のイベントのタイムスタンプ + 1秒
      currentStartTime = lastTimestamp + 1;

      // 取得したデータが指定した量より少ない場合はもうデータがない
      if (fetchedEvents.length < batchSize) {
        hasMoreData = false;
      }

      batchCount++;

      // 進捗状況をログに出力
      console.log(
        `現在の合計: ${allEvents.length}件, 次の開始時間: ${new Date(currentStartTime * 1000).toLocaleDateString()}`,
      );

      // API制限を考慮して少し待機（必要に応じて）
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error('スワップイベント取得エラー:', error);
      progressCallback?.(100, `エラーが発生しました: ${error}`);
      throw error; // エラーを上位に伝播
    }
  }

  console.log(`取得完了: 合計${allEvents.length}件のデータを取得しました`);
  progressCallback?.(100, `取得完了: ${allEvents.length}件のデータ`);
  return allEvents;
}

/**
 * スワップイベントから拡張チャートデータを作成する関数
 * LiquidityFeesChartコンポーネントで使用可能なデータ形式に変換
 *
 * @param swapEvents スワップイベント配列
 * @param feeTier 手数料率
 * @param poolLiquidityData プールの流動性データ（オプション）
 * @returns ChartDataPoint[] チャート用データポイント
 */
export function createChartDataFromSwapEvents(
  swapEvents: SwapEvent[],
  feeTier: string,
  poolLiquidityData?: any[],
): ChartDataPoint[] {
  // 日別データへの集計
  const dailyData: { [key: string]: any } = {};

  // 手数料率の計算
  const feeRate = Number(feeTier) / 1000000;

  // 日付でグループ化
  swapEvents.forEach((event) => {
    const timestamp = Number(event.timestamp || 0);
    if (timestamp === 0) return;

    const date = new Date(timestamp * 1000);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    const dayStartTimestamp = Math.floor(
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000,
    );

    // 金額の計算
    const amountUSD = Number(event.amountUSD || 0);
    const feeUSD = amountUSD * feeRate;

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        timestamp: dayStartTimestamp,
        dailyVolumeUSD: 0,
        dailyFeeUSD: 0,
        txCount: 0,
        tvlUSD: 0,
        liquidity: 0,
      };
    }

    dailyData[dateKey].dailyVolumeUSD += amountUSD;
    dailyData[dateKey].dailyFeeUSD += feeUSD;
    dailyData[dateKey].txCount += 1;
  });

  // 流動性データがある場合は、それも追加
  if (poolLiquidityData && poolLiquidityData.length > 0) {
    poolLiquidityData.forEach((item) => {
      const timestamp = Number(item.timestamp || 0);
      if (timestamp === 0) return;

      const date = new Date(timestamp * 1000);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;

      if (dailyData[dateKey]) {
        dailyData[dateKey].tvlUSD = Number(item.totalValueLockedUSD || 0);
        dailyData[dateKey].liquidity = Number(item.liquidity || 0);
      }
    });
  }

  // 日付順に並べ替え
  const sortedData = Object.values(dailyData).sort((a, b) => a.timestamp - b.timestamp);

  // TVLデータが不足している場合、直前の値で補完
  let lastTvl = 0;
  let lastLiquidity = 0;

  for (const item of sortedData) {
    if (item.tvlUSD === 0 && lastTvl !== 0) {
      item.tvlUSD = lastTvl;
    } else {
      lastTvl = item.tvlUSD;
    }

    if (item.liquidity === 0 && lastLiquidity !== 0) {
      item.liquidity = lastLiquidity;
    } else {
      lastLiquidity = item.liquidity;
    }
  }

  return sortedData as ChartDataPoint[];
}

/**
 * 日付範囲を指定して全てのスワップイベントを取得する関数
 *
 * @param client ApolloClientインスタンス
 * @param poolId プールID
 * @param startDate 開始日（JavaScriptのDate型）
 * @param endDate 終了日（JavaScriptのDate型、省略可）
 * @param progressCallback 進捗報告用コールバック関数 (オプション)
 * @returns Promise<SwapEvent[]> 指定期間のすべてのスワップイベント
 */
export async function fetchSwapEventsByDateRange(
  client: ApolloClient<any>,
  poolId: string,
  startDate: Date,
  endDate: Date = new Date(),
  progressCallback?: (percent: number, message: string) => void,
): Promise<SwapEvent[]> {
  // 日付をUnixタイムスタンプ（秒）に変換
  const startTime = Math.floor(startDate.getTime() / 1000);
  const endTime = Math.floor(endDate.getTime() / 1000);

  // データ取得
  const events = await fetchAllSwapEvents(client, poolId, startTime, 100, 1000, progressCallback);

  // 終了日で絞り込み
  return events.filter((event) => {
    const eventTime = Number(event.timestamp || 0);
    return eventTime <= endTime;
  });
}
