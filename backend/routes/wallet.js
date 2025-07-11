const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const WalletData = require('../models/WalletData');

const router = express.Router();
const DEBANK_BASE = 'https://pro-openapi.debank.com/v1';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CHAINS = ['eth', 'bsc', 'arb', 'matic', 'base', 'op'];

// Auth middleware
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Add a wallet address to the user
router.post('/add-wallet', auth, async (req, res) => {
  const { wallet } = req.body;
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { wallets: wallet } });
  res.json({ message: 'Wallet added' });
});

// Enhanced token fetching with better error handling
async function fetchTokens(address) {
  let allTokens = [];
  console.log(`🔍 Fetching tokens for address: ${address}`);
  
  for (const chain of CHAINS) {
    try {
      console.log(`📡 Fetching tokens from ${chain}...`);
      const { data } = await axios.get(
        `${DEBANK_BASE}/user/token_list`,
        {
          params: { 
            id: address, 
            chain_id: chain, 
            is_all: false // Changed back to false to avoid spam tokens
          },
          headers: { 
            AccessKey: process.env.DEBANK_API_KEY, 
            Accept: 'application/json' 
          },
          timeout: 10000
        }
      );
      
      console.log(`✅ Found ${data.length} tokens on ${chain}`);
     
      // Add chain info to each token and filter out spam tokens
      const tokensWithChain = data
        .filter(token => {
          // Filter out obvious spam tokens
          const spamKeywords = ['visit', 'claim', 'airdrop', 'reward', 'www.', 'http', '.com', '.io', '.xyz', '.top', '.eu'];
          const tokenName = (token.name || '').toLowerCase();
          const tokenSymbol = (token.symbol || '').toLowerCase();
          
          return !spamKeywords.some(keyword => 
            tokenName.includes(keyword) || tokenSymbol.includes(keyword)
          );
        })
        .map(token => ({
          ...token,
          chain_id: chain
        }));
      
      allTokens.push(...tokensWithChain);
    } catch (err) {
      console.error(`❌ Error fetching tokens for ${chain}:`, {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
    }
  }
  
  console.log(`📊 Total clean tokens found: ${allTokens.length}`);
  return allTokens;
}

// Enhanced CoinGecko price fetching with better symbol mapping
async function fetchPricesFromCoinGecko(tokens) {
  if (!tokens.length) return {};
  
  // Create a comprehensive symbol to CoinGecko ID mapping
  const symbolToId = {
    // Major tokens
    'eth': 'ethereum',
    'weth': 'ethereum',
    'btc': 'bitcoin',
    'wbtc': 'wrapped-bitcoin',
    'usdt': 'tether',
    'usdc': 'usd-coin',
    'dai': 'dai',
    'busd': 'binance-usd',
    'matic': 'matic-network',
    'wmatic': 'matic-network',
    'bnb': 'binancecoin',
    'wbnb': 'binancecoin',
    'avax': 'avalanche-2',
    'wavax': 'avalanche-2',
    'op': 'optimism',
    'arb': 'arbitrum',
    
    // DeFi tokens
    'uni': 'uniswap',
    'sushi': 'sushi',
    'aave': 'aave',
    'comp': 'compound-coin',
    'mkr': 'maker',
    'snx': 'havven',
    'crv': 'curve-dao-token',
    'cvx': 'convex-finance',
    'frax': 'frax',
    'fxs': 'frax-share',
    'bal': 'balancer',
    'yearn': 'yearn-finance',
    'yfi': 'yearn-finance',
    
    // Stablecoins
    'frax': 'frax',
    'lusd': 'liquity-usd',
    'susd': 'nusd',
    'tusd': 'true-usd',
    'gusd': 'gemini-dollar',
    'pax': 'paxos-standard',
    'usdp': 'paxos-standard',
    
    // Layer 2 tokens
    'matic': 'matic-network',
    'ftm': 'fantom',
    'one': 'harmony',
    'celo': 'celo',
    'movr': 'moonriver',
    'glmr': 'moonbeam',
    
    // Wrapped tokens
    'wftm': 'fantom',
    'wone': 'harmony',
    'wcelo': 'celo',
    'wmovr': 'moonriver',
    'wglmr': 'moonbeam'
  };
  
  // Get unique symbols and map to CoinGecko IDs
  const uniqueSymbols = [...new Set(tokens.map(t => t.symbol?.toLowerCase()).filter(Boolean))];
  const coinGeckoIds = [...new Set(uniqueSymbols.map(symbol => symbolToId[symbol]).filter(Boolean))];
  
  console.log(`💰 Fetching prices for ${coinGeckoIds.length} tokens from CoinGecko...`);
  
  if (!coinGeckoIds.length) {
    console.log(`⚠️ No matching CoinGecko IDs found`);
    return {};
  }
  
  try {
    const { data } = await axios.get(
      `${COINGECKO_BASE}/simple/price`,
      { 
        params: { 
          ids: coinGeckoIds.join(','), 
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true 
        },
        timeout: 15000
      }
    );
    
    console.log(`✅ Fetched prices for ${Object.keys(data).length} tokens`);
    
    // Create reverse mapping for easy lookup
    const priceMap = {};
    for (const [symbol, id] of Object.entries(symbolToId)) {
      if (data[id]) {
        priceMap[symbol] = data[id].usd;
      }
    }
    
    return priceMap;
  } catch (err) {
    console.error('❌ Error fetching prices from CoinGecko:', err.response?.data || err.message);
    return {};
  }
}

// Enhanced protocol fetching with better error handling
async function fetchAllProtocols(address) {
  let allProtocols = [];
  console.log(`🔍 Fetching all protocols for address: ${address}`);
  
  for (const chain of CHAINS) {
    try {
      console.log(`📡 Fetching protocols from ${chain}...`);
      const { data } = await axios.get(
        `${DEBANK_BASE}/user/all_complex_protocol_list`,
        {
          params: { 
            id: address, 
            chain_id: chain 
          },
          headers: { 
            AccessKey: process.env.DEBANK_API_KEY, 
            Accept: 'application/json' 
          },
          timeout: 10000
        }
      );
   
      if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} protocols on ${chain}`);
        const protocolsWithChain = data.map(protocol => ({
          ...protocol,
          chain_id: chain
        }));
        allProtocols.push(...protocolsWithChain);
      }
    } catch (err) {
      console.error(`❌ Error fetching protocols for ${chain}:`, {
        status: err.response?.status,
        message: err.message
      });
    }
  }
  
  console.log(`📊 Total protocols found: ${allProtocols.length}`);
  return allProtocols;
}

// Enhanced portfolio summary calculation
function calculatePortfolioSummary(tokens, protocols) {
  const tokenValue = tokens.reduce((sum, token) => sum + (token.usd_value || 0), 0);
  const protocolValue = protocols.reduce((sum, protocol) => sum + (protocol.net_usd_value || 0), 0);
  
  return {
    total_usd_value: tokenValue + protocolValue,
    token_usd_value: tokenValue,
    protocol_usd_value: protocolValue,
    token_count: tokens.length,
    protocol_count: protocols.length
  };
}

// Function to deduplicate protocols
function deduplicateProtocols(protocols) {
  const seen = new Set();
  return protocols.filter(p => {
    const key = `${p.id}_${p.chain_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Function to deduplicate protocols by ID
function deduplicateProtocolsById(protocols) {
  const seen = new Set();
  return protocols.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

// Main enhanced wallet route
router.get('/wallets', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  const wallets = user.wallets || [];
  if (!wallets.length) return res.status(400).json({ error: 'No wallets added' });

  console.log(`🚀 Processing ${wallets.length} wallets...`);

  try {
    const results = await Promise.all(wallets.map(async (wallet) => {
      console.log(`\n🔄 Processing wallet: ${wallet}`);
      
      // Fetch tokens and protocols in parallel
      const [tokens, protocols] = await Promise.all([
        fetchTokens(wallet),
        fetchAllProtocols(wallet)
      ]);
      
      // Get prices from CoinGecko
      const coinGeckoPrices = await fetchPricesFromCoinGecko(tokens);
      
      // Enhanced token processing with price enrichment
      const enrichedTokens = tokens.map(token => {
        const symbol = (token.symbol || '').toLowerCase();
        
        // Try multiple price sources in order of preference
        let finalPrice = 0;
        
        // 1. Try CoinGecko price
        if (coinGeckoPrices[symbol]) {
          finalPrice = coinGeckoPrices[symbol];
        }
        // 2. Try wrapped token equivalent
        else if (symbol.startsWith('w') && coinGeckoPrices[symbol.substring(1)]) {
          finalPrice = coinGeckoPrices[symbol.substring(1)];
        }
        // 3. Fall back to DeBankPrice
        else if (token.price && token.price > 0) {
          finalPrice = token.price;
        }
        
        const usdValue = finalPrice * (token.amount || 0);
        
        return {
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          amount: token.amount || 0,
          price: finalPrice,
          usd_value: usdValue,
          chain: token.chain_id || token.chain,
          logo_url: token.logo_url,
          is_verified: token.is_verified,
          is_core: token.is_core,
          decimals: token.decimals
        };
      });

      // Enhanced protocol processing
      const enrichedProtocols = protocols
        .filter(protocol => protocol.net_usd_value && protocol.net_usd_value > 0.01) // Only protocols with significant value
        .map(protocol => ({
          protocol_id: protocol.id,
          name: protocol.name,
          chain: protocol.chain_id,
          lending_rate: protocol.tvl,
          logo_url: protocol.logo_url,
          site_url: protocol.site_url,
          net_usd_value: protocol.net_usd_value || 0,
          asset_usd_value: protocol.asset_usd_value || 0,
          debt_usd_value: protocol.debt_usd_value || 0,
          portfolio_item_count: protocol.portfolio_item_list?.length || 0,
          description: protocol.description
        }));

      // Calculate summary
      const summary = calculatePortfolioSummary(enrichedTokens, enrichedProtocols);

      console.log(`💼 Wallet ${wallet} summary:`, {
        tokens: enrichedTokens.length,
        token_value: summary.token_usd_value.toFixed(2),
        protocols: enrichedProtocols.length,
        protocol_value: summary.protocol_usd_value.toFixed(2),
        total_value: summary.total_usd_value.toFixed(2)
      });

      return {
        address: wallet,
        tokens: enrichedTokens.map(t => ({
          symbol: t.symbol,
          name: t.name,
          amount: t.amount,
          price: t.price,
          usd_value: t.usd_value,
          chain: t.chain,
          logo_url: t.logo_url
        })),
        protocols: protocols.map(protocol => ({
          protocol_id: protocol.id,
          lending_rate: protocol.tvl,
          name: protocol.name,
          chain: protocol.chain_id,
          logo_url: protocol.logo_url,
          site_url: protocol.site_url,
          net_usd_value: protocol.net_usd_value || 0,
          positions: (protocol.portfolio_item_list || []).map(item => ({
            position_name: item.name,
            tokens: (item.detail?.supply_token_list || []).map(t => ({
              symbol: t.symbol,
              amount: t.amount,
              usd_value: t.amount * t.price
            })),
            rewards: (item.detail?.reward_token_list || []).map(t => ({
              symbol: t.symbol,
              amount: t.amount,
              usd_value: t.amount * t.price
            })),
            pool_id: item.pool?.id,
            description: item.detail?.description
          }))
        })),
        summary
      };
    }));

    // Calculate overall portfolio summary
    const overallSummary = results.reduce((acc, wallet) => ({
      total_usd_value: acc.total_usd_value + wallet.summary.total_usd_value,
      token_usd_value: acc.token_usd_value + wallet.summary.token_usd_value,
      protocol_usd_value: acc.protocol_usd_value + wallet.summary.protocol_usd_value,
      token_count: acc.token_count + wallet.summary.token_count,
      protocol_count: acc.protocol_count + wallet.summary.protocol_count,
      wallet_count: acc.wallet_count + 1
    }), {
      total_usd_value: 0,
      token_usd_value: 0,
      protocol_usd_value: 0,
      token_count: 0,
      protocol_count: 0,
      wallet_count: 0
    });

    console.log(`✅ Successfully processed all wallets. Total portfolio value: $${overallSummary.total_usd_value.toFixed(2)}`);
    
    res.json({ 
      portfolios: results,
      overall_summary: overallSummary,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Main error in /wallets route:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch wallet and protocol data', details: err.message });
  }
});

// GET /api/wallet/:address -> fetch enriched data for specific wallet
router.get('/wallet/:address', auth, async (req, res) => {
  const address = req.params.address;
  console.log(`🔍 Fetching data for single wallet: ${address}`);
  
  try {
    // Fetch tokens and protocols in parallel
    const [tokens, protocols] = await Promise.all([
      fetchTokens(address),
      fetchAllProtocols(address)
    ]);
    
    // Get prices from CoinGecko
    const coinGeckoPrices = await fetchPricesFromCoinGecko(tokens);
    
    const enrichedTokens = tokens.map(token => {
      const symbol = (token.symbol || '').toLowerCase();
      let finalPrice = coinGeckoPrices[symbol] || token.price || 0;
      
      return {
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        amount: token.amount || 0,
        price: finalPrice,
        usd_value: finalPrice * (token.amount || 0),
        chain: token.chain_id || token.chain,
        logo_url: token.logo_url,
        decimals: token.decimals
      };
    });
    
    const enrichedProtocols = protocols
      .filter(protocol => protocol.net_usd_value && protocol.net_usd_value > 0.01)
      .map(protocol => ({
        protocol_id: protocol.id,
        name: protocol.name,
        chain: protocol.chain_id,
        net_usd_value: protocol.net_usd_value || 0,
        logo_url: protocol.logo_url
      }));
    
    const summary = calculatePortfolioSummary(enrichedTokens, enrichedProtocols);
    
    res.json({ 
      address, 
      tokens: enrichedTokens,
      protocols: enrichedProtocols,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Error in /wallet/:address route:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch wallet data', details: err.message });
  }
});

// New route to get detailed protocol information
router.get('/wallet/:address/protocol/:protocolId/:chainId', auth, async (req, res) => {
  const { address, protocolId, chainId } = req.params;
  
  try {
    console.log(`📡 Fetching detailed protocol data for ${protocolId} on ${chainId}...`);
    
    const { data } = await axios.get(
      `${DEBANK_BASE}/user/protocol`,
      {
        params: { 
          id: address, 
          protocol_id: protocolId,
          chain_id: chainId 
        },
        headers: { 
          AccessKey: process.env.DEBANK_API_KEY, 
          Accept: 'application/json' 
        },
        timeout: 10000
      }
    );
    
    res.json({ 
      protocol: data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Error fetching protocol details:`, err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch protocol details', details: err.message });
  }
});

module.exports = router;