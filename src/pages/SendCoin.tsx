import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Loader2, Search, Mail, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import toast from 'react-hot-toast';

interface Coin {
  id: number;
  'Coin Name': string;
  'Coin Image': string;
  'Number Of Coins': number;
  available_quantity: number;
}

interface User {
  email: string;
  Username: string;
  'piture link': string | null;
  Status: string | null;
}

export const SendCoin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [senderUsername, setSenderUsername] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchAllUsers();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = users.filter(u => 
        u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.Status?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUserData = async () => {
    if (!user?.email) return;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('User Dps')
        .select('Username')
        .eq('email', user.email)
        .single();

      if (userError) throw userError;
      setSenderUsername(userData.Username);

      // Fixed: Filter by UserId (email) instead of Username to match backend validation
      const { data: coinsData, error: coinsError } = await supabase
        .from('Challenge Coin Table')
        .select('id, "Coin Name", "Coin Image", "Number Of Coins", available_quantity')
        .eq('UserId', user.email)
        .gt('available_quantity', 0);

      if (coinsError) throw coinsError;
      setCoins(coinsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from('User Dps')
        .select('email, Username, "piture link", Status')
        .neq('email', user.email)
        .order('Username');

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !user?.email) return;

    setInviting(true);
    try {
      await fetch('https://hook.us2.make.com/8qox830ayn172pgl2ug2tuu9oit53vty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: senderUsername,
          userEmail: user.email,
          inviteEmail: inviteEmail
        }),
      });

      toast.success('Invitation sent successfully!');
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCoin || !user) {
      toast.error('Please select a coin');
      return;
    }

    // Determine recipient email
    let targetEmail = '';
    if (useCustomEmail) {
      if (!recipientEmail.trim()) {
        toast.error('Please enter a recipient email');
        return;
      }
      if (!recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast.error('Please enter a valid email address');
        return;
      }
      targetEmail = recipientEmail.trim();
    } else {
      if (!selectedUser) {
        toast.error('Please select a recipient');
        return;
      }
      targetEmail = selectedUser.email;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('transfer_coins_with_note', {
        sender_email: user.email,
        receiver_email: targetEmail,
        p_coin_id: selectedCoin.id,
        p_quantity: quantity,
        p_note: note.trim() || null
      });

      if (error) throw error;
      
      if (data === 'success') {
        toast.success('Coins sent successfully!');
        navigate('/my-collection');
      } else if (data === 'pending') {
        toast.success('Coins queued successfully! They will be delivered when the recipient signs up.', {
          duration: 5000,
          icon: '⏳'
        });
        navigate('/my-collection');
      } else {
        throw new Error(data);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send coins');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0d182a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d182a] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-300 hover:text-white mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Collection
        </button>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Send Coins</h1>
          </div>

          {coins.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No coins available to send.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Select Coin
                </label>
                <select
                  value={selectedCoin?.id || ''}
                  onChange={(e) => {
                    const coin = coins.find(c => c.id === parseInt(e.target.value));
                    setSelectedCoin(coin || null);
                    setQuantity(1);
                  }}
                  className="w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select a coin</option>
                  {coins.map((coin) => (
                    <option key={coin.id} value={coin.id}>
                      {coin['Coin Name']} ({coin.available_quantity} available)
                    </option>
                  ))}
                </select>
              </div>

              {selectedCoin && (
                <>
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedCoin['Coin Image']}
                      alt={selectedCoin['Coin Name']}
                      className="w-24 h-24 object-contain rounded-lg bg-gray-800"
                      loading="lazy"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-white">
                        {selectedCoin['Coin Name']}
                      </h3>
                      <p className="text-gray-400">
                        Available: {selectedCoin.available_quantity}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Quantity to Send
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedCoin.available_quantity}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Add a Note (Optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a personal note about this coin..."
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {note.length}/500 characters
                      {note.trim() && (
                        <span className="ml-2 text-yellow-400">
                          • This note will replace the existing coin story for the recipient
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-200">
                        Select Recipient
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={useCustomEmail}
                            onChange={(e) => {
                              setUseCustomEmail(e.target.checked);
                              if (e.target.checked) {
                                setSelectedUser(null);
                              } else {
                                setRecipientEmail('');
                              }
                            }}
                            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                          />
                          Send to any email
                        </label>
                        <button
                          onClick={() => setShowInviteForm(!showInviteForm)}
                          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                        >
                          <UserPlus size={16} />
                          Invite User
                        </button>
                      </div>
                    </div>

                    {showInviteForm && (
                      <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleInvite}
                            disabled={inviting || !inviteEmail}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            {inviting ? (
                              <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                              <Mail size={16} />
                            )}
                            Invite
                          </button>
                        </div>
                      </div>
                    )}

                    {useCustomEmail ? (
                      <div>
                        <input
                          type="email"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          placeholder="Enter recipient's email address"
                          className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-2">
                          💡 If this person hasn't signed up yet, the coins will be queued and delivered when they join!
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search users..."
                            className="w-full px-4 py-3 pl-10 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        </div>

                        <div 
                          ref={parentRef}
                          className="mt-4 h-60 overflow-y-auto"
                        >
                          <div
                            style={{
                              height: `${rowVirtualizer.getTotalSize()}px`,
                              width: '100%',
                              position: 'relative',
                            }}
                          >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                              const user = filteredUsers[virtualRow.index];
                              return (
                                <button
                                  key={user.email}
                                  onClick={() => setSelectedUser(selectedUser?.email === user.email ? null : user)}
                                  className={`absolute top-0 left-0 w-full ${
                                    selectedUser?.email === user.email
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                  }`}
                                  style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                  }}
                                >
                                  <div className="flex items-center gap-3 p-3 rounded-lg transition-colors">
                                    <img
                                      src={user['piture link'] || `https://api.dicebear.com/7.x/initials/svg?seed=${user.Username}`}
                                      alt={user.Username}
                                      className="w-10 h-10 rounded-full"
                                      loading="lazy"
                                    />
                                    <div className="flex-1 text-left">
                                      <p className="font-medium">{user.Username}</p>
                                      {user.Status && (
                                        <p className="text-sm text-gray-400">{user.Status}</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleTransfer}
                    disabled={loading || (!selectedUser && !useCustomEmail) || (useCustomEmail && !recipientEmail.trim())}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Send Coins
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};