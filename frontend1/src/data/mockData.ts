export interface MockUser {
  id: string;
  username: string;
  email: string;
  password: string;
  created_at: string;
}

export interface MockWallet {
  address: string;
  tokens: Array<{
    symbol: string;
    name: string;
    amount: number;
    price: number;
    usd_value: number;
    chain: string;
    logo_url: string;
  }>;
  protocols: Array<{
    protocol_id: string;
    name: string;
    chain: string;
    net_usd_value: number;
    daily_apy?: number;
    logo_url?: string;
    positions: Array<{
      position_name: string;
      tokens: Array<{
        symbol: string;
        amount: number;
        usd_value: number;
      }>;
      rewards: Array<{
        symbol: string;
        amount: number;
        usd_value: number;
      }>;
    }>;
  }>;
  summary: {
    total_usd_value: number;
    token_usd_value: number;
    protocol_usd_value: number;
  };
}

// Test Users
export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'demo',
    email: 'demo@hermetik.com',
    password: 'password123',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    username: 'alice',
    email: 'alice@example.com',
    password: 'alice123',
    created_at: '2024-02-01T14:20:00Z'
  },
  {
    id: '3',
    username: 'bob',
    email: 'bob@example.com',
    password: 'bob123',
    created_at: '2024-02-10T09:15:00Z'
  }
];

// Mock Portfolio Data
export const mockWallets: MockWallet[] = [
  {
    address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
    tokens: [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        amount: 12.5,
        price: 2340.50,
        usd_value: 29256.25,
        chain: 'ethereum',
        logo_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        amount: 15000,
        price: 1.00,
        usd_value: 15000,
        chain: 'ethereum',
        logo_url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      },
      {
        symbol: 'WBTC',
        name: 'Wrapped Bitcoin',
        amount: 0.75,
        price: 43200,
        usd_value: 32400,
        chain: 'ethereum',
        logo_url: 'https://cryptologos.cc/logos/wrapped-bitcoin-wbtc-logo.png'
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        amount: 500,
        price: 8.45,
        usd_value: 4225,
        chain: 'ethereum',
        logo_url: 'https://cryptologos.cc/logos/uniswap-uni-logo.png'
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        amount: 8000,
        price: 0.85,
        usd_value: 6800,
        chain: 'polygon',
        logo_url: 'https://cryptologos.cc/logos/polygon-matic-logo.png'
      }
    ],
    protocols: [
      {
        protocol_id: 'uniswap_v3',
        name: 'Uniswap V3',
        chain: 'ethereum',
        net_usd_value: 25000,
        daily_apy: 12.5,
        positions: [
          {
            position_name: 'ETH/USDC LP',
            tokens: [
              { symbol: 'ETH', amount: 5.2, usd_value: 12168 },
              { symbol: 'USDC', amount: 12832, usd_value: 12832 }
            ],
            rewards: [
              { symbol: 'UNI', amount: 15.5, usd_value: 130.98 }
            ]
          }
        ]
      },
      {
        protocol_id: 'aave_v3',
        name: 'Aave V3',
        chain: 'ethereum',
        net_usd_value: 18500,
        daily_apy: 4.2,
        positions: [
          {
            position_name: 'USDC Lending',
            tokens: [
              { symbol: 'aUSDC', amount: 18500, usd_value: 18500 }
            ],
            rewards: [
              { symbol: 'AAVE', amount: 2.1, usd_value: 168 }
            ]
          }
        ]
      },
      {
        protocol_id: 'compound_v3',
        name: 'Compound V3',
        chain: 'ethereum',
        net_usd_value: 8200,
        daily_apy: 3.8,
        positions: [
          {
            position_name: 'ETH Collateral',
            tokens: [
              { symbol: 'cETH', amount: 3.5, usd_value: 8200 }
            ],
            rewards: [
              { symbol: 'COMP', amount: 0.8, usd_value: 48 }
            ]
          }
        ]
      }
    ],
    summary: {
      total_usd_value: 139381.25,
      token_usd_value: 87681.25,
      protocol_usd_value: 51700
    }
  },
  {
    address: '0x8ba1f109551bD432803012645Hac136c22C85B',
    tokens: [
      {
        symbol: 'BNB',
        name: 'BNB',
        amount: 25,
        price: 310.50,
        usd_value: 7762.50,
        chain: 'bsc',
        logo_url: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
      },
      {
        symbol: 'CAKE',
        name: 'PancakeSwap',
        amount: 1200,
        price: 2.15,
        usd_value: 2580,
        chain: 'bsc',
        logo_url: 'https://cryptologos.cc/logos/pancakeswap-cake-logo.png'
      },
      {
        symbol: 'BUSD',
        name: 'Binance USD',
        amount: 5000,
        price: 1.00,
        usd_value: 5000,
        chain: 'bsc',
        logo_url: 'https://cryptologos.cc/logos/binance-usd-busd-logo.png'
      }
    ],
    protocols: [
      {
        protocol_id: 'pancakeswap_v3',
        name: 'PancakeSwap V3',
        chain: 'bsc',
        net_usd_value: 12000,
        daily_apy: 18.5,
        positions: [
          {
            position_name: 'BNB/BUSD LP',
            tokens: [
              { symbol: 'BNB', amount: 15, usd_value: 4657.50 },
              { symbol: 'BUSD', amount: 7342.50, usd_value: 7342.50 }
            ],
            rewards: [
              { symbol: 'CAKE', amount: 25, usd_value: 53.75 }
            ]
          }
        ]
      },
      {
        protocol_id: 'venus',
        name: 'Venus Protocol',
        chain: 'bsc',
        net_usd_value: 6500,
        daily_apy: 8.2,
        positions: [
          {
            position_name: 'BUSD Lending',
            tokens: [
              { symbol: 'vBUSD', amount: 6500, usd_value: 6500 }
            ],
            rewards: [
              { symbol: 'XVS', amount: 12, usd_value: 84 }
            ]
          }
        ]
      }
    ],
    summary: {
      total_usd_value: 33842.50,
      token_usd_value: 15342.50,
      protocol_usd_value: 18500
    }
  },
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    tokens: [
      {
        symbol: 'ARB',
        name: 'Arbitrum',
        amount: 2500,
        price: 1.25,
        usd_value: 3125,
        chain: 'arbitrum',
        logo_url: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png'
      },
      {
        symbol: 'GMX',
        name: 'GMX',
        amount: 50,
        price: 45.80,
        usd_value: 2290,
        chain: 'arbitrum',
        logo_url: 'https://cryptologos.cc/logos/gmx-gmx-logo.png'
      },
      {
        symbol: 'USDC.e',
        name: 'USD Coin (Bridged)',
        amount: 8000,
        price: 1.00,
        usd_value: 8000,
        chain: 'arbitrum',
        logo_url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      }
    ],
    protocols: [
      {
        protocol_id: 'gmx_v2',
        name: 'GMX V2',
        chain: 'arbitrum',
        net_usd_value: 15000,
        daily_apy: 22.3,
        positions: [
          {
            position_name: 'GLP Staking',
            tokens: [
              { symbol: 'GLP', amount: 15000, usd_value: 15000 }
            ],
            rewards: [
              { symbol: 'ETH', amount: 0.05, usd_value: 117.03 },
              { symbol: 'esGMX', amount: 8.5, usd_value: 389.30 }
            ]
          }
        ]
      },
      {
        protocol_id: 'radiant',
        name: 'Radiant Capital',
        chain: 'arbitrum',
        net_usd_value: 7200,
        daily_apy: 15.8,
        positions: [
          {
            position_name: 'USDC Lending',
            tokens: [
              { symbol: 'rUSDC', amount: 7200, usd_value: 7200 }
            ],
            rewards: [
              { symbol: 'RDNT', amount: 150, usd_value: 45 }
            ]
          }
        ]
      }
    ],
    summary: {
      total_usd_value: 35615,
      token_usd_value: 13415,
      protocol_usd_value: 22200
    }
  }
];

// Mock Performance Metrics
export const mockPerformanceMetrics = {
  total_return: 15.67,
  daily_return: 2.34,
  monthly_return: 8.92,
  volatility: 18.45,
  sharpe_ratio: 1.85,
  max_drawdown: -12.34
};

// Mock Portfolio History (30 days)
export const mockPortfolioHistory = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  
  const baseValue = 208838.75; // Total portfolio value
  const volatility = 0.05; // 5% daily volatility
  const trend = 0.001; // Slight upward trend
  
  const randomChange = (Math.random() - 0.5) * volatility;
  const trendChange = trend * i;
  const value = baseValue * (1 + trendChange + randomChange);
  
  const previousValue = i > 0 ? baseValue * (1 + trend * (i - 1) + (Math.random() - 0.5) * volatility) : baseValue;
  const daily_return = ((value - previousValue) / previousValue) * 100;
  
  return {
    date: date.toISOString().split('T')[0],
    value: Math.round(value),
    daily_return: Number(daily_return.toFixed(2))
  };
});

// User wallet mapping
export const userWallets: { [userId: string]: string[] } = {
  '1': ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1', '0x8ba1f109551bD432803012645Hac136c22C85B'],
  '2': ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1'],
  '3': ['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984']
};

// Helper function to get wallets for a user
export const getWalletsForUser = (userId: string): MockWallet[] => {
  const walletAddresses = userWallets[userId] || [];
  return mockWallets.filter(wallet => walletAddresses.includes(wallet.address));
};

// Helper function to find user by credentials
export const findUserByCredentials = (username: string, password: string): MockUser | null => {
  return mockUsers.find(user => user.username === username && user.password === password) || null;
};

// Helper function to find user by ID
export const findUserById = (id: string): MockUser | null => {
  return mockUsers.find(user => user.id === id) || null;
};