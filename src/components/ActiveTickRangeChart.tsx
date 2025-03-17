import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TickData {
  id?: string;
  tickIdx?: string | number;
  tickLower?: string | number;
  tickUpper?: string | number;
  liquidityNet?: string | number;
  liquidityGross?: string | number;
  liquidity?: string | number;
  price0?: string | number;
  price1?: string | number;
}

interface ActiveTickRangeProps {
  tickData: TickData[];
  currentTick: number;
  token0Symbol: string;
  token1Symbol: string;
  maxTicksToShow?: number;
}

// ティックから価格を計算する関数
function calculatePrice0FromTick(tick: number): number {
  return Math.pow(1.0001, tick);
}

function calculatePrice1FromTick(tick: number): number {
  return 1 / calculatePrice0FromTick(tick);
}

/**
 * アクティブなティック範囲を表示するチャートコンポーネント
 */
const ActiveTickRangeChart: React.FC<ActiveTickRangeProps> = ({
  tickData,
  currentTick,
  token0Symbol,
  token1Symbol,
  maxTicksToShow = 100,
}) => {
  // ティックデータを整形
  const formattedData = useMemo(() => {
    if (!tickData || tickData.length === 0) return [];

    return tickData
      .map((tick) => {
        // TickIdxを取得（tickIdxがない場合はtickLowerを使用）
        const rawTickIdx = tick.tickIdx || tick.tickLower;
        if (rawTickIdx === undefined) return null;

        const tickIdx = Number(rawTickIdx);
        if (isNaN(tickIdx)) return null;

        // 現在のティックと比較して色分け（現在より低いならオレンジ、高いなら青）
        const isLowerThanCurrent = tickIdx < currentTick;

        // liquidityNetを取得（ない場合はliquidityを使用）
        let liquidityNet =
          tick.liquidityNet !== undefined ? tick.liquidityNet : tick.liquidity;
        if (liquidityNet === undefined) liquidityNet = 0;

        // 価格を取得または計算
        const price0 =
          tick.price0 !== undefined
            ? Number(tick.price0)
            : calculatePrice0FromTick(tickIdx);

        const price1 =
          tick.price1 !== undefined
            ? Number(tick.price1)
            : calculatePrice1FromTick(tickIdx);

        return {
          tickIdx,
          value: Math.abs(Number(liquidityNet) || 1), // 値がゼロの場合は小さい値を設定して表示
          color: isLowerThanCurrent ? "#f59e0b" : "#3b82f6", // オレンジまたは青
          price0,
          price1,
          // ラベル用
          tickLabel: `${tickIdx}`,
          price0Label: `${token0Symbol}: ${price0.toFixed(6)}`,
          price1Label: `${token1Symbol}: ${price1.toFixed(6)}`,
        };
      })
      .filter((item) => item !== null) // nullを除去
      .sort((a, b) => a!.tickIdx - b!.tickIdx); // ティックでソート
  }, [tickData, currentTick, token0Symbol, token1Symbol]);

  // 表示範囲を制限
  const visibleData = useMemo(() => {
    if (!formattedData.length) return [];

    // 現在のティックに近いインデックスを見つける
    let centerIndex = formattedData.findIndex(
      (item) => item!.tickIdx >= currentTick,
    );
    if (centerIndex === -1) centerIndex = formattedData.length - 1;

    // 表示範囲を計算
    const halfRange = Math.floor(maxTicksToShow / 2);
    const startIndex = Math.max(0, centerIndex - halfRange);
    const endIndex = Math.min(
      formattedData.length - 1,
      centerIndex + halfRange,
    );

    return formattedData.slice(startIndex, endIndex + 1);
  }, [formattedData, currentTick, maxTicksToShow]);

  // カスタムバー
  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload.color}
        radius={0}
      />
    );
  };

  // カスタムツールチップ
  interface TooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
  }

  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-gray-800 text-white p-3 border border-gray-700 shadow-md rounded">
          <p className="font-bold mb-1">Tick: {data.tickIdx}</p>
          <p className="text-sm">{data.price0Label}</p>
          <p className="text-sm">{data.price1Label}</p>
        </div>
      );
    }

    return null;
  };

  // データが無い場合のメッセージ
  if (!visibleData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-900 text-gray-400 rounded-lg p-4">
        <p>ティックデータがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 text-white">
        アクティブなティック範囲
      </h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={visibleData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            barSize={3} // 細いバーにする
          >
            <XAxis
              dataKey="tickIdx"
              tick={false} // ティックラベルを非表示
              axisLine={{ stroke: "#444" }}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={currentTick} stroke="#ffffff" strokeWidth={1} />
            <Bar
              dataKey="value"
              shape={<CustomBar />}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-gray-400">
        <p>
          *
          橙色のバーは現在のティックより低いティック範囲、青色のバーは高いティック範囲を示します
        </p>
        <p>* 白い垂直線は現在のアクティブなティックを示します</p>
      </div>
    </div>
  );
};

export default ActiveTickRangeChart;
