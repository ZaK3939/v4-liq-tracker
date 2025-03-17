import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatUSD, formatNumber } from '../lib/utils';
import { ChartDataPoint } from '../types';

interface LiquidityFeesChartProps {
  data: ChartDataPoint[];
  token0Symbol: string;
  token1Symbol: string;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  feeTier?: string;
}

const LiquidityFeesChart: React.FC<LiquidityFeesChartProps> = ({
  data,
  token0Symbol,
  token1Symbol,
  timeRange,
  onTimeRangeChange,
  feeTier,
}) => {
  const [activeDataKeys, setActiveDataKeys] = useState<{
    tvlUSD: boolean;
    feesUSD: boolean;
  }>({
    tvlUSD: true,
    feesUSD: true,
  });

  // Format dates for x-axis
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp * 1000);

    if (timeRange === '24h') {
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (timeRange === '90d') {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } else {
      return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label * 1000);
      const formattedDate = date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <div className='bg-white p-3 border border-gray-200 shadow-lg rounded'>
          <p className='text-sm text-gray-600 mb-2'>{formattedDate}</p>
          {payload.map((entry: any, index: number) => {
            // Skip rendering if value is 0
            if (entry.value === 0) return null;

            let formattedValue = entry.value;
            if (entry.dataKey === 'tvlUSD' || entry.dataKey === 'feesUSD') {
              formattedValue = formatUSD(entry.value);
            }

            let label = entry.name;

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

  const toggleDataKey = (key: keyof typeof activeDataKeys) => {
    setActiveDataKeys({
      ...activeDataKeys,
      [key]: !activeDataKeys[key],
    });
  };

  return (
    <div className='card'>
      <div className='card-header flex justify-between items-center mb-4'>
        <h2 className='card-title mb-0'>流動性・手数料推移</h2>
        <div className='flex space-x-2'>
          <button
            onClick={() => onTimeRangeChange('24h')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '24h' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            24時間
          </button>
          <button
            onClick={() => onTimeRangeChange('90d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '90d' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            90日間
          </button>
        </div>
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
              activeDataKeys.feesUSD ? 'bg-green-100 border border-green-300' : 'opacity-50 hover:bg-gray-100'
            }`}
            onClick={() => toggleDataKey('feesUSD')}
          >
            <div className='w-3 h-3 rounded-full bg-green-500 mr-1'></div>
            <span className='text-sm'>手数料収入 (USD)</span>
          </div>
        </div>

        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart
              data={data}
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
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                label={{
                  value: '手数料 (USD)',
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

              {activeDataKeys.feesUSD && (
                <Line
                  yAxisId='right'
                  type='monotone'
                  dataKey='feesUSD'
                  name='手数料収入 (USD)'
                  stroke='#10B981'
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
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
                  <span className='font-medium'>総流動性:</span>{' '}
                  {data.length > 0 ? formatUSD(data[data.length - 1]?.tvlUSD || 0) : 'N/A'}
                </p>
                <p>
                  <span className='font-medium'>累積手数料:</span>{' '}
                  {data.length > 0 ? formatUSD(data[data.length - 1]?.feesUSD || 0) : 'N/A'}
                </p>
                {feeTier && (
                  <p>
                    <span className='font-medium'>手数料率:</span> {Number(feeTier) / 10000}%
                  </p>
                )}
              </div>
            </div>
            <div className='bg-gray-50 p-4 rounded-md'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>期間内の変化</h3>
              <div className='text-sm'>
                {data.length > 1 && (
                  <>
                    <p>
                      <span className='font-medium'>流動性変化:</span>{' '}
                      {formatUSD((data[data.length - 1]?.tvlUSD || 0) - (data[0]?.tvlUSD || 0))} (
                      {(data[0]?.tvlUSD || 0) > 0
                        ? (((data[data.length - 1]?.tvlUSD || 0) / (data[0]?.tvlUSD || 1) - 1) * 100).toFixed(2)
                        : '0.00'}
                      %)
                    </p>
                    <p>
                      <span className='font-medium'>手数料獲得:</span>{' '}
                      {formatUSD((data[data.length - 1]?.feesUSD || 0) - (data[0]?.feesUSD || 0))}
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
