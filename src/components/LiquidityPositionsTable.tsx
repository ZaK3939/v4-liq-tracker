import React, { useState } from "react";
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  shortenAddress,
} from "../lib/utils";
import Link from "next/link";
import { LiquidityPosition, Token } from "../types";

interface LiquidityPositionsTableProps {
  positions: LiquidityPosition[];
  token0: Token;
  token1: Token;
  ethPrice: string;
  currentTick?: number;
  loading: boolean;
  error: any;
  poolName?: string;
}

const LiquidityPositionsTable: React.FC<LiquidityPositionsTableProps> = ({
  positions,
  token0,
  token1,
  ethPrice,
  currentTick,
  loading,
  error,
  poolName,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  }>({
    key: "liquidity",
    direction: "descending",
  });

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">ポジションデータを読み込み中...</p>
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

  if (!positions || positions.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">ポジションデータがありません</p>
      </div>
    );
  }

  // ポジションをソート
  const sortedPositions = [...positions].sort((a, b) => {
    const aValue = a[sortConfig.key as keyof LiquidityPosition];
    const bValue = b[sortConfig.key as keyof LiquidityPosition];

    if (
      sortConfig.key === "liquidity" ||
      sortConfig.key === "createdAtTimestamp"
    ) {
      return sortConfig.direction === "ascending"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
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

  // ポジションがレンジ内かを判断
  const isInRange = (
    lower: number,
    upper: number,
    current: number | undefined,
  ): boolean => {
    if (current === undefined) return false;
    return lower <= current && current < upper;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              所有者
            </th>
            {poolName && (
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                プール
              </th>
            )}
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Tick範囲
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => requestSort("liquidity")}
            >
              流動性 {getSortIndicator("liquidity")}
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              預入量
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              引出量
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              手数料
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => requestSort("createdAtTimestamp")}
            >
              作成日 {getSortIndicator("createdAtTimestamp")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPositions.map((position) => {
            const lowerTick = Number(position.tickLower);
            const upperTick = Number(position.tickUpper);
            const inRange = isInRange(lowerTick, upperTick, currentTick);
            const rangeStatusClass = inRange ? "bg-green-100" : "bg-gray-100";

            return (
              <tr key={position.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <a
                    href={`https://etherscan.io/address/${position.owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {shortenAddress(position.owner)}
                  </a>
                </td>
                {poolName && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/pool/${position.pool}`}
                      className="text-blue-500 hover:underline"
                    >
                      {poolName}
                    </Link>
                  </td>
                )}
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm ${rangeStatusClass} rounded-lg`}
                >
                  <div className="flex flex-col">
                    <span>下限: {lowerTick.toLocaleString()}</span>
                    <span>上限: {upperTick.toLocaleString()}</span>
                    {inRange && (
                      <span className="text-green-600 text-xs">レンジ内</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {Number(position.liquidity).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span>
                      {token0.symbol}: {formatNumber(position.depositedToken0)}
                    </span>
                    <span>
                      {token1.symbol}: {formatNumber(position.depositedToken1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span>
                      {token0.symbol}: {formatNumber(position.withdrawnToken0)}
                    </span>
                    <span>
                      {token1.symbol}: {formatNumber(position.withdrawnToken1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex flex-col">
                    <span>
                      {token0.symbol}:{" "}
                      {formatNumber(position.collectedFeesToken0)}
                    </span>
                    <span>
                      {token1.symbol}:{" "}
                      {formatNumber(position.collectedFeesToken1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatTimestamp(Number(position.createdAtTimestamp))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LiquidityPositionsTable;
