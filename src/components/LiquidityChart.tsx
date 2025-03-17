import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";
import { formatUSD, formatNumber } from "../lib/utils";

interface LiquidityDataPoint {
  date: Date;
  timestamp: number;
  tvlUSD: number;
  liquidity: number;
  token0Amount: number;
  token1Amount: number;
  sqrtPrice?: number;
  tick?: number;
}

interface LiquidityChartProps {
  data: LiquidityDataPoint[];
  token0Symbol: string;
  token1Symbol: string;
  chartType?: "area" | "line" | "multiline";
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

// 時間範囲オプション
const TIME_RANGES = [
  { value: "24h", label: "24時間" },
  { value: "7d", label: "7日間" },
  { value: "30d", label: "30日間" },
  { value: "90d", label: "90日間" },
  { value: "all", label: "すべて" },
];

const LiquidityChart: React.FC<LiquidityChartProps> = ({
  data,
  token0Symbol,
  token1Symbol,
  chartType = "area",
  timeRange = "7d",
  onTimeRangeChange,
}) => {
  // 日付のフォーマット関数
  const formatDate = (date: Date) => {
    if (timeRange === "24h") {
      return format(date, "HH:mm");
    } else if (timeRange === "7d") {
      return format(date, "MM/dd HH:mm");
    } else {
      return format(date, "yyyy/MM/dd");
    }
  };

  // ツールチップのカスタマイズ
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-bold mb-1">
            {format(new Date(label), "yyyy/MM/dd HH:mm")}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={`item-${index}`}
              className="text-sm"
              style={{ color: entry.color }}
            >
              <span className="font-medium">{entry.name}: </span>
              {entry.name.includes("USD")
                ? formatUSD(entry.value)
                : formatNumber(entry.value)}
            </p>
          ))}
          {data.tick !== undefined && (
            <p className="text-sm mt-1 text-gray-600">Tick: {data.tick}</p>
          )}
        </div>
      );
    }

    return null;
  };

  // データがない場合のメッセージ
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-white rounded-lg p-4">
        <p className="text-gray-500">選択した期間のデータがありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">流動性推移</h2>
        {onTimeRangeChange && (
          <div className="flex space-x-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => onTimeRangeChange(range.value)}
                className={`px-3 py-1 rounded text-sm ${
                  timeRange === range.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-80">
        {chartType === "area" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => formatUSD(value, 0)}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="tvlUSD"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorTvl)"
                name="TVL (USD)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {chartType === "line" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tickFormatter={(value) => formatUSD(value, 0)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="tvlUSD"
                stroke="#3B82F6"
                name="TVL (USD)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === "multiline" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.7} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatUSD(value, 0)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tvlUSD"
                stroke="#3B82F6"
                name="TVL (USD)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="liquidity"
                stroke="#10B981"
                name="Liquidity"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="token0Amount"
                stroke="#F59E0B"
                name={`${token0Symbol} 量`}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="token1Amount"
                stroke="#6366F1"
                name={`${token1Symbol} 量`}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LiquidityChart;
