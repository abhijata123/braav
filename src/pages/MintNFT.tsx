import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Package, ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, ExternalLink, Image, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getBackgroundImage } from '../utils/theme';
import toast from 'react-hot-toast';

interface TokenTemplate {
  id: string;
  name: string;
  image: string | null;
  token_template_id: string;
  token_type_id: string;
  created_by: string;
  created_at: string;
  contract: string | null;
  fungible: boolean;
}

interface UserWallet {
  id: string;
  wallet_address: string;
  name: string;
  created_at: string;
  wallet_id: string | null;
}

export const MintNFT: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  
  const [tokenTemplates, setTokenTemplates] = useState<TokenTemplate[]>([]);
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<TokenTemplate | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Fetch user's token templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('token_templates')
        .select('*')
        .eq('created_by', user.email)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch user's wallets
      const { data: walletsData, error: walletsError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.email)
        .order('created_at', { ascending: false });

      if (walletsError) throw walletsError;

      setTokenTemplates(templatesData || []);
      setUserWallets(walletsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleMintNFT = async () => {
    if (!selectedTemplate || !selectedWallet) {
      toast.error('Please select both a token template and a wallet');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    setResponse(null);

    try {
      const payload = {
        tokenTemplate: {
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          image: selectedTemplate.image,
          tokenTemplateId: selectedTemplate.token_template_id,
          tokenTypeId: selectedTemplate.token_type_id,
          createdBy: selectedTemplate.created_by,
          contract: selectedTemplate.contract,
          fungible: selectedTemplate.fungible
        },
        wallet: {
          id: selectedWallet.id,
          address: selectedWallet.wallet_address,
          name: selectedWallet.name,
          walletId: selectedWallet.wallet_id
        },
        quantity: quantity,
        userEmail: user?.email
      };

      const webhookResponse = await fetch('https://hook.us2.make.com/your-mint-webhook-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        throw new Error(errorText || 'Failed to mint NFT');
      }

      const result = await webhookResponse.json();
      setResponse(result);

      toast.success('NFT minting request sent successfully!');
    } catch (error) {
      console.error('Error minting NFT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mint NFT';
      setResponse({ error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setSelectedWallet(null);
    setQuantity(1);
    setResponse(null);
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
          <p className="text-white text-lg">Loading your templates and wallets...</p>
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
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Coins className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Mint NFTs</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Select a token template and wallet to mint your NFTs. Choose the quantity you want to mint.
            </p>
          </div>

          {!response ? (
            <div className="space-y-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Token Template Selection */}
                <div className="bg-white/5 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Image className="h-5 w-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Select Token Template</h3>
                  </div>
                  
                  <select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = tokenTemplates.find(t => t.id === e.target.value);
                      setSelectedTemplate(template || null);
                    }}
                    className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a template...</option>
                    {tokenTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>

                  {selectedTemplate && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white font-medium mb-3">Template Preview</h4>
                      <div className="flex flex-col items-center gap-4 mb-4">
                        {selectedTemplate.image && (
                          <img
                            src={selectedTemplate.image}
                            alt={selectedTemplate.name}
                            className="w-16 h-16 object-contain rounded bg-white/10 p-2"
                          />
                        )}
                        <div className="text-center">
                          <p className="text-white font-medium">{selectedTemplate.name}</p>
                          <p className="text-sm text-gray-400">
                            {selectedTemplate.fungible ? 'Fungible' : 'Non-Fungible'} Token
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">Template ID: </span>
                          <span className="text-white font-mono text-xs break-all">
                            {selectedTemplate.token_template_id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Type ID: </span>
                          <span className="text-white font-mono text-xs break-all">
                            {selectedTemplate.token_type_id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Created: </span>
                          <span className="text-white">
                            {new Date(selectedTemplate.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {tokenTemplates.length === 0 && (
                    <div className="mt-4 text-center text-gray-400">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No token templates available</p>
                      <p className="text-xs mt-1">Create a token template first</p>
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
                      const wallet = userWallets.find(w => w.id === e.target.value);
                      setSelectedWallet(wallet || null);
                    }}
                    className="w-full bg-gray-800 text-white border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a wallet...</option>
                    {userWallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {wallet.wallet_address?.slice(0, 6) || ''}...{wallet.wallet_address?.slice(-4) || ''}
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
                              {selectedWallet.wallet_address || 'No address available'}
                            </span>
                          </div>
                        </div>
                        {selectedWallet.wallet_id && (
                          <div>
                            <span className="text-gray-400">Wallet ID: </span>
                            <span className="text-white font-mono text-xs">
                              {selectedWallet.wallet_id}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Created: </span>
                          <span className="text-white">
                            {new Date(selectedWallet.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {userWallets.length === 0 && (
                    <div className="mt-4 text-center text-gray-400">
                      <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No wallets available</p>
                      <p className="text-xs mt-1">Create a wallet first</p>
                    </div>
                  )}
                </div>

                {/* Quantity Selection */}
                <div className="bg-white/5 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Mint Quantity</h3>
                  </div>
                  
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">
                      Number of NFTs to Mint
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter quantity"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Maximum 100 NFTs per transaction
                    </p>
                  </div>

                  {selectedTemplate && selectedWallet && (
                    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Mint Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">Template: </span>
                          <span className="text-white">{selectedTemplate.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Wallet: </span>
                          <span className="text-white">{selectedWallet.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Quantity: </span>
                          <span className="text-white font-bold">{quantity} NFT{quantity > 1 ? 's' : ''}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Type: </span>
                          <span className="text-white">
                            {selectedTemplate.fungible ? 'Fungible Token' : 'Non-Fungible Token'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center px-4">
                <button
                  onClick={handleMintNFT}
                  disabled={submitting || !selectedTemplate || !selectedWallet || quantity <= 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg mx-auto"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin h-6 w-6" />
                  ) : (
                    <Coins className="h-6 w-6" />
                  )}
                  {submitting ? 'Minting NFTs...' : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`}
                </button>

                {(!selectedTemplate || !selectedWallet || quantity <= 0) && (
                  <p className="text-sm text-gray-400 mt-4">
                    Please select a template, wallet, and valid quantity to proceed
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Response Received</h2>
                <p className="text-lg text-blue-400 mb-6">
                  Here's the response from the minting service:
                </p>
                
                {/* Raw Response Display */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Minting Response</h3>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  onClick={resetForm}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mint More NFTs
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
  );
};