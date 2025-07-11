import { 
  mockUsers, 
  mockWallets, 
  mockPerformanceMetrics, 
  mockPortfolioHistory,
  getWalletsForUser,
  findUserByCredentials,
  findUserById,
  userWallets
} from '../data/mockData';
import { AuthResponse, User, Wallet, PerformanceMetrics, HistoryPoint } from '../types';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage for tokens
const MOCK_TOKEN_KEY = 'mock_access_token';
const MOCK_USER_KEY = 'mock_current_user';

export const mockAuthApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    await delay(800); // Simulate network delay
    
    const user = findUserByCredentials(username, password);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const token = `mock_token_${user.id}_${Date.now()}`;
    localStorage.setItem(MOCK_TOKEN_KEY, token);
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at
      }
    };
  },

  signup: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    await delay(1000);
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.username === username || u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create new user
    const newUser = {
      id: String(mockUsers.length + 1),
      username,
      email,
      password,
      created_at: new Date().toISOString()
    };

    mockUsers.push(newUser);
    userWallets[newUser.id] = []; // Initialize empty wallet list

    const token = `mock_token_${newUser.id}_${Date.now()}`;
    localStorage.setItem(MOCK_TOKEN_KEY, token);
    localStorage.setItem(MOCK_USER_KEY, JSON.stringify(newUser));

    return {
      access_token: token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      }
    };
  },

  getProfile: async (): Promise<User> => {
    await delay(300);
    
    const token = localStorage.getItem(MOCK_TOKEN_KEY);
    if (!token) {
      throw new Error('No token found');
    }

    const userStr = localStorage.getItem(MOCK_USER_KEY);
    if (!userStr) {
      throw new Error('No user found');
    }

    const user = JSON.parse(userStr);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at
    };
  },

  addWallet: async (address: string): Promise<{ message: string }> => {
    await delay(500);
    
    const userStr = localStorage.getItem(MOCK_USER_KEY);
    if (!userStr) {
      throw new Error('User not found');
    }

    const user = JSON.parse(userStr);
    
    // Check if wallet already exists for this user
    if (userWallets[user.id]?.includes(address)) {
      throw new Error('Wallet already added');
    }

    // Add wallet to user's wallet list
    if (!userWallets[user.id]) {
      userWallets[user.id] = [];
    }
    userWallets[user.id].push(address);

    // If this is a new wallet address, create mock data for it
    if (!mockWallets.find(w => w.address === address)) {
      const newWallet: Wallet = {
        address,
        tokens: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            amount: Math.random() * 5,
            price: 2340.50,
            usd_value: 0,
            chain: 'ethereum',
            logo_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
          }
        ],
        protocols: [],
        summary: {
          total_usd_value: 0,
          token_usd_value: 0,
          protocol_usd_value: 0
        }
      };
      
      // Calculate values
      newWallet.tokens[0].usd_value = newWallet.tokens[0].amount * newWallet.tokens[0].price;
      newWallet.summary.token_usd_value = newWallet.tokens[0].usd_value;
      newWallet.summary.total_usd_value = newWallet.summary.token_usd_value;
      
      mockWallets.push(newWallet);
    }

    return { message: 'Wallet added successfully' };
  }
};

export const mockWalletApi = {
  getWallets: async (): Promise<Wallet[]> => {
    await delay(600);
    
    const userStr = localStorage.getItem(MOCK_USER_KEY);
    if (!userStr) {
      throw new Error('User not found');
    }

    const user = JSON.parse(userStr);
    return getWalletsForUser(user.id);
  }
};

export const mockAnalyticsApi = {
  getPortfolioHistory: async (days: number = 30): Promise<HistoryPoint[]> => {
    await delay(400);
    
    // Return last N days of history
    return mockPortfolioHistory.slice(-days);
  },

  getPerformanceMetrics: async (period: number = 30): Promise<PerformanceMetrics> => {
    await delay(350);
    
    // Adjust metrics based on period
    const periodMultiplier = period / 30;
    return {
      ...mockPerformanceMetrics,
      total_return: mockPerformanceMetrics.total_return * periodMultiplier,
      monthly_return: mockPerformanceMetrics.monthly_return * (period / 30),
      volatility: mockPerformanceMetrics.volatility * Math.sqrt(periodMultiplier)
    };
  },

  exportExcel: async (): Promise<Blob> => {
    await delay(1500);
    
    // Create a simple CSV content as mock Excel export
    const csvContent = `Portfolio Export - ${new Date().toISOString().split('T')[0]}
    
Wallet Address,Token Symbol,Token Name,Amount,Price,USD Value,Chain
${mockWallets.map(wallet => 
  wallet.tokens.map(token => 
    `${wallet.address},${token.symbol},${token.name},${token.amount},${token.price},${token.usd_value},${token.chain}`
  ).join('\n')
).join('\n')}

Protocol Positions:
Wallet Address,Protocol Name,Chain,Position Name,USD Value
${mockWallets.map(wallet =>
  wallet.protocols.map(protocol =>
    protocol.positions.map(position =>
      `${wallet.address},${protocol.name},${protocol.chain},${position.position_name},${protocol.net_usd_value}`
    ).join('\n')
  ).join('\n')
).join('\n')}`;

    return new Blob([csvContent], { type: 'text/csv' });
  }
};

export const mockAdminApi = {
  collectData: async (): Promise<{ message: string; status: string }> => {
    await delay(2000); // Simulate longer operation
    
    return {
      message: 'Data collection completed successfully',
      status: 'success'
    };
  }
};