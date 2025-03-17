import React, { useState } from "react";
import {
  formatUSD,
  formatNumber,
  formatTimestamp,
  formatTimestampRelative,
  shortenAddress,
} from "../lib/utils";
import { ApolloError } from "@apollo/client";
import { SwapEvent } from "../types";

// プロップスの型定義
interface SwapDetailsTableProps {
  swaps: SwapEvent[];
  token0Symbol: string;
  token1Symbol: string;
  feeTier: string | number;
  loading?: boolean;
  error?: ApolloError | null;
  networkName?: string;
}

const SwapDetailsTable: React.FC<SwapDetailsTableProps> = ({
  swaps = [],
  token0Symbol,
  token1Symbol,
  feeTier,
  loading = false,
  error = null,
  networkName = "Ethereum",
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">スワップデータを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-red-500">エラーが発生しました: {error.message}</p>
      </div>
    );
  }

  if (swaps.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">このプールのスワップデータはありません</p>
      </div>
    );
  }

  // 手数料率をパーセントで表示（例: 3000 -> 0.3%）
  const feeRateDisplay = Number(feeTier) / 10000 + "%";

  return (
    <div className="w-full mx-auto bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-800">
              最近のスワップ ({swaps.length})
            </h2>
            <div className="flex items-center text-sm text-gray-600">
              <span>
                {token0Symbol} / {token1Symbol} - {feeRateDisplay}
              </span>
              <span className="ml-3 px-2 py-1 bg-gray-200 rounded-md text-xs font-medium">
                {networkName}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isOpen ? "×" : "+"}
          </button>
        </div>
      </div>

      {/* Swap Details */}
      {isOpen && (
        <>
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">スワップ詳細</h3>
          </div>

          {/* Table - レイアウト調整 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    時間
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    トランザクション
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    金額 (USD)
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                    LP手数料
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    トークン量
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    経由
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {swaps.map((swap, index) => {
                  const amountUSD = parseFloat(String(swap.amountUSD));

                  // 手数料計算を修正
                  const actualFeeTier = Number(feeTier);
                  const lpFee = Math.abs(amountUSD) * (actualFeeTier / 1000000);

                  const timestamp = Number(swap.timestamp);
                  const timeAgo = formatTimestampRelative(timestamp);
                  const formattedTime = formatTimestamp(timestamp);

                  return (
                    <tr key={swap.id || index} className="hover:bg-gray-50">
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        <div className="text-gray-900">{timeAgo}</div>
                        <div className="text-xs text-gray-500">
                          {formattedTime}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          {swap.transaction ? (
                            <a
                              href={`https://etherscan.io/tx/${swap.transaction}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center truncate"
                            >
                              {shortenAddress(swap.transaction)}
                              <svg
                                className="ml-1 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                ></path>
                              </svg>
                            </a>
                          ) : (
                            <span className="text-gray-600 truncate">
                              {swap.id}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatUSD(Math.abs(amountUSD))}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatUSD(lpFee)}
                      </td>
                      <td className="px-2 py-3 text-sm">
                        <div className="flex flex-col">
                          <div className="flex items-center truncate">
                            {parseFloat(String(swap.amount0)) >= 0 ? (
                              <span className="text-green-600">
                                {formatNumber(swap.amount0)} {token0Symbol}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {formatNumber(swap.amount0)} {token0Symbol}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center truncate">
                            {parseFloat(String(swap.amount1)) >= 0 ? (
                              <span className="text-green-600">
                                {formatNumber(swap.amount1)} {token1Symbol}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {formatNumber(swap.amount1)} {token1Symbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-sm">
                        <div className="flex flex-col">
                          <div className="flex items-center truncate">
                            <span className="text-gray-600">From:</span>
                            <a
                              href={`https://etherscan.io/address/${swap.sender}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-blue-600 hover:underline flex items-center"
                            >
                              {shortenAddress(swap.sender)}
                              <svg
                                className="ml-1 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                ></path>
                              </svg>
                            </a>
                          </div>
                          <div className="mt-1 flex items-center truncate">
                            <span className="text-gray-600">To:</span>
                            <a
                              href={`https://etherscan.io/address/${swap.origin}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-blue-600 hover:underline flex items-center"
                            >
                              {shortenAddress(swap.origin)}
                              <svg
                                className="ml-1 w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                ></path>
                              </svg>
                            </a>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SwapDetailsTable;
