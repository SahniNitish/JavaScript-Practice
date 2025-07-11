import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, analyticsApi, adminApi } from '../services/api';
import { Download, Plus, Trash2, RefreshCw, Wallet } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { useAuth } from '../contexts/AuthContext';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [newWallet, setNewWallet] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const walletsData = await import('../services/api').then(m => m.walletApi.getWallets());
      return walletsData;
    },
  });

  const addWalletMutation = useMutation({
    mutationFn: (address: string) => authApi.addWallet(address),
    onSuccess: () => {
      setNewWallet('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to add wallet');
    },
  });

  const exportMutation = useMutation({
    mutationFn: analyticsApi.exportExcel,
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });

  const collectDataMutation = useMutation({
    mutationFn: adminApi.collectData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWallet.trim()) return;

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(newWallet)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    addWalletMutation.mutate(newWallet);
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleCollectData = () => {
    collectDataMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your account and portfolio settings</p>
      </div>

      {/* Profile Section */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={user?.username || ''}
              readOnly
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
        </div>
      </Card>

      {/* Wallet Management */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Wallet Management</h2>
        
        {/* Add Wallet Form */}
        <form onSubmit={handleAddWallet} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter Ethereum address (0x...)"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>
            <Button
              type="submit"
              loading={addWalletMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Add Wallet</span>
            </Button>
          </div>
        </form>

        {/* Wallet List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-gray-400">Loading wallets...</p>
          ) : wallets && wallets.length > 0 ? (
            wallets.map((wallet, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Wallet size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{wallet.address}</p>
                    <p className="text-gray-400 text-sm">
                      {wallet.tokens.length} tokens • ${wallet.summary.total_usd_value.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No wallets added yet</p>
          )}
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Export Portfolio Data</h3>
              <p className="text-gray-400 text-sm">Download your complete portfolio data as Excel file</p>
            </div>
            <Button
              onClick={handleExport}
              loading={exportMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Download size={16} />
              <span>Export Excel</span>
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Refresh Data</h3>
              <p className="text-gray-400 text-sm">Manually trigger data collection from all wallets</p>
            </div>
            <Button
              onClick={handleCollectData}
              loading={collectDataMutation.isPending}
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Collect Data</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* API Configuration */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">API Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API Base URL</label>
            <input
              type="text"
              value={import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
              readOnly
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Auto-refresh Interval</label>
            <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white">
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;