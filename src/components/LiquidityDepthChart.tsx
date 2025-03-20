import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatNumber } from '../lib/utils';
import { calculateLiquidityDelta } from '../lib/liquidityMath';
import { Tick } from '../types';

// GraphQLから取得するTickデータの型
interface InputTickData {
  id: string;
  poolId?: string;
  tickIdx?: string;
  tickLower?: string; // LiquidityPositionから取得する場合
  tickUpper?: string; // LiquidityPositionから取得する場合
  liquidityNet?: string;
  liquidityGross?: string;
  liquidity?: string; // LiquidityPositionから取得する場合
  price0?: string;
  price1?: string;
  feeGrowthOutside0X128?: string;
  feeGrowthOutside1X128?: string;
  __typename?: string;
}

// 内部処理用に変換したTickデータの型
interface ProcessedTickData {
  tickIdx: number;
  liquidityNet: number;
  liquidityGross: number;
  liquidityActive: number;
  price0: number;
  price1: number;
  tickLabel: string;
  price0Label: string;
  price1Label: string;
  positiveLiquidity: number;
  negativeLiquidity: number;
}

interface LiquidityDepthProps {
  tickData: InputTickData[] | Tick[];
  currentTick: number;
  token0Symbol: string;
  token1Symbol: string;
  tickSpacing: number;
  maxTicksToShow?: number;
}

// Basic tick data after initial normalization
interface NormalizedTickData {
  tickIdx: number;
  liquidityNet: number;
  liquidityGross: number;
  price0: number;
  price1: number;
}

// Extended tick data after processing with liquidity calculations
interface CalculatedTickData extends NormalizedTickData {
  liquidityActive?: number;
  liquidityDelta?: number;
}

// Final tick data format for display
interface FormattedTickData {
  tickIdx: number;
  positiveLiquidity: number;
  negativeLiquidity: number;
  liquidityGross: number;
  liquidityActive: number;
  price0: number;
  price1: number;
  tickLabel: string;
  price0Label: string;
  price1Label: string;
}

// ティックから価格を計算する関数
function calculatePrice0FromTick(tick: number): number {
  return Math.pow(1.0001, tick);
}

function calculatePrice1FromTick(tick: number): number {
  return 1 / calculatePrice0FromTick(tick);
}

const LiquidityDepthChart: React.FC<LiquidityDepthProps> = ({
  tickData,
  currentTick,
  token0Symbol,
  token1Symbol,
  tickSpacing = 60,
  maxTicksToShow = 100,
}) => {
  // 入力データを数値型に変換（ポジションデータとティックデータの両方に対応）
  const normalizedTickData = useMemo(() => {
    if (!tickData || tickData.length === 0) return [];

    // LiquidityPositionデータ形式の場合、ティックデータに変換
    return tickData.map((tick) => {
      // LiquidityPositionデータの場合
      if ('tickLower' in tick && 'tickUpper' in tick && 'liquidity' in tick) {
        const tickIdx = tick.tickLower;
        const liquidity = tick.liquidity || '0';
        return {
          tickIdx: Number(tickIdx),
          liquidityNet: Number(liquidity), // 下限ティックでは流動性が追加
          liquidityGross: Number(liquidity),
          price0: calculatePrice0FromTick(Number(tickIdx)),
          price1: calculatePrice1FromTick(Number(tickIdx)),
        };
      }
      // 通常のティックデータの場合
      return {
        tickIdx: Number(tick.tickIdx),
        liquidityNet: Number(tick.liquidityNet || 0),
        liquidityGross: Number(tick.liquidityGross || 0),
        price0: Number(tick.price0 || calculatePrice0FromTick(Number(tick.tickIdx))),
        price1: Number(tick.price1 || calculatePrice1FromTick(Number(tick.tickIdx))),
      };
    });
  }, [tickData]);

  // データを視覚化しやすいように整形
  const formattedData = useMemo(() => {
    // データが存在しない場合は空配列を返す
    if (!normalizedTickData || normalizedTickData.length === 0) return [];

    // 流動性ポジションから直接使用する場合、calculateLiquidityDeltaを省略
    let processedTicks: CalculatedTickData[];
    try {
      // 流動性の計算を試みる
      processedTicks = calculateLiquidityDelta(normalizedTickData);
    } catch (error) {
      console.error('liquidityDelta計算エラー:', error);
      // エラーが発生した場合、生のデータを使用
      processedTicks = normalizedTickData;
    }

    // 視覚的に分かりやすいようにデータを整形
    return processedTicks.map((tick) => ({
      tickIdx: tick.tickIdx,
      // 正の値は青、負の値は赤で表示
      positiveLiquidity: tick.liquidityNet > 0 ? tick.liquidityNet : 0,
      negativeLiquidity: tick.liquidityNet < 0 ? -tick.liquidityNet : 0,
      // 総流動性
      liquidityGross: tick.liquidityGross,
      // 現在のアクティブな流動性
      liquidityActive: tick.liquidityActive || 0,
      // 価格情報
      price0: tick.price0,
      price1: tick.price1,
      // ラベル用
      tickLabel: `${tick.tickIdx}`,
      price0Label: `${token0Symbol}: ${Number(tick.price0).toFixed(6)}`,
      price1Label: `${token1Symbol}: ${Number(tick.price1).toFixed(6)}`,
    })) as FormattedTickData[];
  }, [normalizedTickData, token0Symbol, token1Symbol]);

  // 現在のtickに最も近いtickを見つけるヘルパー関数
  const closestTickIndex = useMemo(() => {
    if (!formattedData.length) return -1;

    let closest = 0;
    let minDistance = Number.MAX_VALUE;

    formattedData.forEach((tick, index) => {
      const distance = Math.abs(tick.tickIdx - currentTick);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });

    return closest;
  }, [formattedData, currentTick]);

  // 表示範囲を制限（現在のtickの周辺）
  const visibleData = useMemo(() => {
    if (!formattedData.length) return [];

    // 中央のindexを見つける
    let centerIndex = closestTickIndex;
    if (centerIndex < 0) {
      // 最も近いtickが見つからない場合はデータの中央を使用
      centerIndex = Math.floor(formattedData.length / 2);
    }

    // 表示範囲を計算
    const halfRange = Math.floor(maxTicksToShow / 2);
    const startIndex = Math.max(0, centerIndex - halfRange);
    const endIndex = Math.min(formattedData.length - 1, centerIndex + halfRange);

    return formattedData.slice(startIndex, endIndex + 1);
  }, [formattedData, closestTickIndex, maxTicksToShow]);

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className='bg-white p-3 border border-gray-200 shadow-md rounded'>
          <p className='font-bold mb-1'>Tick: {data.tickIdx}</p>
          <p className='text-sm'>{data.price0Label}</p>
          <p className='text-sm'>{data.price1Label}</p>
          <hr className='my-2' />
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className='text-sm' style={{ color: entry.color }}>
              <span className='font-medium'>{entry.name}: </span>
              {formatNumber(entry.value)}
            </p>
          ))}
          <p className='text-sm mt-1'>
            <span className='font-medium'>現在の総流動性: </span>
            {formatNumber(data.liquidityActive || 0)}
          </p>
        </div>
      );
    }

    return null;
  };

  // データが無い場合のメッセージ
  if (!visibleData.length) {
    return (
      <div className='flex flex-col items-center justify-center h-80 bg-white rounded-lg p-4'>
        <p className='text-gray-500'>このプールのTickデータはありません</p>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow p-4'>
      <h2 className='text-xl font-semibold mb-4'>流動性の厚さ（Tick分布）</h2>
      <div className='h-80'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={visibleData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis
              dataKey='tickLabel'
              interval={Math.floor(visibleData.length / 10)}
              angle={-45}
              textAnchor='end'
              height={60}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              x={formattedData[closestTickIndex]?.tickLabel}
              stroke='#DC2626'
              strokeWidth={2}
              label={{ value: '現在価格', position: 'top', fill: '#DC2626' }}
            />
            <Bar dataKey='positiveLiquidity' name='流動性追加' fill='#3B82F6' />
            <Bar dataKey='negativeLiquidity' name='流動性削除' fill='#EF4444' />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className='mt-4 text-sm text-gray-500'>
        <p>* 各バーはTickごとの流動性の変化を示します。青は正味の流動性追加、赤は正味の流動性削減を表します。</p>
        <p>* 赤い垂直線は現在の価格（アクティブなTick）を示します。</p>
        <p>* プール内の流動性はTick境界に集中する傾向があり、これによって価格範囲ごとの流動性の厚さが異なります。</p>
      </div>
    </div>
  );
};

export default LiquidityDepthChart;
