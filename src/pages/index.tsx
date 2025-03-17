import { useState } from "react";
import { useQuery } from "@apollo/client";
import { client } from "../lib/apollo-client";
import { GET_ALL_POOLS, GET_HOOKS_STATS } from "../lib/queries";
import Link from "next/link";
import {
  formatUSD,
  formatTimestampRelative,
  shortenAddress,
} from "../lib/utils";
import PoolSelector from "../components/PoolSelector";
import {
  PoolsQueryResult,
  HookStatsQueryResult,
  Pool,
  Token,
  HookStats,
} from "../types";

export default function Home() {
  const [sortField, setSortField] = useState("totalValueLockedUSD");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("pools");

  // プール一覧を取得
  const { loading, error, data } = useQuery<PoolsQueryResult>(GET_ALL_POOLS, {
    variables: {
      first: 100,
      orderBy: sortField,
      orderDirection: sortDirection,
    },
    client,
  });

  // Hooks統計を取得
  const {
    loading: hooksLoading,
    error: hooksError,
    data: hooksData,
  } = useQuery<HookStatsQueryResult>(GET_HOOKS_STATS, {
    variables: {
      first: 50,
      orderBy: "totalValueLockedUSD",
      orderDirection: "desc",
    },
    client,
  });

  // トークン情報をIDでマッピング
  const tokenMap: Record<string, Token> = {};
  if (data?.Token && Array.isArray(data.Token)) {
    data.Token.forEach((token: Token) => {
      tokenMap[token.id] = token;
    });
  }

  // ソート処理
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // ソートアイコンを表示
  const renderSortIcon = (field: string) => {
    if (field !== sortField) return null;

    return (
      <span className="ml-1 inline-block">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-3">
            Uniswap v4 流動性トラッカー
          </h1>
          <p className="text-gray-600">
            Uniswap
            v4プールの流動性の推移を時系列で追跡し、分析できるツールです。プールごとのTick分布、流動性イベント、スワップを確認できます。
          </p>
        </div>

        <div className="mb-6">
          <PoolSelector />
        </div>

        <div className="mb-4 border-b">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                className={`tab-button ${activeTab === "pools" ? "tab-button-active" : "tab-button-inactive"}`}
                onClick={() => setActiveTab("pools")}
              >
                プール一覧
              </button>
            </li>
            <li className="mr-2">
              <button
                className={`tab-button ${activeTab === "hooks" ? "tab-button-active" : "tab-button-inactive"}`}
                onClick={() => setActiveTab("hooks")}
              >
                Hook統計
              </button>
            </li>
          </ul>
        </div>

        {activeTab === "pools" && (
          <>
            {loading ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : error ? (
              <div className="card p-8 text-center">
                <p className="text-red-500">
                  エラーが発生しました: {error.message}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("id")}
                      >
                        プール {renderSortIcon("id")}
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ペア
                      </th>
                      <th
                        className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("totalValueLockedUSD")}
                      >
                        TVL (USD) {renderSortIcon("totalValueLockedUSD")}
                      </th>
                      <th
                        className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("txCount")}
                      >
                        取引数 {renderSortIcon("txCount")}
                      </th>
                      <th
                        className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("createdAtTimestamp")}
                      >
                        作成日 {renderSortIcon("createdAtTimestamp")}
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.Pool && Array.isArray(data.Pool)
                      ? data.Pool.map((pool: Pool) => {
                          if (!pool) return null;

                          const token0 = tokenMap[pool.token0] || {
                            symbol: "Unknown",
                            name: "Unknown",
                          };
                          const token1 = tokenMap[pool.token1] || {
                            symbol: "Unknown",
                            name: "Unknown",
                          };
                          const hasHooks =
                            pool.hooks &&
                            pool.hooks !==
                              "0x0000000000000000000000000000000000000000";

                          return (
                            <tr key={pool.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {shortenAddress(pool.id)}
                                {hasHooks && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                                    Hook
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="font-medium">
                                    {token0.symbol} / {token1.symbol}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    Fee: {Number(pool.feeTier) / 10000}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                {formatUSD(pool.totalValueLockedUSD)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                                {Number(pool.txCount).toLocaleString()}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {formatTimestampRelative(
                                  pool.createdAtTimestamp,
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <a
                                  href={`/pool/${pool.id}`}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors inline-block"
                                  onClick={(e) => {
                                    console.log(
                                      "リンクがクリックされました",
                                      pool.id,
                                    );
                                  }}
                                >
                                  分析
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      : null}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "hooks" && (
          <>
            {hooksLoading ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500">読み込み中...</p>
              </div>
            ) : hooksError ? (
              <div className="card p-8 text-center">
                <p className="text-red-500">
                  エラーが発生しました: {hooksError.message}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hook
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        プール数
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        スワップ数
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TVL (USD)
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        取引量 (USD)
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        手数料 (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hooksData?.HookStats && Array.isArray(hooksData.HookStats)
                      ? hooksData.HookStats.map((hook: HookStats) => (
                          <tr key={hook.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <a
                                href={`https://etherscan.io/address/${hook.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                {shortenAddress(hook.id)}
                              </a>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {Number(hook.numberOfPools).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {Number(hook.numberOfSwaps).toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {formatUSD(hook.totalValueLockedUSD)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {formatUSD(hook.totalVolumeUSD)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                              {formatUSD(hook.totalFeesUSD)}
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
