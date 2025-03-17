import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import {
  GET_POOL_DETAILS,
  GET_POOL_SWAP_EVENTS,
  GET_RECENT_MODIFY_LIQUIDITY_EVENTS,
  GET_POOL_TICKS,
  GET_ACTIVE_POOL_LIQUIDITY_POSITIONS,
  GET_TOKEN_INFO,
  GET_BUNDLE
} from '../../lib/queries';
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  formatTimestampRelative,
  getTimeRangeTimestamp,
  shortenAddress,
} from '../../lib/utils';
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
} from '../../types';

export default function PoolDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [timeRange, setTimeRange] = useState('90d'); // 90日表示をデフォルトに
  const [activeTab, setActiveTab] = useState('liquidity');
  const [token0Id, setToken0Id] = useState<string | undefined>(undefined);
  const [token1Id, setToken1Id] = useState<string | undefined>(undefined);

  // プールの詳細データを取得
  const {
    loading: poolLoading,
    error: poolError,
    data: poolData,
  } = useQuery(GET_POOL_DETAILS, {
    variables: {
      poolId: id,
    },
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
    variables: {
      tokenId: token0Id || '',
    },
    skip: !token0Id,
    client,
  });

  // トークン1の情報を取得
  const {
    loading: token1Loading,
    error: token1Error,
    data: token1Data,
  } = useQuery(GET_TOKEN_INFO, {
    variables: {
      tokenId: token1Id || '',
    },
    skip: !token1Id,
    client,
  });

  // バンドル情報（ETH価格）を取得
  const {
    loading: bundleLoading,
    error: bundleError,
    data: bundleData,
  } = useQuery<BundleQueryResult>(GET_BUNDLE, {
    variables: {
      chainId: poolData?.Pool_by_pk?.chainId?.toString() || '1',
    },
    skip: !poolData?.Pool_by_pk?.chainId,
    client,
  });

  const bundle = bundleData?.Bundle_by_pk;

  // 時間範囲に基づいたタイムスタンプを取得
  const startTimestamp = useMemo(() => getTimeRangeTimestamp(timeRange), [timeRange]);

  // 流動性イベントを取得
  const {
    loading: liquidityEventsLoading,
    error: liquidityEventsError,
    data: liquidityEventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: {
      poolId: id,
      startTime: startTimestamp,
      first: 1000,
    },
    skip: !id,
    client,
  });

  // スワップイベントを取得（手数料計算のため）
  const {
    loading: swapsLoading,
    error: swapsError,
    data: swapsData,
  } = useQuery<SwapEventsQueryResult>(GET_POOL_SWAP_EVENTS, {
    variables: {
      poolId: id,
      startTime: startTimestamp,
      first: 1000,
    },
    skip: !id,
    client,
  });

  // 最近の流動性イベントを取得（イベントタブ用）
  const {
    loading: eventsLoading,
    error: eventsError,
    data: eventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: { poolId: id, first: 50 },
    skip: !id || activeTab !== 'events',
    client,
  });

  // アクティブな流動性ポジションを取得
  const {
    loading: positionsLoading,
    error: positionsError,
    data: positionsData,
  } = useQuery<LiquidityPositionsQueryResult>(GET_ACTIVE_POOL_LIQUIDITY_POSITIONS, {
    variables: { poolId: id },
    skip: !id || (activeTab !== 'positions' && activeTab !== 'ticks'),
    client,
  });

  // プールのTick分布データを取得
  const {
    loading: ticksLoading,
    error: ticksError,
    data: ticksData,
  } = useQuery<TicksQueryResult>(GET_POOL_TICKS, {
    variables: { poolId: id },
    skip: !id || activeTab !== 'ticks',
    client,
  });

  // 流動性と手数料のチャートデータを生成
  const chartData = useLiquidityHistory(
    liquidityEventsData?.ModifyLiquidity,
    swapsData?.Swap,
    poolData?.Pool_by_pk,
    timeRange
  );

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
  const isChartLoading = liquidityEventsLoading || swapsLoading;

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
                <div className='card p-8 text-center'>
                  <p className='text-gray-500'>チャートデータを読み込み中...</p>
                </div>
              ) : liquidityEventsError || swapsError ? (
                <div className='card p-8 text-center'>
                  <p className='text-red-500'>
                    エラーが発生しました: {(liquidityEventsError || swapsError)?.message}
                  </p>
                </div>
              ) : chartData.length > 0 ? (
                <LiquidityFeesChart
                  data={chartData}
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  feeTier={pool.feeTier}
                />
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
              <SwapDetailsTable
                swaps={swapsData?.Swap || []}
                token0Symbol={token0Symbol}
                token1Symbol={token1Symbol}
                feeTier={pool.feeTier}
                loading={swapsLoading}
                error={swapsError}
                networkName='Ethereum'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import {
  GET_POOL_DETAILS,
  GET_POOL_SWAP_EVENTS,
  GET_RECENT_MODIFY_LIQUIDITY_EVENTS,
  GET_POOL_TICKS,
  GET_ACTIVE_POOL_LIQUIDITY_POSITIONS,
  GET_TOKEN_INFO,
  GET_BUNDLE
} from '../../lib/queries';
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  formatTimestampRelative,
  getTimeRangeTimestamp,
  shortenAddress,
} from '../../lib/utils';
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
} from '../../types';

export default function PoolDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [timeRange, setTimeRange] = useState('90d'); // 90日表示をデフォルトに
  const [activeTab, setActiveTab] = useState('liquidity');
  const [token0Id, setToken0Id] = useState<string | undefined>(undefined);
  const [token1Id, setToken1Id] = useState<string | undefined>(undefined);

  // プールの詳細データを取得
  const {
    loading: poolLoading,
    error: poolError,
    data: poolData,
  } = useQuery(GET_POOL_DETAILS, {
    variables: {
      poolId: id,
    },
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
    variables: {
      tokenId: token0Id || '',
    },
    skip: !token0Id,
    client,
  });

  // トークン1の情報を取得
  const {
    loading: token1Loading,
    error: token1Error,
    data: token1Data,
  } = useQuery(GET_TOKEN_INFO, {
    variables: {
      tokenId: token1Id || '',
    },
    skip: !token1Id,
    client,
  });

  // バンドル情報（ETH価格）を取得
  const {
    loading: bundleLoading,
    error: bundleError,
    data: bundleData,
  } = useQuery<BundleQueryResult>(GET_BUNDLE, {
    variables: {
      chainId: poolData?.Pool_by_pk?.chainId?.toString() || '1',
    },
    skip: !poolData?.Pool_by_pk?.chainId,
    client,
  });

  const bundle = bundleData?.Bundle_by_pk;

  // 時間範囲に基づいたタイムスタンプを取得
  const startTimestamp = useMemo(() => getTimeRangeTimestamp(timeRange), [timeRange]);

  // 流動性イベントを取得
  const {
    loading: liquidityEventsLoading,
    error: liquidityEventsError,
    data: liquidityEventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: {
      poolId: id,
      startTime: startTimestamp,
      first: 1000,
    },
    skip: !id,
    client,
  });

  // スワップイベントを取得（手数料計算のため）
  const {
    loading: swapsLoading,
    error: swapsError,
    data: swapsData,
  } = useQuery<SwapEventsQueryResult>(GET_POOL_SWAP_EVENTS, {
    variables: {
      poolId: id,
      startTime: startTimestamp,
      first: 1000,
    },
    skip: !id,
    client,
  });

  // 最近の流動性イベントを取得（イベントタブ用）
  const {
    loading: eventsLoading,
    error: eventsError,
    data: eventsData,
  } = useQuery<ModifyLiquidityEventsQueryResult>(GET_RECENT_MODIFY_LIQUIDITY_EVENTS, {
    variables: { poolId: id, first: 50 },
    skip: !id || activeTab !== 'events',
    client,
  });

  // アクティブな流動性ポジションを取得
  const {
    loading: positionsLoading,
    error: positionsError,
    data: positionsData,
  } = useQuery<LiquidityPositionsQueryResult>(GET_ACTIVE_POOL_LIQUIDITY_POSITIONS, {
    variables: { poolId: id },
    skip: !id || (activeTab !== 'positions' && activeTab !== 'ticks'),
    client,
  });

  // プールのTick分布データを取得
  const {
    loading: ticksLoading,
    error: ticksError,
    data: ticksData,
  } = useQuery<TicksQueryResult>(GET_POOL_TICKS, {
    variables: { poolId: id },
    skip: !id || activeTab !== 'ticks',
    client,
  });

  // 流動性と手数料のチャートデータを生成
  const chartData = useLiquidityHistory(
    liquidityEventsData?.ModifyLiquidity,
    swapsData?.Swap,
    poolData?.Pool_by_pk,
    timeRange
  );

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
  const isChartLoading = liquidityEventsLoading || swapsLoading;

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
                <div className='card p-8 text-center'>
                  <p className='text-gray-500'>チャートデータを読み込み中...</p>
                </div>
              ) : liquidityEventsError || swapsError ? (
                <div className='card p-8 text-center'>
                  <p className='text-red-500'>
                    エラーが発生しました: {(liquidityEventsError || swapsError)?.message}
                  </p>
                </div>
              ) : chartData.length > 0 ? (
                <LiquidityFeesChart
                  data={chartData}
                  token0Symbol={token0Symbol}
                  token1Symbol={token1Symbol}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  feeTier={pool.feeTier}
                />
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
              <SwapDetailsTable
                swaps={swapsData?.Swap || []}
                token0Symbol={token0Symbol}
                token1Symbol={token1Symbol}
                feeTier={pool.feeTier}
                loading={swapsLoading}
                error={swapsError}
                networkName='Ethereum'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}