import { gql } from '@apollo/client';

export const GET_TOKEN_INFO = gql`
  query GetTokenInfo($tokenId: String!) {
    Token_by_pk(id: $tokenId) {
      id
      symbol
      name
      decimals
      derivedETH
    }
  }
`;

// すべてのプールを取得するクエリ
export const GET_ALL_POOLS = gql`
  query GetAllPools(
    $first: Int = 100
    $skip: Int = 0
    $orderBy: String = "totalValueLockedUSD"
    $orderDirection: String = "desc"
  ) {
    Pool(limit: $first, offset: $skip, order_by: { totalValueLockedUSD: desc }) {
      id
      chainId
      name
      token0
      token1
      feeTier
      totalValueLockedUSD
      createdAtTimestamp
      sqrtPrice
      tick
      tickSpacing
      hooks
      liquidityProviderCount
      txCount
    }
    Token {
      id
      symbol
      name
      decimals
    }
  }
`;

// 特定のプールの詳細を取得するクエリ
export const GET_POOL_DETAILS = gql`
  query GetPoolDetails($poolId: String!, $token0Id: String!, $token1Id: String!) {
    Pool_by_pk(id: $poolId) {
      id
      chainId
      name
      token0
      token1
      feeTier
      liquidity
      sqrtPrice
      tick
      tickSpacing
      token0Price
      token1Price
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedETH
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      createdAtTimestamp
      createdAtBlockNumber
      hooks
      liquidityProviderCount
    }
    token0: Token_by_pk(id: $token0Id) {
      id
      symbol
      name
      decimals
      derivedETH
    }
    token1: Token_by_pk(id: $token1Id) {
      id
      symbol
      name
      decimals
      derivedETH
    }
  }
`;

// プールのスワップイベントを取得するクエリ
export const GET_POOL_SWAP_EVENTS = gql`
  query GetPoolSwapEvents($poolId: String!, $startTime: numeric!, $first: Int = 1000) {
    Swap(
      where: { pool: { _eq: $poolId }, timestamp: { _gte: $startTime } }
      order_by: { timestamp: desc }
      limit: $first
    ) {
      id
      timestamp
      transaction
      sender
      origin
      amount0
      amount1
      amountUSD
      sqrtPriceX96
      tick
      logIndex
    }
  }
`;

// Uniswap v4のHooks統計を取得するクエリ
export const GET_HOOKS_STATS = gql`
  query GetHooksStats($first: Int = 20) {
    HookStats(limit: $first, order_by: { totalValueLockedUSD: desc }) {
      id
      chainId
      numberOfPools
      numberOfSwaps
      firstPoolCreatedAt
      totalValueLockedUSD
      totalVolumeUSD
      totalFeesUSD
    }
  }
`;

// ETH価格を取得するクエリ
export const GET_ETH_PRICE = gql`
  query GetEthPrice {
    Bundle_by_pk(id: "1") {
      ethPriceUSD
    }
  }
`;

// バンドル情報（ETH価格）を取得するクエリ
export const GET_BUNDLE = gql`
  query GetBundle($chainId: String!) {
    Bundle_by_pk(id: $chainId) {
      id
      ethPriceUSD
    }
  }
`;

export const GET_POOL_LIQUIDITY_HISTORY = gql`
  query GetPoolLiquidityHistory($poolId: String!, $startTime: numeric!, $first: Int = 1000) {
    liquidityEvents: Pool_liquidity_history(
      where: { pool: { _eq: $poolId }, timestamp: { _gte: $startTime } }
      order_by: { timestamp: asc }
      limit: $first
    ) {
      id
      timestamp
      liquidity
      sqrtPrice
      tick
      totalValueLockedToken0
      totalValueLockedToken1
      totalValueLockedUSD
    }
  }
`;

// プールのTick分布を取得するクエリ
export const GET_POOL_TICKS = gql`
  query GetPoolTicks($poolId: String!) {
    positions: LiquidityPosition(
      where: { pool: { _eq: $poolId }, liquidity: { _gt: "0" } }
      order_by: { liquidity: desc }
    ) {
      id
      tickLower
      tickUpper
      liquidity
    }
    pool: Pool_by_pk(id: $poolId) {
      id
      tick
      tickSpacing
      token0Price
      token1Price
    }
  }
`;

// 最近の流動性イベントを取得するクエリ
export const GET_RECENT_MODIFY_LIQUIDITY_EVENTS = gql`
  query GetRecentModifyLiquidityEvents($poolId: String!, $first: Int!) {
    ModifyLiquidity(where: { pool: { _eq: $poolId } }, order_by: { timestamp: desc }, limit: $first) {
      id
      transaction
      timestamp
      pool
      sender
      origin
      amount0
      amount1
      amountUSD
      tickLower
      tickUpper
      liquidityDelta
      logIndex
    }
  }
`;
// 特定のユーザーの流動性ポジションを取得するクエリ
export const GET_USER_LIQUIDITY_POSITIONS = gql`
  query GetUserLiquidityPositions($owner: String!, $first: Int!) {
    LiquidityPosition(where: { owner: { _eq: $owner } }, order_by: { createdAtTimestamp: desc }, limit: $first) {
      id
      owner
      pool
      tickLower
      tickUpper
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`;

// プールの流動性ポジションを取得するクエリ
export const GET_POOL_LIQUIDITY_POSITIONS = gql`
  query GetPoolLiquidityPositions($poolId: String!, $first: Int!) {
    LiquidityPosition(where: { pool: { _eq: $poolId } }, order_by: { liquidity: desc }, limit: $first) {
      id
      owner
      pool
      tickLower
      tickUpper
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`;

// アクティブな（流動性が0以上の）プールの流動性ポジションを取得するクエリ
export const GET_ACTIVE_POOL_LIQUIDITY_POSITIONS = gql`
  query GetActivePoolLiquidityPositions($poolId: String!) {
    LiquidityPosition(
      where: { pool: { _eq: $poolId }, liquidity: { _gt: "0" } }
      order_by: { liquidity: desc }
      limit: 100
    ) {
      id
      owner
      pool
      tickLower
      tickUpper
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      createdAtTimestamp
      createdAtBlockNumber
    }
  }
`;
