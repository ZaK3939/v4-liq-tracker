import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@apollo/client";
import { GET_ALL_POOLS } from "../lib/queries";
import { client } from "../lib/apollo-client";
import Link from "next/link";
import { formatUSD, shortenAddress } from "../lib/utils";
import { PoolsQueryResult, Pool, Token } from "../types";

interface PoolSelectorProps {
  onSelectPool?: (poolId: string) => void;
}

const PoolSelector: React.FC<PoolSelectorProps> = ({ onSelectPool }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { loading, error, data } = useQuery<PoolsQueryResult>(GET_ALL_POOLS, {
    variables: { first: 100 },
    client,
  });

  // トークン情報をIDでマッピング
  const tokenMap: Record<string, Token> = {};
  if (data?.Token && Array.isArray(data.Token)) {
    data.Token.forEach((token: Token) => {
      tokenMap[token.id] = token;
    });
  }

  // 検索語に基づいてプールをフィルタリング
  const filteredPools = React.useMemo(() => {
    if (!data?.Pool) return [];

    return data.Pool.filter((pool: Pool) => {
      if (!pool) return false;
      const searchLower = searchTerm.toLowerCase();
      const token0 = tokenMap[pool.token0] || { symbol: "", name: "" };
      const token1 = tokenMap[pool.token1] || { symbol: "", name: "" };

      return (
        pool.id.toLowerCase().includes(searchLower) ||
        token0.symbol.toLowerCase().includes(searchLower) ||
        token1.symbol.toLowerCase().includes(searchLower) ||
        token0.name.toLowerCase().includes(searchLower) ||
        token1.name.toLowerCase().includes(searchLower) ||
        pool.name.toLowerCase().includes(searchLower)
      );
    });
  }, [data?.Pool, tokenMap, searchTerm]);

  // 外部クリックを検出して、ドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="プールを検索 (アドレス, トークン名...)"
          className="w-full p-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">読み込み中...</div>
          ) : error ? (
            <div className="px-4 py-2 text-sm text-red-500">
              エラーが発生しました: {error.message}
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              該当するプールが見つかりません
            </div>
          ) : (
            <ul className="py-1">
              {filteredPools.map((pool: Pool) => {
                if (!pool) return null;
                const token0 = tokenMap[pool.token0] || {
                  symbol: "Unknown",
                  name: "Unknown",
                };
                const token1 = tokenMap[pool.token1] || {
                  symbol: "Unknown",
                  name: "Unknown",
                };
                const pairName = `${token0.symbol}/${token1.symbol}`;

                return (
                  <li key={pool.id}>
                    {onSelectPool ? (
                      <button
                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex justify-between items-center"
                        onClick={() => {
                          onSelectPool(pool.id);
                          setIsOpen(false);
                          setSearchTerm(pairName);
                        }}
                      >
                        <div>
                          <span className="font-medium">{pairName}</span>
                          <span className="ml-2 text-gray-500 text-xs">
                            {shortenAddress(pool.id)}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatUSD(pool.totalValueLockedUSD)}
                        </span>
                      </button>
                    ) : (
                      <Link
                        href={{
                          pathname: "/pool/[id]",
                          query: { id: pool.id },
                        }}
                        className="block px-4 py-2 text-sm hover:bg-gray-100 flex justify-between items-center"
                        onClick={() => setIsOpen(false)}
                      >
                        <div>
                          <span className="font-medium">{pairName}</span>
                          <span className="ml-2 text-gray-500 text-xs">
                            {shortenAddress(pool.id)}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {formatUSD(pool.totalValueLockedUSD)}
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PoolSelector;
