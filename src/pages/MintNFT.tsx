import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Wallet, Package, ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, Hash, Zap, User, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getBackgroundImage } from '../utils/theme';
import toast from 'react-hot-toast';

interface Supply {
  id: number;
  SUPPLY_CAP_ID: string;
  LINEAGE_ID: string;
  COUNTER_ID: string;
  PACKAGE_ID: string;
  Contract_Name: string;
  RECIPIENT_ADDRESS: string;
  created_at: string;
}

interface Coin {
  id: number;
  'Coin Name': string;
  'Coin Image': string;
  'BacksideUrl': string | null;
  'Date Issued': string;
  'Number Of Coins': number;
  'Mode Of Acquiring': string;
  'Notes': string;
  'Awarded By': string | null;
  'Issuer Name': string | null;
  'Featured': boolean;
  'Public Display': boolean;
  'Username': string;
  'UserId': string;
  'Priority': number;
  'available_quantity': number;
  'created_at': string;
  'Has Copyright': boolean;
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
    badgeCoinId: string;
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
  
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [wallets, setWallets] = useState<VettingWallet[]>([]);
  
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<VettingWallet | null>(null);
  
  // Restricted NFT states
  const [selectedRestrictedSupply, setSelectedRestrictedSupply] = useState<Supply | null>(null);
  const [selectedRestrictedCoin, setSelectedRestrictedCoin] = useState<Coin | null>(null);
  const [selectedRestrictedWallet, setSelectedRestrictedWallet] = useState<VettingWallet | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintingRestricted, setMintingRestricted] = useState(false);
  const [response, setResponse] = useState<MintResponse | null>(null);
  const [restrictedResponse, setRestrictedResponse] = useState<RestrictedMintResponse | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Fetch supplies
      const { data: suppliesData, error: suppliesError } = await supabase
        .from('Supplies')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliesError) throw suppliesError;

      // Fetch user's coins
      const { data: coinsData, error: coinsError } = await supabase
        .from('Challenge Coin Table')
        .select('*')
        .eq('UserId', user.email)
        .order('created_at', { ascending: false });

      if (coinsError) throw coinsError;

      // Fetch user's vetting wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('vetting_wallets')
        .select(`
          *,
          user_details:user_id (
            Username,
            "piture link"
          )
        `)
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      setSupplies(suppliesData || []);
      setCoins(coinsData || []);
      setWallets(walletsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleMintAndTransfer = async () => {
    if (!selectedSupply || !selectedCoin || !selectedWallet) {
      toast.error('Please select a supply, coin, and wallet');
      return;
    }

    setMinting(true);
    setResponse(null);

    try {
      const payload = {
        supply: selectedSupply,
        coin: selectedCoin,
        wallet: selectedWallet
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/g0ut9skfpdyw15tc8junlrf7ry7hd1no', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        throw new Error('Failed to mint and transfer NFT');
      }

      const result: MintResponse = await webhookResponse.json();
      setResponse(result);

      if (result.success) {
        toast.success('NFT minted and transferred successfully!');
      } else {
        toast.error(result.message || 'Failed to mint and transfer NFT');
      }
    } catch (error) {
      console.error('Error minting NFT:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mint and transfer NFT');
    } finally {
      setMinting(false);
    }
  };

  const handleMintRestrictedNFT = async () => {
    if (!selectedRestrictedSupply || !selectedRestrictedCoin || !selectedRestrictedWallet) {
      toast.error('Please select a supply, coin, and wallet for restricted NFT');
      return;
    }

    setMintingRestricted(true);
    setRestrictedResponse(null);

    try {
      const payload = {
        supply: selectedRestrictedSupply,
        coin: selectedRestrictedCoin,
        wallet: selectedRestrictedWallet
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/g109j7zgohs97aihjqro1x272hdgmq7d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        throw new Error('Failed to mint restricted NFT');
      }

      const result: RestrictedMintResponse = await webhookResponse.json();
      setRestrictedResponse(result);

      if (result.success) {
        toast.success('Restricted NFT minted successfully!');
      } else {
        toast.error(result.message || 'Failed to mint restricted NFT');
      }
    } catch (error) {
      console.error('Error minting restricted NFT:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mint restricted NFT');
    } finally {
      setMintingRestricted(false);
    }
  };

  const resetForm = () => {
    setSelectedSupply(null);
    setSelectedCoin(null);
    setSelectedWallet(null);
    setResponse(null);
  };

  const resetRestrictedForm = () => {
    setSelectedRestrictedSupply(null);
    setSelectedRestrictedCoin(null);
    setSelectedRestrictedWallet(null);
    setRestrictedResponse(null);
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
          <p className="text-white text-lg">Loading data...</p>
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

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Coins className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Mint And Transfer NFTs</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Create NFTs from your challenge coins using your token supplies and transfer them to your wallets.
            </p>
          </div>

          {!response && !restrictedResponse ? (
            <div className="space-y-12 max-w-6xl mx-auto">
              {/* Regular NFT Minting Section */}
              <div className="bg-white/5 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Coins className="h-6 w-6 text-purple-400" />
                  Mint Regular NFTs
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Supply Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
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
                            <span className="text-white font-mono text-xs break-all">
                              {selectedSupply.PACKAGE_ID}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created: </span>
                            <span className="text-white">
                              {new Date(selectedSupply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {supplies.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No supplies available</p>
                      </div>
                    )}
                  </div>

                  {/* Coin Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-white">Select Coin</h3>
                    </div>
                    
                    <select
                      value={selectedCoin?.id || ''}
                      onChange={(e) => {
                        const coin = coins.find(c => c.id === parseInt(e.target.value));
                        setSelectedCoin(coin || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Select a coin...</option>
                      {coins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                          {coin['Coin Name']} ({coin['Number Of Coins']} available)
                        </option>
                      ))}
                    </select>

                    {selectedCoin && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Coin Details</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={selectedCoin['Coin Image']}
                            alt={selectedCoin['Coin Name']}
                            className="w-12 h-12 object-contain rounded bg-white/10 p-1"
                          />
                          <div>
                            <p className="text-white font-medium">{selectedCoin['Coin Name']}</p>
                            <p className="text-sm text-gray-400">
                              {selectedCoin['Number Of Coins']} coins available
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
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
                        </div>
                      </div>
                    )}

                    {coins.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No coins available</p>
                      </div>
                    )}
                  </div>

                  {/* Wallet Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Select Wallet</h3>
                    </div>
                    
                    <select
                      value={selectedWallet?.id || ''}
                      onChange={(e) => {
                        const wallet = wallets.find(w => w.id === parseInt(e.target.value));
                        setSelectedWallet(wallet || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a wallet...</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.user_details?.Username || 'Unknown User'}
                        </option>
                      ))}
                    </select>

                    {selectedWallet && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Wallet Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Owner: </span>
                            <span className="text-white font-medium">
                              {selectedWallet.user_details?.Username || 'Unknown User'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Address: </span>
                            <span className="text-white font-mono text-xs break-all">
                              {selectedWallet.wallet_address}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created: </span>
                            <span className="text-white">
                              {new Date(selectedWallet.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {wallets.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No wallets available</p>
                        <p className="text-xs mt-1">Create a wallet first</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Regular NFT Action Button */}
                <div className="text-center">
                  <button
                    onClick={handleMintAndTransfer}
                    disabled={minting || !selectedSupply || !selectedCoin || !selectedWallet}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                  >
                    {minting ? (
                      <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                      <Send className="h-6 w-6" />
                    )}
                    {minting ? 'Minting NFT...' : 'Mint and Transfer NFT'}
                  </button>

                  {(!selectedSupply || !selectedCoin || !selectedWallet) && (
                    <p className="text-sm text-gray-400 mt-4">
                      Please select all required items to proceed
                    </p>
                  )}
                </div>
              </div>

              {/* Restricted NFT Minting Section */}
              <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-red-400" />
                  Mint Restricted NFTs
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  {/* Restricted Supply Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-semibold text-white">Select Supply</h3>
                    </div>
                    
                    <select
                      value={selectedRestrictedSupply?.id || ''}
                      onChange={(e) => {
                        const supply = supplies.find(s => s.id === parseInt(e.target.value));
                        setSelectedRestrictedSupply(supply || null);
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

                    {selectedRestrictedSupply && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Supply Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Contract: </span>
                            <span className="text-white font-mono">{selectedRestrictedSupply.Contract_Name}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Package ID: </span>
                            <span className="text-white font-mono text-xs break-all">
                              {selectedRestrictedSupply.PACKAGE_ID}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created: </span>
                            <span className="text-white">
                              {new Date(selectedRestrictedSupply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {supplies.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No supplies available</p>
                      </div>
                    )}
                  </div>

                  {/* Restricted Coin Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-white">Select Coin</h3>
                    </div>
                    
                    <select
                      value={selectedRestrictedCoin?.id || ''}
                      onChange={(e) => {
                        const coin = coins.find(c => c.id === parseInt(e.target.value));
                        setSelectedRestrictedCoin(coin || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Select a coin...</option>
                      {coins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                          {coin['Coin Name']} ({coin['Number Of Coins']} available)
                        </option>
                      ))}
                    </select>

                    {selectedRestrictedCoin && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Coin Details</h4>
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={selectedRestrictedCoin['Coin Image']}
                            alt={selectedRestrictedCoin['Coin Name']}
                            className="w-12 h-12 object-contain rounded bg-white/10 p-1"
                          />
                          <div>
                            <p className="text-white font-medium">{selectedRestrictedCoin['Coin Name']}</p>
                            <p className="text-sm text-gray-400">
                              {selectedRestrictedCoin['Number Of Coins']} coins available
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div>
                            <span className="text-gray-400">Date Issued: </span>
                            <span className="text-white">
                              {new Date(selectedRestrictedCoin['Date Issued']).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Mode: </span>
                            <span className="text-white">{selectedRestrictedCoin['Mode Of Acquiring']}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {coins.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No coins available</p>
                      </div>
                    )}
                  </div>

                  {/* Restricted Wallet Selection */}
                  <div className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Select Wallet</h3>
                    </div>
                    
                    <select
                      value={selectedRestrictedWallet?.id || ''}
                      onChange={(e) => {
                        const wallet = wallets.find(w => w.id === parseInt(e.target.value));
                        setSelectedRestrictedWallet(wallet || null);
                      }}
                      className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a wallet...</option>
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.user_details?.Username || 'Unknown User'}
                        </option>
                      ))}
                    </select>

                    {selectedRestrictedWallet && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-white font-medium mb-2">Wallet Details</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Owner: </span>
                            <span className="text-white font-medium">
                              {selectedRestrictedWallet.user_details?.Username || 'Unknown User'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Address: </span>
                            <span className="text-white font-mono text-xs break-all">
                              {selectedRestrictedWallet.wallet_address}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Created: </span>
                            <span className="text-white">
                              {new Date(selectedRestrictedWallet.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {wallets.length === 0 && (
                      <div className="mt-4 text-center text-gray-400">
                        <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No wallets available</p>
                        <p className="text-xs mt-1">Create a wallet first</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Restricted NFT Action Button */}
                <div className="text-center">
                  <button
                    onClick={handleMintRestrictedNFT}
                    disabled={mintingRestricted || !selectedRestrictedSupply || !selectedRestrictedCoin || !selectedRestrictedWallet}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                  >
                    {mintingRestricted ? (
                      <Loader2 className="animate-spin h-6 w-6" />
                    ) : (
                      <Shield className="h-6 w-6" />
                    )}
                    {mintingRestricted ? 'Minting Restricted NFT...' : 'Mint Restricted NFT'}
                  </button>

                  {(!selectedRestrictedSupply || !selectedRestrictedCoin || !selectedRestrictedWallet) && (
                    <p className="text-sm text-gray-400 mt-4">
                      Please select all required items to proceed with restricted minting
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : response ? (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supply Selection */}
                <div className="bg-white/5 rounded-lg p-6">
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
                          <span className="text-white font-mono text-xs break-all">
                            {selectedSupply.PACKAGE_ID}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Created: </span>
                          <span className="text-white">
                            {new Date(selectedSupply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {supplies.length === 0 && (
                    <div className="mt-4 text-center text-gray-400">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No supplies available</p>
                    </div>
                  )}
                </div>

                {/* Coin Selection */}
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Select Coin</h3>
                  </div>
                  
                  <select
                    value={selectedCoin?.id || ''}
                    onChange={(e) => {
                      const coin = coins.find(c => c.id === parseInt(e.target.value));
                      setSelectedCoin(coin || null);
                    }}
                    className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select a coin...</option>
                    {coins.map((coin) => (
                      <option key={coin.id} value={coin.id}>
                        {coin['Coin Name']} ({coin['Number Of Coins']} available)
                      </option>
                    ))}
                  </select>

                  {selectedCoin && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Coin Details</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={selectedCoin['Coin Image']}
                          alt={selectedCoin['Coin Name']}
                          className="w-12 h-12 object-contain rounded bg-white/10 p-1"
                        />
                        <div>
                          <p className="text-white font-medium">{selectedCoin['Coin Name']}</p>
                          <p className="text-sm text-gray-400">
                            {selectedCoin['Number Of Coins']} coins available
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
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
                      </div>
                    </div>
                  )}

                  {coins.length === 0 && (
                    <div className="mt-4 text-center text-gray-400">
                      <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No coins available</p>
                    </div>
                  )}
                </div>

                {/* Wallet Selection */}
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Select Wallet</h3>
                  </div>
                  
                  <select
                    value={selectedWallet?.id || ''}
                    onChange={(e) => {
                      const wallet = wallets.find(w => w.id === parseInt(e.target.value));
                      setSelectedWallet(wallet || null);
                    }}
                    className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a wallet...</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.user_details?.Username || 'Unknown User'}
                      </option>
                    ))}
                  </select>

                  {selectedWallet && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Wallet Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">Owner: </span>
                          <span className="text-white font-medium">
                            {selectedWallet.user_details?.Username || 'Unknown User'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Address: </span>
                          <span className="text-white font-mono text-xs break-all">
                            {selectedWallet.wallet_address}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Created: </span>
                          <span className="text-white">
                            {new Date(selectedWallet.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {wallets.length === 0 && (
                    <div className="mt-4 text-center text-gray-400">
                      <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No wallets available</p>
                      <p className="text-xs mt-1">Create a wallet first</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center">
                <button
                  onClick={handleMintAndTransfer}
                  disabled={minting || !selectedSupply || !selectedCoin || !selectedWallet}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                >
                  {minting ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                  {minting ? 'Minting NFT...' : 'Mint and Transfer NFT'}
                </button>

                {(!selectedSupply || !selectedCoin || !selectedWallet) && (
                  <p className="text-sm text-gray-400 mt-4">
                    Please select all required items to proceed
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  response.success 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-br from-red-500 to-pink-600'
                }`}>
                  {response.success ? (
                    <CheckCircle className="h-10 w-10 text-white" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-white" />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {response.success ? '🎉 NFT Minted Successfully!' : '❌ Minting Failed'}
                </h2>
                <p className={`text-lg ${
                  response.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {response.message}
                </p>
              </div>

              {response.success && response.data && (
                <div className="space-y-6">
                  {/* NFT Details */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Coins className="h-6 w-6 text-purple-400" />
                      NFT Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-400 text-sm">NFT Name</span>
                        </div>
                        <p className="text-white font-medium">{response.data.nftName}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-gray-400 text-sm">Badge Coin ID</span>
                        </div>
                        <p className="text-white font-medium">{response.data.badgeCoinId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Hash className="h-6 w-6 text-blue-400" />
                      Transaction Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Transaction Digest</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(response.data.transactionDigest)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-green-400 font-mono text-sm break-all">
                            {response.data.transactionDigest}
                          </code>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">NFT Object ID</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(response.data.nftObjectId)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-blue-400 font-mono text-sm break-all">
                            {response.data.nftObjectId}
                          </code>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Recipient Address</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(response.data.recipientAddress)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-purple-400 font-mono text-sm break-all">
                            {response.data.recipientAddress}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gas Usage */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="h-6 w-6 text-orange-400" />
                      Gas Usage
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Computation</p>
                        <p className="text-white font-mono text-sm">
                          {parseInt(response.data.gasUsed.computationCost).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Storage</p>
                        <p className="text-white font-mono text-sm">
                          {parseInt(response.data.gasUsed.storageCost).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Rebate</p>
                        <p className="text-green-400 font-mono text-sm">
                          {parseInt(response.data.gasUsed.storageRebate).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Fee</p>
                        <p className="text-red-400 font-mono text-sm">
                          {parseInt(response.data.gasUsed.nonRefundableStorageFee).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Transaction Timestamp</span>
                    </div>
                    <p className="text-white font-mono">
                      {new Date(response.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  onClick={resetForm}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mint Another NFT
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : restrictedResponse ? (
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  restrictedResponse.success 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-br from-red-500 to-pink-600'
                }`}>
                  {restrictedResponse.success ? (
                    <CheckCircle className="h-10 w-10 text-white" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-white" />
                  )}
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  {restrictedResponse.success ? '🎉 Restricted NFT Minted Successfully!' : '❌ Restricted Minting Failed'}
                </h2>
                <p className={`text-lg ${
                  restrictedResponse.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {restrictedResponse.message}
                </p>
              </div>

              {restrictedResponse.success && restrictedResponse.data && (
                <div className="space-y-6">
                  {/* Restricted NFT Details */}
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Shield className="h-6 w-6 text-red-400" />
                      Restricted NFT Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="h-4 w-4 text-blue-400" />
                          <span className="text-gray-400 text-sm">NFT Name</span>
                        </div>
                        <p className="text-white font-medium">{restrictedResponse.data.nftName}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-gray-400 text-sm">Coin ID</span>
                        </div>
                        <p className="text-white font-medium">{restrictedResponse.data.coinId}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-purple-400" />
                          <span className="text-gray-400 text-sm">Braav Version</span>
                        </div>
                        <p className="text-white font-medium">{restrictedResponse.data.braavVersion}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-red-400" />
                          <span className="text-gray-400 text-sm">Type</span>
                        </div>
                        <p className="text-red-400 font-medium">Restricted Access</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Hash className="h-6 w-6 text-blue-400" />
                      Transaction Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Transaction Digest</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(restrictedResponse.data.transactionDigest)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-green-400 font-mono text-sm break-all">
                            {restrictedResponse.data.transactionDigest}
                          </code>
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Restricted NFT Object ID</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(restrictedResponse.data.restrictedNftObjectId)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-red-400 font-mono text-sm break-all">
                            {restrictedResponse.data.restrictedNftObjectId}
                          </code>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Recipient Address</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(restrictedResponse.data.recipientAddress)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="bg-gray-900/50 rounded-md p-3">
                          <code className="text-purple-400 font-mono text-sm break-all">
                            {restrictedResponse.data.recipientAddress}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gas Usage */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="h-6 w-6 text-orange-400" />
                      Gas Usage
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Computation</p>
                        <p className="text-white font-mono text-sm">
                          {parseInt(restrictedResponse.data.gasUsed.computationCost).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Storage</p>
                        <p className="text-white font-mono text-sm">
                          {parseInt(restrictedResponse.data.gasUsed.storageCost).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Rebate</p>
                        <p className="text-green-400 font-mono text-sm">
                          {parseInt(restrictedResponse.data.gasUsed.storageRebate).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <p className="text-gray-400 text-xs mb-1">Fee</p>
                        <p className="text-red-400 font-mono text-sm">
                          {parseInt(restrictedResponse.data.gasUsed.nonRefundableStorageFee).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="bg-white/5 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Transaction Timestamp</span>
                    </div>
                    <p className="text-white font-mono">
                      {new Date(restrictedResponse.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  onClick={resetRestrictedForm}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Mint Another Restricted NFT
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};