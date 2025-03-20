import { format, formatDistance } from 'date-fns';
import { BigNumber } from 'ethers';

// Unix timestamp を日付文字列に変換
export const formatTimestamp = (timestamp: number | string): string => {
  const date = new Date(Number(timestamp) * 1000);
  return format(date, 'yyyy/MM/dd HH:mm:ss');
};

// Unix timestamp を相対時間に変換
export const formatTimestampRelative = (timestamp: number | string): string => {
  const date = new Date(Number(timestamp) * 1000);
  return formatDistance(date, new Date(), { addSuffix: true });
};

// アドレスを省略形式で表示
export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

// 数値をUSD形式でフォーマット
export const formatUSD = (value: number | string, decimals = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  console.log(num);
  // 大きな数値の場合は単位を追加
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(decimals)}B`;
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(decimals)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(decimals)}K`;
  }

  return `$${num.toFixed(decimals)}`;
};

// 数値を通常形式でフォーマット
export const formatNumber = (value: number | string, decimals = 4): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  // 大きな数値の場合は単位を追加
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(decimals)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(decimals)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)}K`;
  }

  return num.toFixed(decimals);
};

// Uniswap v3のtickから価格を計算
export const tickToPrice = (tick: number): number => {
  return Math.pow(1.0001, tick);
};

// トークンの量をデシマルを考慮して変換
export const formatTokenAmount = (amount: string | number, decimals: number | string): number => {
  const decimalValue = typeof decimals === 'string' ? parseInt(decimals) : decimals;
  const value = typeof amount === 'string' ? amount : amount.toString();

  // BigNumberを使って計算精度を保つ
  try {
    return parseFloat(BigNumber.from(value).div(BigNumber.from(10).pow(decimalValue)).toString());
  } catch (e) {
    // エラーの場合は単純に割り算で対応
    return Number(value) / Math.pow(10, decimalValue);
  }
};

// 時間範囲に基づくタイムスタンプの取得
export const getTimeRangeTimestamp = (range: string): number => {
  const now = Math.floor(Date.now() / 1000);

  switch (range) {
    case '1h':
      return now - 60 * 60;
    case '24h':
      return now - 24 * 60 * 60;
    case '7d':
      return now - 7 * 24 * 60 * 60;
    case '30d':
      return now - 30 * 24 * 60 * 60;
    case '90d':
      return now - 90 * 24 * 60 * 60;
    case '180d':
      return now - 180 * 24 * 60 * 60;
    case '1y':
      return now - 365 * 24 * 60 * 60;
    case 'all':
    default:
      return 0; // 全期間
  }
};

// Tick間隔に基づいてTickをグループ化
export const groupTicksBySpacing = (ticks: any[], tickSpacing: number): any[] => {
  if (!ticks || ticks.length === 0) return [];

  const grouped: { [key: number]: any } = {};
  const spacedTicks: any[] = [];

  // 同じTick間隔内のTickをマージ
  ticks.forEach((tick) => {
    const spacedTick = Math.floor(tick.tickIdx / tickSpacing) * tickSpacing;

    if (!grouped[spacedTick]) {
      grouped[spacedTick] = {
        tickIdx: spacedTick,
        liquidityNet: 0,
        liquidityGross: 0,
        price0: tick.price0,
        price1: tick.price1,
      };
    }

    grouped[spacedTick].liquidityNet += parseFloat(tick.liquidityNet);
    grouped[spacedTick].liquidityGross += parseFloat(tick.liquidityGross);
  });

  // オブジェクトを配列に変換
  for (const key in grouped) {
    spacedTicks.push(grouped[key]);
  }

  // Tick番号でソート
  return spacedTicks.sort((a, b) => a.tickIdx - b.tickIdx);
};

// チャート用のデータを生成
export const processChartData = (data: any[], key: string, timeKey = 'timestamp'): any[] => {
  if (!data || data.length === 0) return [];

  // 日付順にソート
  const sortedData = [...data].sort((a, b) => Number(a[timeKey]) - Number(b[timeKey]));

  return sortedData.map((item) => {
    const timestamp = Number(item[timeKey]);
    return {
      date: new Date(timestamp * 1000),
      value: parseFloat(item[key]),
      ...item,
    };
  });
};
