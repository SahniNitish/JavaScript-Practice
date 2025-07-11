import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { walletApi } from '../services/api';
import { TrendingUp, Gift, Search, Filter } from 'lucide-react';
import Card from '../components/UI/Card';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { Protocol } from '../types';

const Positions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChain, setSelectedChain] = useState('all');

  const { data: wallets, isLoading, error } = useQuery({
    queryKey: ['wallets'],
    queryFn: walletApi.getWallets,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Error loading positions data</p>
      </div>
    );
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No positions found. Add a wallet to see your DeFi positions.</p>
      </div>
    );
  }

  // Flatten all protocols from all wallets
  const allProtocols: Protocol[] = wallets.flatMap(wallet => wallet.protocols);

  // Get unique chains for filter
  const chains = Array.from(new Set(allProtocols.map(protocol => protocol.chain)));

  // Filter protocols
  const filteredProtocols = allProtocols.filter(protocol => {
    const matchesSearch = protocol.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChain = selectedChain === 'all' || protocol.chain === selectedChain;
    return matchesSearch && matchesChain;
  });

  const totalPositionsValue = filteredProtocols.reduce((sum, protocol) => sum + protocol.net_usd_value, 0);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">DeFi Positions</h1>
        <p className="text-gray-400">Track your lending, liquidity, and yield farming positions</p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search protocols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Chains</option>
              {chains.map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProtocols.map((protocol, index) => (
          <Card key={`${protocol.protocol_id}-${index}`} className="hover:border-blue-500/50 transition-colors">
            <div className="space-y-4">
              {/* Protocol Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">
                      {protocol.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{protocol.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs">
                        {protocol.chain}
                      </span>
                      {protocol.daily_apy && (
                        <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded-full text-xs">
                          {protocol.daily_apy.toFixed(2)}% APY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">${protocol.net_usd_value.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Value</p>
                </div>
              </div>

              {/* Positions */}
              <div className="space-y-3">
                {protocol.positions.map((position, posIndex) => (
                  <div key={posIndex} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{position.position_name}</h4>
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    
                    {/* Supply Tokens */}
                    {position.tokens.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Supply</p>
                        <div className="space-y-1">
                          {position.tokens.map((token, tokenIndex) => (
                            <div key={tokenIndex} className="flex justify-between text-sm">
                              <span className="text-gray-300">{token.symbol}</span>
                              <div className="text-right">
                                <span className="text-white">{token.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                <span className="text-gray-400 ml-2">${token.usd_value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    {position.rewards.length > 0 && (
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <Gift className="w-3 h-3 text-yellow-400" />
                          <p className="text-xs text-gray-400">Unclaimed Rewards</p>
                        </div>
                        <div className="space-y-1">
                          {position.rewards.map((reward, rewardIndex) => (
                            <div key={rewardIndex} className="flex justify-between text-sm">
                              <span className="text-yellow-300">{reward.symbol}</span>
                              <div className="text-right">
                                <span className="text-white">{reward.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                <span className="text-gray-400 ml-2">${reward.usd_value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-400">Total Positions Value</p>
            <p className="text-2xl font-bold text-white">${totalPositionsValue.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400">Active Protocols</p>
            <p className="text-2xl font-bold text-white">{filteredProtocols.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Positions;