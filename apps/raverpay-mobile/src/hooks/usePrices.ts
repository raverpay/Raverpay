// src/hooks/usePrices.ts
import { useQuery } from '@tanstack/react-query';
import { circleService } from '@/src/services/circle.service';

interface PriceData {
  prices: Record<string, number>;
  updatedAt: string;
}

/**
 * Hook to fetch current crypto prices from CoinGecko
 * Fetches prices for ETH, USDC, POL, AVAX, SOL
 * Prices are cached for 5 minutes
 */
export const usePrices = () => {
  return useQuery<PriceData>({
    queryKey: ['crypto-prices'],
    queryFn: async () => {
      const response = await circleService.getPrices();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Get the price for a specific token
 * Maps testnet tokens to mainnet prices
 */
export const getTokenPrice = (
  prices: Record<string, number> | undefined,
  symbol: string,
): number | null => {
  if (!prices) return null;

  // Direct match
  if (prices[symbol] !== undefined) {
    return prices[symbol];
  }

  // Map testnet tokens to mainnet prices
  const symbolMap: Record<string, string> = {
    'ETH-SEPOLIA': 'ETH',
    'MATIC-AMOY': 'POL',
    'POL-AMOY': 'POL',
    'ARB-SEPOLIA': 'ETH', // Arbitrum uses ETH
    'OP-SEPOLIA': 'ETH', // Optimism uses ETH
    'BASE-SEPOLIA': 'ETH', // Base uses ETH
    'AVAX-FUJI': 'AVAX',
    'SOL-DEVNET': 'SOL',
  };

  const mappedSymbol = symbolMap[symbol];
  if (mappedSymbol && prices[mappedSymbol] !== undefined) {
    return prices[mappedSymbol];
  }

  return null;
};

/**
 * Calculate the USD value of a token amount
 */
export const calculateUsdValue = (
  prices: Record<string, number> | undefined,
  symbol: string,
  amount: string | number,
): number => {
  const price = getTokenPrice(prices, symbol);
  if (price === null) return 0;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount * price;
};

/**
 * Format a price with appropriate decimals
 */
export const formatPrice = (price: number): string => {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
};

/**
 * Format a USD value
 */
export const formatUsdValue = (value: number): string => {
  if (value >= 1000) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (value >= 0.01) {
    return `$${value.toFixed(2)}`;
  }
  if (value > 0) {
    return '<$0.01';
  }
  return '$0.00';
};
