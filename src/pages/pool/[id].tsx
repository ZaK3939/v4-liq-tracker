import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useApolloClient } from '@apollo/client';
import Link from 'next/link';
import {
  GET_POOL_DETAILS,
  GET_POOL_SWAP_EVENTS,
  GET_RECENT_MODIFY_LIQUIDITY_EVENTS,
  GET_POOL_TICKS,
  GET_ACTIVE_POOL_LIQUIDITY_POSITIONS,
  GET_TOKEN_INFO,
  GET_BUNDLE,
} from '../../lib/queries';
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  formatTimestampRelative,
  getTimeRangeTimestamp,
  shortenAddress,
} from '../../lib/utils';
import { fetchAllSwapEvents, createChartDataFromSwapEvents } from '../../lib/swapDataFetcher';
import LiquidityFeesChart from '../../components/LiquidityFeesChart';
import LiquidityDepthChart from '../../components/LiquidityDepthChart';
import LiquidityEventsTable from '../../components/LiquidityEventsTable';
import LiquidityPositionsTable from '../../components/LiquidityPositionsTable';
import SwapDetailsTable from '../../components/SwapDetailsTable';
import ActiveTickRangeChart from '../../components/ActiveTickRangeChart';
import { useLiquidityHistory } from '../../lib/liquidityHistoryUtils';
import { generateTicksFromPositions } from '../../lib/tickDataProcessor';
import { client } from '../../lib/apollo-client';
import {
  PoolDetailsQueryResult,
  SwapEventsQueryResult,
  ModifyLiquidityEventsQueryResult,
  LiquidityPositionsQueryResult,
  TicksQueryResult,
  BundleQueryResult,
  ChartDataPoint,
  SwapEvent,
  ExtendedChartDataPoint,
} from '../../types';

export default function PoolDetail() {
  const router = useRouter();
  const apolloClient = useApolloClient();
  const { id } = router.query;
  const [timeRange, setTimeRange] = useState('90d'); // 90日表示をデフォルトに
  const [activeTab, setActiveTab] = useState('liquidity');
  const [token0Id, setToken0Id] = useState<string | undefined>(undefined);
  const [token1Id, setToken1Id] = useState<string | undefined>(undefined);

  // 大量データ取得のための状態
  const [isLoadingSwapData, setIsLoadingSwapData] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [allSwapEvents, setAllSwapEvents] = useState<SwapEvent[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);

  // プールの詳細データを取得 - 単独のクエリ（TokenInfoは別に取得）
  const {
    loading: poolLoading,
    error: poolError,
    data: poolData,
  } = useQuery(GET_POOL_DETAILS, {
    variables: id
      ? {
          poolId: id,
          token0Id: '0', // ダミー値（このクエリではトークン情報は使用しない）
          token1Id: '0', // ダミー値（このクエリではトークン情報は使用しない）
        }
      : undefined,
    skip: !id,
    client,
  });

  // token IDを取得した後、トークン情報を取得
  useEffect(() => {
    if (poolData?.Pool_by_pk?.token0 && !token0Id) {
      setToken0Id(poolData.Pool_by_pk.token0);
    }
    if (poolData?.Pool_by_pk?.token1 && !token1Id) {
      setToken1Id(poolData.Pool_by_pk.token1);
    }
  }, [poolData?.Pool_by_pk?.token0, poolData?.Pool_by_pk?.token1, token0Id, token1Id]);

  // トークン0の情報を取得
  const {
    loading: token0Loading,
    error: token0Error,
    data: token0Data,
  } = useQuery(GET_TOKEN_INFO, {
    variables: token0Id ? { tokenId: token0Id } : undefined,
    skip: !token0Id,
    client,
  });

  // トークン1の情報を取得
  const {
    loading: token1Loading,
    error: token1Error,
    data: token1Data,
  } = useQuery(GET_TOKEN_INFO, {
    variables: token1Id ? { tokenId: token1Id } : undefined,
    skip: !token1Id,
    client,
  });

  // バンドル情報（ETH価格）を取得
  const {
    loading: bundleLoading,
    error: bundleError,
    data: bundleData,
  } = useQuery<BundleQueryResult>(GET_BUNDLE, {
    variables: poolData?.Pool_by_pk?.chainId ? { chainId: poolData.Pool_by_pk.chainId.toString() } : undefined,
    skip: !poolData?.Pool_by_pk?.chainId,
    client,
  });

  const bundle = bundleData?.Bundle_by_pk;

  // 時間範囲に基づいたタイムスタンプを取得
  const startTimestamp = useMemo(() => getTimeRangeTimestamp(timeRange), [timeRange]);

  // 大量データを取得する関数 (改良版)
  const fetchLargeSwapDataset = async () => {
    if (!id || !poolData?.Pool_by_pk?.feeTier) return;

    setIsLoadingSwapData(true);
    setDataError(null);
    setAllSwapEvents([]);

    try {
      // 進捗報告用コールバック
      const updateProgress = (percent: number, message: string) => {
        setLoadingProgress(percent);
        setLoadingMessage(message);
      };

      // 大量データ取得（ページネーションを使用）
      const events = await fetchAllSwapEvents(
        apolloClient,
        id as string,
        startTimestamp,
        100, // 最大バッチ数（最大10万件）
        1000, // 1回あたりの取得数
        updateProgress,
      );

      setAllSwapEvents(events);

      // チャート用データ形式に変換
      const chartPoints = createChartDataFromSwapEvents(
        events,
        poolData.Pool_by_pk.feeTier,
        [], // 流動性データは別途取得
      );

      setChartData(chartPoints);
    } catch (error) {
      console.error('大量データ取得エラー:', error);
      setDataError(`データの取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsLoadingSwapData(false);
    }
  };

  // 初回マウント時、およびtimeRangeが変わるたびにデータを取得
  useEffect(() => {
    if (id && poolData?.Pool_by_pk?.feeTier && activeTab === 'liquidity') {
      fetchLargeSwapDataset();
    }
  }, [id, poolData?.Pool_by_pk?.feeTier, timeRange, activeTab]);

  // 流動性イベントを取得
  const {
    loading: liquidityEventsLoading,
    error: liquidityEventsError,
    data: liquidityEventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: id
      ? {
          poolId: id,
          startTime: startTimestamp,
          first: 1000,
        }
      : undefined,
    skip: !id || isLoadingSwapData, // 大量データ取得中はスキップ
    client,
  });

  // 既存の小さなスワップイベントクエリ（SwapDetailsTabで表示する用）
  const {
    loading: swapsLoading,
    error: swapsError,
    data: swapsData,
  } = useQuery<SwapEventsQueryResult>(GET_POOL_SWAP_EVENTS, {
    variables: id
      ? {
          poolId: id,
          startTime: 0, // すべてのスワップを取得
          first: 100, // 表示用に最新100件だけ
        }
      : undefined,
    skip: !id || activeTab !== 'swaps', // スワップタブでのみ実行
    client,
  });

  // 最近の流動性イベントを取得（イベントタブ用）
  const {
    loading: eventsLoading,
    error: eventsError,
    data: eventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: id
      ? {
          poolId: id,
          first: 50,
          startTime: 0, // 明示的に0を指定
        }
      : undefined,
    skip: !id || activeTab !== 'events',
    client,
  });

  // アクティブな流動性ポジションを取得
  const {
    loading: positionsLoading,
    error: positionsError,
    data: positionsData,
  } = useQuery<LiquidityPositionsQueryResult>(GET_ACTIVE_POOL_LIQUIDITY_POSITIONS, {
    variables: id ? { poolId: id } : undefined,
    skip: !id || (activeTab !== 'positions' && activeTab !== 'ticks'),
    client,
  });

  // プールのTick分布データを取得
  const {
    loading: ticksLoading,
    error: ticksError,
    data: ticksData,
  } = useQuery<TicksQueryResult>(GET_POOL_TICKS, {
    variables: id ? { poolId: id } : undefined,
    skip: !id || activeTab !== 'ticks',
    client,
  });

  // 流動性履歴データを使用してチャートデータを生成（既存のチャートデータと結合）
  const liquidityHistoryData = useLiquidityHistory(
    liquidityEventsData?.ModifyLiquidity,
    [], // スワップデータは大量データ取得で別途処理
    poolData?.Pool_by_pk,
    timeRange,
  );

  // 両方のデータソースを結合（大量データ取得と流動性ヒストリー）
  const combinedChartData = useMemo(() => {
    if (isLoadingSwapData) return []; // ロード中は空配列

    // 大量データ取得で生成したデータを優先
    if (chartData.length > 0) {
      // 流動性値をliquidityHistoryDataから取得
      const liquidityDataMap = new Map();
      liquidityHistoryData.forEach((item) => {
        liquidityDataMap.set(item.timestamp, {
          tvlUSD: item.tvlUSD,
          liquidity: item.liquidity,
        });
      });

      // chartDataにliquidityHistoryDataの情報を追加
      return chartData.map((item) => {
        const liquidityInfo = liquidityDataMap.get(item.timestamp);
        return {
          ...item,
          tvlUSD: liquidityInfo?.tvlUSD || item.tvlUSD,
          liquidity: liquidityInfo?.liquidity || item.liquidity,
        };
      }) as unknown as ExtendedChartDataPoint[]; // 型をExtendedChartDataPoint[]としてキャスト
    }

    // 既存のデータを返す
    return liquidityHistoryData as unknown as ExtendedChartDataPoint[]; // 型をExtendedChartDataPoint[]としてキャスト
  }, [chartData, liquidityHistoryData, isLoadingSwapData]);

  // プールデータがあるか確認
  const pool = poolData?.Pool_by_pk;

  // トークン情報
  const token0 = token0Data?.Token_by_pk || { symbol: '', name: '', decimals: '' };
  const token1 = token1Data?.Token_by_pk || { symbol: '', name: '', decimals: '' };

  const token0Symbol = token0.symbol || '';
  const token1Symbol = token1.symbol || '';
  const currentTick = Number(pool?.tick || 0);
  const tickSpacing = Number(pool?.tickSpacing || 60);
  const hasHooks = pool?.hooks && pool?.hooks !== '0x0000000000000000000000000000000000000000';

  // ローディング状態の確認
  const isLoading = poolLoading || (token0Id && token0Loading) || (token1Id && token1Loading);
  const isChartLoading = isLoadingSwapData || liquidityEventsLoading;

  // 期間選択の変更ハンドラ
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  if (!id || isLoading)
    return (
      <div className='container mx-auto p-4'>
        <div className='max-w-6xl mx-auto py-8 text-center'>
          <p className='text-gray-500'>読み込み中...</p>
        </div>
      </div>
    );

  if (poolError || token0Error || token1Error)
    return (
      <div className='container mx-auto p-4'>
        <div className='max-w-6xl mx-auto py-8 text-center'>
          <p className='text-red-500'>エラーが発生しました: {(poolError || token0Error || token1Error)?.message}</p>
        </div>
      </div>
    );

  if (!pool)
    return (
      <div className='container mx-auto p-4'>
        <div className='max-w-6xl mx-auto py-8 text-center'>
          <p className='text-gray-500'>プールが見つかりませんでした</p>
        </div>
      </div>
    );

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-6xl mx-auto'>
        <div className='flex items-center mb-6'>
          <Link href='/' className='text-blue-500 hover:underline mr-4 flex items-center'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-1'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            戻る
          </Link>
          <h1 className='text-2xl font-bold'>
            {token0Symbol} / {token1Symbol} プール
            {hasHooks && (
              <span className='ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full'>Hook</span>
            )}
          </h1>
        </div>

        <div className='card mb-6'>
          <h2 className='card-title'>プール情報</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <p className='mb-2'>
                <span className='font-medium'>プールID:</span>{' '}
                <span className='text-sm text-gray-600'>{id as string}</span>
              </p>
              <p className='mb-2'>
                <span className='font-medium'>トークン0:</span> {token0Symbol}{' '}
                <a
                  href={`https://etherscan.io/token/${pool.token0}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-500 hover:underline text-sm'
                >
                  ({shortenAddress(pool.token0)})
                </a>
              </p>
              <p className='mb-2'>
                <span className='font-medium'>トークン1:</span> {token1Symbol}{' '}
                <a
                  href={`https://etherscan.io/token/${pool.token1}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-500 hover:underline text-sm'
                >
                  ({shortenAddress(pool.token1)})
                </a>
              </p>
              <p className='mb-2'>
                <span className='font-medium'>手数料率:</span> {Number(pool.feeTier) / 10000}%
              </p>
              {hasHooks && (
                <p className='mb-2'>
                  <span className='font-medium'>Hook:</span>{' '}
                  <a
                    href={`https://etherscan.io/address/${pool.hooks}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-500 hover:underline'
                  >
                    {shortenAddress(pool.hooks)}
                  </a>
                </p>
              )}
            </div>
            <div>
              <p className='mb-2'>
                <span className='font-medium'>総流動性 (USD):</span> {formatUSD(pool.totalValueLockedUSD)}
              </p>
              <p className='mb-2'>
                <span className='font-medium'>現在のTick:</span> {pool.tick}
              </p>
              <p className='mb-2'>
                <span className='font-medium'>流動性プロバイダー数:</span>{' '}
                {Number(pool.liquidityProviderCount).toLocaleString()}
              </p>
              <p className='mb-2'>
                <span className='font-medium'>トランザクション数:</span> {Number(pool.txCount).toLocaleString()}
              </p>
              <p className='mb-2'>
                <span className='font-medium'>作成日:</span> {formatTimestamp(pool.createdAtTimestamp)}{' '}
                <span className='text-gray-500 text-sm'>({formatTimestampRelative(pool.createdAtTimestamp)})</span>
              </p>
            </div>
          </div>
        </div>

        <div className='mb-4 border-b'>
          <ul className='flex flex-wrap -mb-px'>
            <li className='mr-2'>
              <button
                className={`tab-button ${activeTab === 'liquidity' ? 'tab-button-active' : 'tab-button-inactive'}`}
                onClick={() => setActiveTab('liquidity')}
              >
                流動性チャート
              </button>
            </li>
            <li className='mr-2'>
              <button
                className={`tab-button ${activeTab === 'positions' ? 'tab-button-active' : 'tab-button-inactive'}`}
                onClick={() => setActiveTab('positions')}
              >
                流動性ポジション
              </button>
            </li>
            <li className='mr-2'>
              <button
                className={`tab-button ${activeTab === 'ticks' ? 'tab-button-active' : 'tab-button-inactive'}`}
                onClick={() => setActiveTab('ticks')}
              >
                Tick分布
              </button>
            </li>
            <li className='mr-2'>
              <button
                className={`tab-button ${activeTab === 'events' ? 'tab-button-active' : 'tab-button-inactive'}`}
                onClick={() => setActiveTab('events')}
              >
                流動性イベント
              </button>
            </li>
            <li className='mr-2'>
              <button
                className={`tab-button ${activeTab === 'swaps' ? 'tab-button-active' : 'tab-button-inactive'}`}
                onClick={() => setActiveTab('swaps')}
              >
                スワップ
              </button>
            </li>
          </ul>
        </div>

        {/* タブコンテンツ */}
        <div className='mt-6'>
          {/* 流動性と手数料チャート */}
          {activeTab === 'liquidity' && (
            <div className='fade-in'>
              {isChartLoading ? (
                <div className='card p-8'>
                  <h2 className='text-xl font-bold mb-4'>データを読み込み中...</h2>
                  <div className='w-full bg-gray-200 rounded-full h-2.5 mb-2'>
                    <div
                      className='bg-blue-600 h-2.5 rounded-full transition-all duration-300'
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className='text-sm text-gray-600'>{loadingMessage}</p>
                  <p className='mt-4 text-sm text-gray-500'>
                    {timeRange === '90d'
                      ? '過去3ヶ月分のデータを取得しています。この処理には時間がかかる場合があります。'
                      : '過去のデータを取得しています。'}
                  </p>
                </div>
              ) : dataError || liquidityEventsError ? (
                <div className='card p-8 text-center'>
                  <p className='text-red-500'>エラーが発生しました: {dataError || liquidityEventsError?.message}</p>
                  <button
                    className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                    onClick={() => fetchLargeSwapDataset()}
                  >
                    再試行
                  </button>
                </div>
              ) : combinedChartData.length > 0 ? (
                <>
                  {/* データ情報 */}
                  {allSwapEvents.length > 0 && (
                    <div className='mb-4 p-3 bg-blue-50 rounded-md'>
                      <div className='text-sm text-blue-800'>
                        <span className='font-medium'>処理済みデータ: </span>
                        <span>{allSwapEvents.length.toLocaleString()}件のスワップイベント</span>
                        <span className='mx-2'>|</span>
                        <span>{combinedChartData.length}日分のデータ</span>
                        <span className='mx-2'>|</span>
                        <span className='font-medium'>期間: </span>
                        <span>
                          {combinedChartData.length > 0
                            ? `${new Date(combinedChartData[0].timestamp * 1000).toLocaleDateString(
                                'ja-JP',
                              )} ~ ${new Date(
                                combinedChartData[combinedChartData.length - 1].timestamp * 1000,
                              ).toLocaleDateString('ja-JP')}`
                            : '利用可能なデータなし'}
                        </span>
                      </div>
                    </div>
                  )}

                  <LiquidityFeesChart
                    data={combinedChartData}
                    token0Symbol={token0Symbol}
                    token1Symbol={token1Symbol}
                    timeRange={timeRange}
                    onTimeRangeChange={handleTimeRangeChange}
                    feeTier={pool.feeTier}
                  />
                </>
              ) : (
                <div className='card p-8 text-center'>
                  <p className='text-gray-500'>選択した期間のデータがありません</p>
                </div>
              )}
            </div>
          )}

          {/* 流動性ポジション */}
          {activeTab === 'positions' && (
            <div className='card fade-in'>
              <h2 className='card-title'>アクティブな流動性ポジション</h2>
              <LiquidityPositionsTable
                positions={positionsData?.LiquidityPosition || []}
                token0={token0}
                token1={token1}
                ethPrice={bundle?.ethPriceUSD || '0'}
                currentTick={currentTick}
                loading={positionsLoading}
                error={positionsError}
              />
            </div>
          )}

          {/* Tick分布 */}
          {activeTab === 'ticks' && (
            <div className='fade-in'>
              {ticksLoading ? (
                <div className='card p-8 text-center'>
                  <p className='text-gray-500'>Tickデータを読み込み中...</p>
                </div>
              ) : ticksError ? (
                <div className='card p-8 text-center'>
                  <p className='text-red-500'>Tickデータの取得中にエラーが発生しました: {ticksError.message}</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-6'>
                  {/* アクティブティック範囲チャート */}
                  <ActiveTickRangeChart
                    tickData={generateTicksFromPositions(positionsData?.LiquidityPosition || [], poolData?.Pool_by_pk)}
                    currentTick={currentTick}
                    token0Symbol={token0Symbol}
                    token1Symbol={token1Symbol}
                    maxTicksToShow={200}
                  />

                  {/* 流動性の厚さチャート */}
                  {ticksData?.positions && ticksData.positions.length > 0 ? (
                    <LiquidityDepthChart
                      tickData={ticksData.positions}
                      currentTick={currentTick}
                      token0Symbol={token0Symbol}
                      token1Symbol={token1Symbol}
                      tickSpacing={tickSpacing}
                    />
                  ) : positionsData?.LiquidityPosition && positionsData.LiquidityPosition.length > 0 ? (
                    <LiquidityDepthChart
                      tickData={positionsData.LiquidityPosition}
                      currentTick={currentTick}
                      token0Symbol={token0Symbol}
                      token1Symbol={token1Symbol}
                      tickSpacing={tickSpacing}
                    />
                  ) : (
                    <div className='card p-8 text-center'>
                      <p className='text-gray-500'>このプールのTickデータはありません</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 流動性イベント */}
          {activeTab === 'events' && (
            <div className='card fade-in'>
              <h2 className='card-title'>最近の流動性イベント</h2>
              <LiquidityEventsTable
                events={eventsData?.ModifyLiquidity || []}
                token0Symbol={token0Symbol}
                token1Symbol={token1Symbol}
                loading={eventsLoading}
                error={eventsError}
                type='liquidity'
              />
            </div>
          )}

          {/* スワップ */}
          {activeTab === 'swaps' && (
            <div className='card fade-in'>
              {allSwapEvents.length > 0 ? (
                <>
                  <div className='mb-4 p-3 bg-blue-50 rounded-md'>
                    <div className='text-sm text-blue-800'>
                      <span className='font-medium'>スワップ取引データ: </span>
                      <span>全{allSwapEvents.length.toLocaleString()}件 （直近100件のみ表示）</span>
                    </div>
                  </div>
                  <SwapDetailsTable
                    swaps={allSwapEvents.slice(0, 100)}
                    token0Symbol={token0Symbol}
                    token1Symbol={token1Symbol}
                    feeTier={pool.feeTier}
                    loading={false}
                    error={null}
                    networkName='Ethereum'
                  />
                </>
              ) : (
                <SwapDetailsTable
                  swaps={swapsData?.Swap || []}
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                  feeTier={pool.feeTier}
                  loading={swapsLoading}
                  error={swapsError}
                  networkName='Ethereum'
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
