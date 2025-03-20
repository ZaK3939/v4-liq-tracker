import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { formatUSD, formatNumber } from '../lib/utils';
import { ExtendedChartDataPoint } from '@/types';

export interface LiquidityFeesChartProps {
  /** チャートに表示するデータポイント配列 */
  data: ExtendedChartDataPoint[];
  /** Token0のシンボル */
  token0Symbol: string;
  /** Token1のシンボル */
  token1Symbol: string;
  /** 時間範囲 (90d) */
  timeRange: string;
  /** 時間範囲変更ハンドラ - 90dのみ使用なので実際は使用しない */
  onTimeRangeChange?: (range: string) => void;
  /** プールの手数料率 (例: '3000' = 0.3%) */
  feeTier?: string;
  /** データがロード中かどうか */
  loading?: boolean;
}

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
  payload: {
    [key: string]: any;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number | string;
}

/**
 * 流動性と手数料のチャートを表示するコンポーネント
 * 大量データの効率的な処理に対応
 */
const LiquidityFeesChart: React.FC<LiquidityFeesChartProps> = ({
  data,
  token0Symbol,
  token1Symbol,
  timeRange,
  onTimeRangeChange,
  feeTier,
  loading = false,
}) => {
  const [activeDataKeys, setActiveDataKeys] = useState<{
    tvlUSD: boolean;
    dailyFeeUSD: boolean;
  }>({
    tvlUSD: true,
    dailyFeeUSD: true,
  });

  // データを効率的に処理
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // データ量が多い場合は間引く処理（例: 90日を超えるデータの場合）
    if (data.length > 90) {
      const dataLength = data.length;
      const skipFactor = Math.floor(dataLength / 90);

      if (skipFactor > 1) {
        return data.filter((_, index) => index % skipFactor === 0);
      }
    }

    return data;
  }, [data]);

  // X軸のフォーマット関数
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // カスタムツールチップコンポーネント
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(Number(label) * 1000);
      const formattedDate = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      return (
        <div className='bg-white p-3 border border-gray-200 shadow-lg rounded'>
          <p className='text-sm text-gray-600 mb-2'>{formattedDate}</p>
          {payload.map((entry, index) => {
            // Skip rendering if value is 0
            if (entry.value === 0) return null;

            // 値のフォーマット
            let formattedValue: string;
            let label = entry.name;

            if (entry.dataKey === 'tvlUSD') {
              formattedValue = formatUSD(entry.value);
              label = '総流動性 (USD)';
            } else if (entry.dataKey === 'dailyFeeUSD') {
              formattedValue = formatUSD(entry.value);
              label = '日次手数料 (USD)';
            } else if (entry.dataKey === 'liquidity') {
              // 流動性値は既に10^6単位でスケーリングされている
              formattedValue = `${formatNumber(entry.value)}M`;
              label = '流動性';
            } else {
              formattedValue = entry.value.toString();
            }

            return (
              <p key={`tooltip-${index}`} style={{ color: entry.color }} className='text-sm'>
                <span className='font-medium'>{label}: </span>
                {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // データキーのトグル処理
  const toggleDataKey = (key: keyof typeof activeDataKeys) => {
    setActiveDataKeys({
      ...activeDataKeys,
      [key]: !activeDataKeys[key],
    });
  };

  // 遅延計算を使用して統計値を計算 (パフォーマンス最適化)
  const stats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return {
        totalFees: 0,
        currentTvl: 0,
        currentLiq: 0,
        averageFee: 0,
        estimatedAnnualFees: 0,
        feeAPR: 0,
        liquidityChange: 0,
        liquidityChangePercent: 0,
      };
    }

    // 手数料の合計を計算
    const totalFees = processedData.reduce((sum, item) => sum + (item.dailyFeeUSD || 0), 0);

    // 直近のデータポイントから現在の流動性を取得
    const currentTvl = processedData[processedData.length - 1].tvlUSD || 0;
    const currentLiq = processedData[processedData.length - 1].liquidity || 0;

    // 平均手数料を計算
    const averageFee = processedData.length > 0 ? totalFees / processedData.length : 0;

    // 年間の概算APR (Annual Percentage Rate)を計算
    const estimatedAnnualFees = averageFee * 365;
    const feeAPR = currentTvl > 0 ? (estimatedAnnualFees / currentTvl) * 100 : 0;

    // 流動性の変化を計算
    const initialTvl = processedData[0]?.tvlUSD || 0;
    const liquidityChange = currentTvl - initialTvl;
    const liquidityChangePercent = initialTvl > 0 ? (currentTvl / initialTvl - 1) * 100 : 0;

    return {
      totalFees,
      currentTvl,
      currentLiq,
      averageFee,
      estimatedAnnualFees,
      feeAPR,
      liquidityChange,
      liquidityChangePercent,
    };
  }, [processedData]);

  // 手数料率を正確に計算 (例: 3000 -> 0.3%)
  const feeRatePercentage = feeTier ? Number(feeTier) / 10000 : 0;

  // Y軸のフォーマッター
  const rightAxisFormatter = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  // 左軸のフォーマッター (流動性値用)
  const leftAxisFormatter = (value: number) => {
    // 流動性は百万単位 (M) で表示
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  // ローディング状態の表示
  if (loading) {
    return (
      <div className='card'>
        <div className='card-header flex justify-between items-center mb-4'>
          <h2 className='card-title mb-0'>流動性・手数料推移 (90日間)</h2>
        </div>
        <div className='card-body'>
          <div className='flex items-center justify-center' style={{ height: '400px' }}>
            <div className='text-gray-500'>データを読み込み中...</div>
          </div>
        </div>
      </div>
    );
  }

  // データがない場合の表示
  if (!processedData || processedData.length === 0) {
    return (
      <div className='card'>
        <div className='card-header flex justify-between items-center mb-4'>
          <h2 className='card-title mb-0'>流動性・手数料推移 (90日間)</h2>
        </div>
        <div className='card-body'>
          <div className='flex items-center justify-center' style={{ height: '400px' }}>
            <div className='text-gray-500'>データがありません</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='card'>
      <div className='card-header flex justify-between items-center mb-4'>
        <h2 className='card-title mb-0'>流動性・手数料推移 (90日間)</h2>
      </div>

      <div className='card-body'>
        <div className='mb-4 flex flex-wrap gap-3'>
          <div
            className={`cursor-pointer flex items-center px-2 py-1 rounded ${
              activeDataKeys.tvlUSD ? 'bg-blue-100 border border-blue-300' : 'opacity-50 hover:bg-gray-100'
            }`}
            onClick={() => toggleDataKey('tvlUSD')}
          >
            <div className='w-3 h-3 rounded-full bg-blue-500 mr-1'></div>
            <span className='text-sm'>総流動性 (USD)</span>
          </div>
          <div
            className={`cursor-pointer flex items-center px-2 py-1 rounded ${
              activeDataKeys.dailyFeeUSD ? 'bg-green-100 border border-green-300' : 'opacity-50 hover:bg-gray-100'
            }`}
            onClick={() => toggleDataKey('dailyFeeUSD')}
          >
            <div className='w-3 h-3 rounded-full bg-green-500 mr-1'></div>
            <span className='text-sm'>日次手数料 (USD)</span>
          </div>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart
              data={processedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray='3 3' stroke='#eee' />
              <XAxis
                dataKey='timestamp'
                tickFormatter={formatXAxis}
                domain={['dataMin', 'dataMax']}
                type='number'
                scale='time'
                padding={{ left: 20, right: 20 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId='left'
                orientation='left'
                tickFormatter={leftAxisFormatter}
                domain={['auto', 'auto']}
                label={{
                  value: '総流動性 (USD)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 12 },
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId='right'
                orientation='right'
                domain={['auto', 'auto']}
                tickFormatter={rightAxisFormatter}
                label={{
                  value: '日次手数料 (USD)',
                  angle: 90,
                  position: 'insideRight',
                  style: { textAnchor: 'middle', fontSize: 12 },
                }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />

              {activeDataKeys.tvlUSD && (
                <Line
                  yAxisId='left'
                  type='monotone'
                  dataKey='tvlUSD'
                  name='総流動性 (USD)'
                  stroke='#3B82F6'
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}

              {activeDataKeys.dailyFeeUSD && (
                <Bar
                  yAxisId='right'
                  dataKey='dailyFeeUSD'
                  name='日次手数料 (USD)'
                  fill='#10B981'
                  isAnimationActive={false}
                  barSize={4}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className='mt-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='bg-gray-50 p-4 rounded-md'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>プール詳細</h3>
              <div className='text-sm'>
                <p>
                  <span className='font-medium'>トークンペア:</span> {token0Symbol} / {token1Symbol}
                </p>
                <p>
                  <span className='font-medium'>総流動性 (USD):</span> {formatUSD(stats.currentTvl)}
                </p>
                <p>
                  <span className='font-medium'>流動性:</span> {formatNumber(stats.currentLiq) + 'M'}
                </p>
                <p>
                  <span className='font-medium'>期間内総手数料:</span> {formatUSD(stats.totalFees)}
                </p>
                {feeTier && (
                  <p>
                    <span className='font-medium'>手数料率:</span> {feeRatePercentage}%
                  </p>
                )}
              </div>
            </div>
            <div className='bg-gray-50 p-4 rounded-md'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>収益分析</h3>
              <div className='text-sm'>
                {processedData.length > 1 && (
                  <>
                    <p>
                      <span className='font-medium'>平均日次手数料:</span> {formatUSD(stats.averageFee)}
                    </p>
                    <p>
                      <span className='font-medium'>年間手数料推定:</span> {formatUSD(stats.estimatedAnnualFees)}
                    </p>
                    <p>
                      <span className='font-medium'>推定年率 (APR):</span> {stats.feeAPR.toFixed(2)}%
                    </p>
                    <p>
                      <span className='font-medium'>流動性変化:</span> {formatUSD(stats.liquidityChange)} (
                      {stats.liquidityChangePercent.toFixed(2)}%)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidityFeesChart;
