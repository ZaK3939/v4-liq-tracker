import React, { useState } from "react";
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  formatTimestampRelative,
  shortenAddress,
} from "../lib/utils";
import Link from "next/link";
import { ModifyLiquidityEvent } from "../types";

interface EventsTableProps {
  events: ModifyLiquidityEvent[];
  token0Symbol: string;
  token1Symbol: string;
  loading: boolean;
  error: any;
  type: "liquidity";
}

const LiquidityEventsTable: React.FC<EventsTableProps> = ({
  events,
  token0Symbol,
  token1Symbol,
  loading,
  error,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "timestamp",
    direction: "descending",
  });

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">イベントデータを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">エラーが発生しました: {error.message}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">イベントデータがありません</p>
      </div>
    );
  }

  // イベントを日付順にソート
  const sortedEvents = [...events].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof ModifyLiquidityEvent];
    const bValue = b[sortConfig.key as keyof ModifyLiquidityEvent];

    if (sortConfig.key === "timestamp") {
      return sortConfig.direction === "ascending"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    }

    if (sortConfig.key === "amountUSD") {
      return sortConfig.direction === "ascending"
        ? parseFloat(aValue as string) - parseFloat(bValue as string)
        : parseFloat(bValue as string) - parseFloat(aValue as string);
    }

    return sortConfig.direction === "ascending"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? "↑" : "↓";
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => requestSort("timestamp")}
            >
              時間 {getSortIndicator("timestamp")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              取引
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              送信者
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              操作
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tick範囲
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => requestSort("amountUSD")}
            >
              金額 (USD) {getSortIndicator("amountUSD")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {token0Symbol}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {token1Symbol}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedEvents.map((event) => {
            // liquidityDeltaとamount0の値に基づいて操作タイプを判断
            // liquidityDeltaが存在すればそれを使用、そうでなければamount0を使用
            const isAddLiquidity = event.liquidityDelta
              ? Number(event.liquidityDelta) > 0
              : Number(event.amount0) > 0;

            const actionColor = isAddLiquidity
              ? "text-green-600"
              : "text-red-600";
            const actionText = isAddLiquidity ? "追加" : "削除";

            return (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{formatTimestamp(Number(event.timestamp))}</div>
                  <div className="text-xs text-gray-500">
                    {formatTimestampRelative(Number(event.timestamp))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <a
                    href={`https://etherscan.io/tx/${event.transaction}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {shortenAddress(event.transaction)}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <a
                    href={`https://etherscan.io/address/${event.sender}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {shortenAddress(event.sender)}
                  </a>
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${actionColor}`}
                >
                  {actionText}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span>
                      下限: {Number(event.tickLower).toLocaleString()}
                    </span>
                    <span>
                      上限: {Number(event.tickUpper).toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatUSD(event.amountUSD)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={
                      isAddLiquidity ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatNumber(event.amount0)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={
                      isAddLiquidity ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatNumber(event.amount1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LiquidityEventsTable;
