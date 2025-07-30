import React, { useState } from 'react';
import { Wallet, Loader2, Copy, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getBackgroundImage } from '../utils/theme';
import toast from 'react-hot-toast';

interface WalletResponse {
  success: boolean;
  wallet: {
    address: string;
    publicKey: string;
    privateKey: string;
    privateKeyBase64: string;
    mnemonic: string;
    seedHex: string;
  };
  message: string;
}

export const CreateCustodialWallet: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<WalletResponse | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);

  const createWallet = async () => {
    if (!user?.email) {
      toast.error('Please log in to create a wallet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://hook.us2.make.com/zhst73g2xqju2fil5vot2qydbps83boc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create wallet');
      }

      const data: WalletResponse = await response.json();
      
      if (data.success) {
        setWalletData(data);
        toast.success(data.message || 'Wallet created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create wallet');
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const maskPrivateKey = (key: string) => {
    if (key.length <= 8) return key;
    return `${key.substring(0, 6)}${'•'.repeat(key.length - 12)}${key.substring(key.length - 6)}`;
  };

  const maskMnemonic = (mnemonic: string) => {
    const words = mnemonic.split(' ');
    return words.map((word, index) => 
      index < 3 || index >= words.length - 3 ? word : '•••••'
    ).join(' ');
  };

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Create Custodial Wallet</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Generate a secure custodial wallet for your crypto transactions. This wallet will be managed 
              securely and can be used for all your blockchain activities on our platform.
            </p>
          </div>

          {!walletData ? (
            <div className="text-center">
              <div className="bg-white/5 rounded-lg p-6 mb-8 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-white mb-4">What you'll get:</h3>
                <ul className="text-left text-gray-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span>Secure wallet address</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span>Private key for transactions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span>Recovery mnemonic phrase</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span>Full blockchain compatibility</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={createWallet}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all transform hover:scale-105 mx-auto shadow-lg"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
                {loading ? 'Creating Wallet...' : 'Create Custodial Wallet'}
              </button>
              
              <p className="text-sm text-gray-400 mt-4">
                Your wallet will be created for: {user?.email}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Wallet Created Successfully!</h2>
                <p className="text-green-400">{walletData.message}</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Wallet Address */}
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-blue-400" />
                      Wallet Address
                    </h3>
                    <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">
                      Public
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-3 font-mono text-sm break-all">
                      <span className="text-gray-300">{walletData.wallet.address}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(walletData.wallet.address, 'Wallet address')}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Copy wallet address"
                    >
                      <Copy className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Private Key */}
                <div className="bg-white/5 rounded-lg p-6 border border-red-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      Private Key
                    </h3>
                    <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                      Keep Secret
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-3 font-mono text-sm break-all">
                      <span className="text-gray-300">
                        {showPrivateKey 
                          ? walletData.wallet.privateKey 
                          : maskPrivateKey(walletData.wallet.privateKey)
                        }
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      title={showPrivateKey ? 'Hide private key' : 'Show private key'}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-4 w-4 text-gray-300" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-300" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(walletData.wallet.privateKey, 'Private key')}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="Copy private key"
                    >
                      <Copy className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <p className="text-xs text-red-400 mt-2">
                    ⚠️ Never share your private key with anyone. Anyone with access to this key can control your wallet.
                  </p>
                </div>

                {/* Recovery Phrase */}
                <div className="bg-white/5 rounded-lg p-6 border border-yellow-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      Recovery Phrase
                    </h3>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                      Backup Required
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-3 font-mono text-sm">
                      <span className="text-gray-300">
                        {showMnemonic 
                          ? walletData.wallet.mnemonic 
                          : maskMnemonic(walletData.wallet.mnemonic)
                        }
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                      title={showMnemonic ? 'Hide recovery phrase' : 'Show recovery phrase'}
                    >
                      {showMnemonic ? (
                        <EyeOff className="h-4 w-4 text-gray-300" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-300" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(walletData.wallet.mnemonic, 'Recovery phrase')}
                      className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                      title="Copy recovery phrase"
                    >
                      <Copy className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2">
                    💾 Store this recovery phrase safely. It can be used to restore your wallet if needed.
                  </p>
                </div>

                {/* Public Key */}
                <div className="bg-white/5 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Public Key</h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                      Safe to Share
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-3 font-mono text-sm break-all">
                      <span className="text-gray-300">{walletData.wallet.publicKey}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(walletData.wallet.publicKey, 'Public key')}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="Copy public key"
                    >
                      <Copy className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  Important Security Notes
                </h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Your wallet address is public and can be shared safely</li>
                  <li>• Never share your private key or recovery phrase with anyone</li>
                  <li>• Store your recovery phrase in a secure location offline</li>
                  <li>• This is a custodial wallet managed by our secure infrastructure</li>
                  <li>• You can use this wallet for all blockchain transactions on our platform</li>
                </ul>
              </div>

              <div className="text-center mt-8">
                <button
                  onClick={() => {
                    setWalletData(null);
                    setShowPrivateKey(false);
                    setShowMnemonic(false);
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Create Another Wallet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};