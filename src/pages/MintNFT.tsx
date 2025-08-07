import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Package, Wallet, ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, ExternalLink, Copy, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getBackgroundImage } from '../utils/theme';
import toast from 'react-hot-toast';

interface Coin {
  id: number;
  'Coin Name': string;
  'Coin Image': string;
  'BacksideUrl': string | null;
  'Date Issued': string;
  'Number Of Coins': number;
  'Notes': string;
  'Mode Of Acquiring': string;
  'Username': string;
  'Public Display': boolean;
}

interface Supply {
  id: number;
  Contract_Name: string;
  SUPPLY_CAP_ID: string;
  LINEAGE_ID: string;
  COUNTER_ID: string;
  PACKAGE_ID: string;
  RECIPIENT_ADDRESS: string;
  created_at: string;
}

interface UserWallet {
  id: string;
  wallet_address: string;
  name: string;
  created_at: string;
}

interface VettingWallet {
  id: number;
  wallet_address: string;
  privateKey: string;
  user_id: string;
  publicKey: string;
  mnemonic: string;
  created_at: string;
  user_details: {
    Username: string;
    'piture link': string | null;
  } | null;
}

interface MintResponse {
  success: boolean;
  message: string;
  data: {
    transactionDigest: string;
    nftObjectId: string;
    recipientAddress: string;
    nftName: string;
    coinId: string;
    braavVersion: string;
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
  };
  timestamp: string;
}

interface RestrictedMintResponse {
  success: boolean;
  message: string;
  data: {
    transactionDigest: string;
    restrictedNftObjectId: string;
    recipientAddress: string;
    nftName: string;
    coinId: string;
    braavVersion: string;
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
  };
  timestamp: string;
}

export const MintNFT: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  
  const [coins, setCoins] = useState<Coin[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [vettingWallets, setVettingWallets] = useState<VettingWallet[]>([]);
  
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  
  // Restricted NFT states
  const [restrictedSelectedCoin, setRestrictedSelectedCoin] = useState<Coin | null>(null);
  const [restrictedSelectedSupply, setRestrictedSelectedSupply] = useState<Supply | null>(null);
  const [restrictedSelectedWallet, setRestrictedSelectedWallet] = useState<VettingWallet | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restrictedSubmitting, setRestrictedSubmitting] = useState(false);
  const [response, setResponse] = useState<MintResponse | null>(null);
  const [restrictedResponse, setRestrictedResponse] = useState<RestrictedMintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restrictedError, setRestrictedError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Fetch user's coins
      const { data: coinsData, error: coinsError } = await supabase
        .from('Challenge Coin Table')
        .select('*')
        .eq('UserId', user.email)
        .order('created_at', { ascending: false });

      if (coinsError) throw coinsError;

      // Fetch all supplies
      const { data: suppliesData, error: suppliesError } = await supabase
        .from('Supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliesError) throw suppliesError;

      // Fetch user's wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.email)
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      // Fetch vetting wallets with user details
      const { data: vettingWalletsData, error: vettingWalletsError } = await supabase
        .from('vetting_wallets')
        .select('*')
        .order('created_at', { ascending: false });

      if (vettingWalletsError) throw vettingWalletsError;

      // Fetch user details for each vetting wallet
      const vettingWalletsWithUserDetails = await Promise.all(
        (vettingWalletsData || []).map(async (wallet) => {
          const { data: userData, error: userError } = await supabase
            .from('User Dps')
            .select('Username, "piture link"')
            .eq('email', wallet.user_id)
            .single();
          
          return {
            ...wallet,
            user_details: userError ? null : userData
          };
        })
      );

      setCoins(coinsData || []);
      setSupplies(suppliesData || []);
      setWallets(walletsData || []);
      setVettingWallets(vettingWalletsWithUserDetails);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generatePublicLink = (coin: Coin): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/collection/${coin.Username}/coin/${coin.id}`;
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleMintNFT = async () => {
    if (!selectedCoin || !selectedSupply || !selectedWallet) {
      toast.error('Please select a coin, supply, and wallet');
      return;
    }

    setSubmitting(true);
    setResponse(null);
    setError(null);

    try {
      const payload = {
        supply: selectedSupply,
        coin: selectedCoin,
        wallet: selectedWallet
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/uj9756uytn1f08zrchu4cp7th7eaj0uu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(errorText || 'Failed to mint NFT');
      }

      const mintResponse: MintResponse = await webhookResponse.json();
      setResponse(mintResponse);
      
      if (mintResponse.success) {
        toast.success('NFT minted successfully!');
      } else {
        throw new Error(mintResponse.message || 'Failed to mint NFT');
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMintRestrictedNFT = async () => {
    if (!restrictedSelectedCoin || !restrictedSelectedSupply || !restrictedSelectedWallet) {
      toast.error('Please select a coin, supply, and wallet');
      return;
    }

    setRestrictedSubmitting(true);
    setRestrictedResponse(null);
    setRestrictedError(null);

    try {
      const payload = {
        supply: restrictedSelectedSupply,
        coin: restrictedSelectedCoin,
        wallet: restrictedSelectedWallet
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/g109j7zgohs97aihjqro1x272hdgmq7d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(errorText || 'Failed to mint restricted NFT');
      }

      const mintResponse: RestrictedMintResponse = await webhookResponse.json();
      setRestrictedResponse(mintResponse);
      
      if (mintResponse.success) {
        toast.success('Restricted NFT minted successfully!');
      } else {
        throw new Error(mintResponse.message || 'Failed to mint restricted NFT');
      }
    } catch (error) {
      console.error('Error minting restricted NFT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint restricted NFT';
      setRestrictedError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setRestrictedSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedCoin(null);
    setSelectedSupply(null);
    setSelectedWallet(null);
    setResponse(null);
    setError(null);
  };

  const resetRestrictedForm = () => {
    setRestrictedSelectedCoin(null);
    setRestrictedSelectedSupply(null);
    setRestrictedSelectedWallet(null);
    setRestrictedResponse(null);
    setRestrictedError(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d182a] flex items-center justify-center">
        <div className="text-white">Please log in to access this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d182a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4 mx-auto" />
          <p className="text-white text-lg">Loading your coins, supplies, and wallets...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#0d182a] bg-opacity-95 py-8"
      style={{
        backgroundImage: `url('${getBackgroundImage(theme)}')`,
        backgroundBlendMode: 'overlay',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="space-y-8">
          {/* Regular NFT Minting Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Coins className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Mint NFT</h1>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Select one of your coins, a supply, and a wallet to mint it as an NFT on the blockchain. Your coin will be permanently recorded with all its details.
              </p>
            </div>

            {!response ? (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Supply Selection */}
                  <div className="bg-white/5 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">Select Supply</h3>
                    </div>
                    
                    <select
                      value={selectedSupply?.id || ''}
                      onChange={(e) => {
                        const supply = supplies.find(s => s.id === parseInt(e.target.value));
                        setSelectedSupply(supply || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a supply...</option>
                      {supplies.map((supply) => (
                        <option key={supply.id} value={supply.id}>
                          {supply.Contract_Name}
                        </option>
                      ))}
                    </select>

                    {selectedSupply && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Supply Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Contract: </span>
                            <span className="text-white font-mono">{selectedSupply.Contract_Name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Package ID: </span>
                            <div className="bg-gray-800/50 rounded-md p-2 mt-1">
                              <span className="text-white font-mono text-xs break-all">
                                {selectedSupply.PACKAGE_ID}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {supplies.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No supplies available</p>
                        <p className="text-xs mt-1">Create a supply first</p>
                      </div>
                    )}
                  </div>

                  {/* Coin Selection */}
                  <div className="bg-white/5 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Select Your Coin</h3>
                    </div>
                    
                    <select
                      value={selectedCoin?.id || ''}
                      onChange={(e) => {
                        const coin = coins.find(c => c.id === parseInt(e.target.value));
                        setSelectedCoin(coin || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a coin...</option>
                      {coins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                          {coin['Coin Name']}
                        </option>
                      ))}
                    </select>

                    {selectedCoin && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-3">Coin Preview</h4>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                          <img
                            src={selectedCoin['Coin Image']}
                            alt={selectedCoin['Coin Name']}
                            className="w-16 h-16 object-contain rounded bg-white/10 p-2 flex-shrink-0"
                          />
                          <div className="text-center sm:text-left">
                            <p className="text-white font-medium">{selectedCoin['Coin Name']}</p>
                            <p className="text-sm text-gray-400">
                              {selectedCoin['Number Of Coins']} coins owned
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Date Issued: </span>
                            <span className="text-white">
                              {new Date(selectedCoin['Date Issued']).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Mode: </span>
                            <span className="text-white">{selectedCoin['Mode Of Acquiring']}</span>
                          </div>
                          {selectedCoin['Notes'] && (
                            <div>
                              <span className="text-gray-400">Description: </span>
                              <span className="text-white break-words">{selectedCoin['Notes']}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-400">Public Link: </span>
                            <a
                              href={generatePublicLink(selectedCoin)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 break-all"
                            >
                              View Public Page
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {coins.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No coins available</p>
                        <p className="text-xs mt-1">Add some coins to your collection first</p>
                      </div>
                    )}
                  </div>

                  {/* Wallet Selection */}
                  <div className="bg-white/5 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-white">Select Wallet</h3>
                    </div>
                    
                    <select
                      value={selectedWallet?.id || ''}
                      onChange={(e) => {
                        const wallet = wallets.find(w => w.id === e.target.value);
                        setSelectedWallet(wallet || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select a wallet...</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>

                    {selectedWallet && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Wallet Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Name: </span>
                            <span className="text-white">{selectedWallet.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Address: </span>
                            <div className="bg-gray-800/50 rounded-md p-2 mt-1">
                              <span className="text-white font-mono text-xs break-all">
                                {selectedWallet.wallet_address}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400">Created: </span>
                            <span className="text-white">
                              {new Date(restrictedSelectedWallet.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {vettingWallets.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No vetting wallets available</p>
                        <p className="text-xs mt-1">Create a vetting wallet first</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="text-center px-4">
                  <button
                    onClick={handleMintNFT}
                    disabled={submitting || !selectedCoin || !selectedSupply || !selectedWallet}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                      <Send className="h-6 w-6" />
                    )}
                    {submitting ? 'Minting NFT...' : 'Mint NFT'}
                  </button>

                  {(!selectedCoin || !selectedSupply || !selectedWallet) && (
                    <p className="text-sm text-gray-400 mt-4">
                      Please select a coin, supply, and wallet to proceed
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-4">
                {error ? (
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">❌ Minting Failed</h2>
                    <p className="text-lg text-red-400">{error}</p>
                  </div>
                ) : (
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">🎉 NFT Minted Successfully!</h2>
                    <p className="text-lg text-green-400 mb-6">
                      Your NFT has been created and is now available on the blockchain.
                    </p>
                    
                    {/* NFT Details */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4">NFT Details</h3>
                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={selectedCoin!['Coin Image']}
                            alt={selectedCoin!['Coin Name']}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg bg-white/10 p-2 flex-shrink-0"
                          />
                          <div className="text-center">
                            <h4 className="text-white font-semibold">{response.data.nftName}</h4>
                            <p className="text-gray-400 text-sm">Challenge Coin NFT</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <span className="text-gray-400">Coin ID: </span>
                            <span className="text-white font-mono">{response.data.coinId}</span>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <span className="text-gray-400">Braav Version: </span>
                            <span className="text-white font-mono">{response.data.braavVersion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ExternalLink className="h-6 w-6 text-purple-400" />
                        Transaction Details
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Transaction Digest:</span>
                            <button
                              onClick={() => copyToClipboard(response.data.transactionDigest, 'Transaction Digest')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-green-400 font-mono text-xs sm:text-sm break-all">
                              {response.data.transactionDigest}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">NFT Object ID:</span>
                            <button
                              onClick={() => copyToClipboard(response.data.nftObjectId, 'NFT Object ID')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-blue-400 font-mono text-xs sm:text-sm break-all">
                              {response.data.nftObjectId}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Recipient Address:</span>
                            <button
                              onClick={() => copyToClipboard(response.data.recipientAddress, 'Recipient Address')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-yellow-400 font-mono text-xs sm:text-sm break-all">
                              {response.data.recipientAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Gas Usage */}
                    <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Gas Usage</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Computation: </span>
                          <span className="text-white font-mono">{response.data.gasUsed.computationCost}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Storage: </span>
                          <span className="text-white font-mono">{response.data.gasUsed.storageCost}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Rebate: </span>
                          <span className="text-white font-mono">{response.data.gasUsed.storageRebate}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Fee: </span>
                          <span className="text-white font-mono">{response.data.gasUsed.nonRefundableStorageFee}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="bg-white/5 rounded-lg p-4 mb-6">
                      <div className="text-center">
                        <span className="text-gray-400">Minted on: </span>
                        <span className="text-white">
                          {new Date(response.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <button
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Mint Another NFT
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Restricted NFT Minting Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl border-2 border-red-500/20">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Mint Restricted NFTs</h1>
              <p className="text-gray-300 max-w-2xl mx-auto">
                Create restricted access NFTs with enhanced security features. These NFTs have special permissions and access controls.
              </p>
            </div>

            {!restrictedResponse ? (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Supply Selection */}
                  <div className="bg-red-500/5 rounded-lg p-4 sm:p-6 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-red-400" />
                      <h3 className="text-lg font-semibold text-white">Select Supply</h3>
                    </div>
                    
                    <select
                      value={restrictedSelectedSupply?.id || ''}
                      onChange={(e) => {
                        const supply = supplies.find(s => s.id === parseInt(e.target.value));
                        setRestrictedSelectedSupply(supply || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-red-500/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a supply...</option>
                      {supplies.map((supply) => (
                        <option key={supply.id} value={supply.id}>
                          {supply.Contract_Name}
                        </option>
                      ))}
                    </select>

                    {restrictedSelectedSupply && (
                      <div className="mt-4 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                        <h4 className="text-white font-medium mb-2">Supply Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Contract: </span>
                            <span className="text-white font-mono">{restrictedSelectedSupply.Contract_Name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Package ID: </span>
                            <div className="bg-gray-800/50 rounded-md p-2 mt-1">
                              <span className="text-white font-mono text-xs break-all">
                                {restrictedSelectedSupply.PACKAGE_ID}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Coin Selection */}
                  <div className="bg-red-500/5 rounded-lg p-4 sm:p-6 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-5 w-5 text-red-400" />
                      <h3 className="text-lg font-semibold text-white">Select Your Coin</h3>
                    </div>
                    
                    <select
                      value={restrictedSelectedCoin?.id || ''}
                      onChange={(e) => {
                        const coin = coins.find(c => c.id === parseInt(e.target.value));
                        setRestrictedSelectedCoin(coin || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-red-500/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a coin...</option>
                      {coins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                          {coin['Coin Name']}
                        </option>
                      ))}
                    </select>

                    {restrictedSelectedCoin && (
                      <div className="mt-4 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                        <h4 className="text-white font-medium mb-3">Coin Preview</h4>
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                          <img
                            src={restrictedSelectedCoin['Coin Image']}
                            alt={restrictedSelectedCoin['Coin Name']}
                            className="w-16 h-16 object-contain rounded bg-white/10 p-2 flex-shrink-0"
                          />
                          <div className="text-center sm:text-left">
                            <p className="text-white font-medium">{restrictedSelectedCoin['Coin Name']}</p>
                            <p className="text-sm text-gray-400">
                              {restrictedSelectedCoin['Number Of Coins']} coins owned
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Wallet Selection */}
                  <div className="bg-red-500/5 rounded-lg p-4 sm:p-6 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-red-400" />
                      <h3 className="text-lg font-semibold text-white">Select Vetting Wallet</h3>
                    </div>
                    
                    <select
                      value={restrictedSelectedWallet?.id.toString() || ''}
                      onChange={(e) => {
                        const wallet = vettingWallets.find(w => w.id === parseInt(e.target.value));
                        setRestrictedSelectedWallet(wallet || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-red-500/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Select a vetting wallet...</option>
                      {vettingWallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.user_details?.Username || 'Unknown User'} - {wallet.wallet_address.slice(0, 8)}...{wallet.wallet_address.slice(-6)}
                        </option>
                      ))}
                    </select>

                    {restrictedSelectedWallet && (
                      <div className="mt-4 p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                        <h4 className="text-white font-medium mb-3">Selected Vetting Wallet</h4>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={
                                restrictedSelectedWallet.user_details?.['piture link'] ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${restrictedSelectedWallet.user_details?.Username || 'User'}`
                              }
                              alt={restrictedSelectedWallet.user_details?.Username || 'User'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {restrictedSelectedWallet.user_details?.Username || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-400">Vetting Wallet</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">User Email: </span>
                            <span className="text-white">{restrictedSelectedWallet.user_id}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Address: </span>
                            <div className="bg-gray-800/50 rounded-md p-2 mt-1">
                              <span className="text-white font-mono text-xs break-all">
                                {restrictedSelectedWallet.wallet_address}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="text-center px-4">
                  <button
                    onClick={handleMintRestrictedNFT}
                    disabled={restrictedSubmitting || !restrictedSelectedCoin || !restrictedSelectedSupply || !restrictedSelectedWallet}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                  >
                    {restrictedSubmitting ? (
                      <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                      <Shield className="h-6 w-6" />
                    )}
                    {restrictedSubmitting ? 'Minting Restricted NFT...' : 'Mint Restricted NFT'}
                  </button>

                  {(!restrictedSelectedCoin || !restrictedSelectedSupply || !restrictedSelectedWallet) && (
                    <p className="text-sm text-gray-400 mt-4">
                      Please select a coin, supply, and wallet to proceed
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-4">
                {restrictedError ? (
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">❌ Restricted Minting Failed</h2>
                    <p className="text-lg text-red-400">{restrictedError}</p>
                  </div>
                ) : (
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">🔒 Restricted NFT Minted Successfully!</h2>
                    <p className="text-lg text-red-400 mb-6">
                      Your restricted NFT has been created with enhanced security features.
                    </p>
                    
                    {/* Restricted NFT Details */}
                    <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-red-400" />
                        Restricted NFT Details
                      </h3>
                      <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={restrictedSelectedCoin!['Coin Image']}
                            alt={restrictedSelectedCoin!['Coin Name']}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg bg-white/10 p-2 flex-shrink-0"
                          />
                          <div className="text-center">
                            <h4 className="text-white font-semibold">{restrictedResponse.data.nftName}</h4>
                            <p className="text-red-400 text-sm">Restricted Access NFT</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="bg-white/5 rounded-lg p-3">
                            <span className="text-gray-400">Coin ID: </span>
                            <span className="text-white font-mono">{restrictedResponse.data.coinId}</span>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <span className="text-gray-400">Braav Version: </span>
                            <span className="text-white font-mono">{restrictedResponse.data.braavVersion}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Transaction Details */}
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <ExternalLink className="h-6 w-6 text-orange-400" />
                        Transaction Details
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Transaction Digest:</span>
                            <button
                              onClick={() => copyToClipboard(restrictedResponse.data.transactionDigest, 'Transaction Digest')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-green-400 font-mono text-xs sm:text-sm break-all">
                              {restrictedResponse.data.transactionDigest}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Restricted NFT Object ID:</span>
                            <button
                              onClick={() => copyToClipboard(restrictedResponse.data.restrictedNftObjectId, 'Restricted NFT Object ID')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-red-400 font-mono text-xs sm:text-sm break-all">
                              {restrictedResponse.data.restrictedNftObjectId}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400">Recipient Address:</span>
                            <button
                              onClick={() => copyToClipboard(restrictedResponse.data.recipientAddress, 'Recipient Address')}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-md p-3">
                            <span className="text-yellow-400 font-mono text-xs sm:text-sm break-all">
                              {restrictedResponse.data.recipientAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Gas Usage */}
                    <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-semibold text-white mb-4">Gas Usage</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Computation: </span>
                          <span className="text-white font-mono">{restrictedResponse.data.gasUsed.computationCost}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Storage: </span>
                          <span className="text-white font-mono">{restrictedResponse.data.gasUsed.storageCost}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Rebate: </span>
                          <span className="text-white font-mono">{restrictedResponse.data.gasUsed.storageRebate}</span>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <span className="text-gray-400">Fee: </span>
                          <span className="text-white font-mono">{restrictedResponse.data.gasUsed.nonRefundableStorageFee}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="bg-white/5 rounded-lg p-4 mb-6">
                      <div className="text-center">
                        <span className="text-gray-400">Minted on: </span>
                        <span className="text-white">
                          {new Date(restrictedResponse.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <button
                    onClick={resetRestrictedForm}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Mint Another Restricted NFT
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};