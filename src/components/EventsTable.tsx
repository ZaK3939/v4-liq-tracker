import React from "react";
import {
  shortenAddress,
  formatTimestamp,
  formatUSD,
  formatNumber,
} from "../lib/utils";
import { ModifyLiquidityEvent, SwapEvent } from "../types";
import { ApolloError } from "@apollo/client";

interface EventsTableProps {
  events: ModifyLiquidityEvent[] | SwapEvent[];
  type: "liquidity" | "swap";
  token0Symbol: string;
  token1Symbol: string;
  loading?: boolean;
  error?: ApolloError | null;
}

const EventsTable: React.FC<EventsTableProps> = ({
  events,
  type,
  token0Symbol,
  token1Symbol,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">読み込み中...</p>
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

  if (type === "liquidity") {
    const liquidityEvents = events as ModifyLiquidityEvent[];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイムスタンプ
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アカウント
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作タイプ
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tick下限
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tick上限
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {token0Symbol}量
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {token1Symbol}量
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {liquidityEvents.map((event) => {
              const isAddLiquidity = event.type === "Mint";

              return (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimestamp(event.timestamp)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <a
                      href={`https://etherscan.io/address/${event.origin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {shortenAddress(event.origin)}
                    </a>
                  </td>
                  <td
                    className={`px-4 py-4 whitespace-nowrap text-right text-sm ${
                      isAddLiquidity ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isAddLiquidity ? "Mint" : "Burn"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    {event.tickLower}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    {event.tickUpper}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    {formatNumber(event.amount0)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    {formatNumber(event.amount1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // スワップイベントテーブル
  const swapEvents = events as SwapEvent[];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              タイムスタンプ
            </th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              アカウント
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              金額 (USD)
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {token0Symbol}量
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {token1Symbol}量
            </th>
            <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              価格
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {swapEvents.map((event) => {
            const amount0Value = Number(event.amount0);
            const amount1Value = Number(event.amount1);
            const isBuy = amount0Value < 0; // token0が減少した場合は購入

            return (
              <tr key={event.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <a
                    href={`https://etherscan.io/address/${event.origin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {shortenAddress(event.origin)}
                  </a>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  {formatUSD(event.amountUSD)}
                </td>
                <td
                  className={`px-4 py-4 whitespace-nowrap text-right text-sm ${
                    amount0Value < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatNumber(Math.abs(amount0Value))}
                </td>
                <td
                  className={`px-4 py-4 whitespace-nowrap text-right text-sm ${
                    amount1Value < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatNumber(Math.abs(amount1Value))}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <span className="text-gray-600">Tick: {event.tick}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EventsTable;
