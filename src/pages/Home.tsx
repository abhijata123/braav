import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Save, Trash2, Rotate3D, Star, MapPin, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ThemeSelector } from '../components/ThemeSelector';
import { getBackgroundImage } from '../utils/theme';
import { UserBadges } from '../components/UserBadges';

interface Coin {
  id: number;
  'Coin Name': string;
  'Coin Image': string;
  'BacksideUrl': string | null;
  'Date Issued': string;
  Priority: number;
  Featured: boolean;
}

interface UserProfile {
  Username: string;
  Bio: string;
  'piture link': string;
  Status: string;
  Location: string;
  is_admin: boolean;
  is_founding_member: boolean;
}

export const Home: React.FC = () => {
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const [deletingCoinId, setDeletingCoinId] = useState<number | null>(null);
  const [flippedCoins, setFlippedCoins] = useState<Record<number, boolean>>({});
  const [isCometChatInitialized, setIsCometChatInitialized] = useState(false);

  useEffect(() => {
    if (user && !isCometChatInitialized) {
      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = 1000; // 1 second

      const initChat = async () => {
        try {
          // Wait for a short delay before initializing
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check if CometChat user exists
          const response = await fetch(`https://27191081cbac1c5c.api-us.cometchat.io/v3/users/${user.id}`, {
            method: 'GET',
            headers: {
              'apikey': '8beed8636a0f5e5496294ba8a66fb0826e912203',
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('CometChat user not found');
          }

          // Initialize CometChat
          await (window as any).CometChatWidget.init({
            "appID": "27191081cbac1c5c",
            "appRegion": "us",
            "authKey": "9060f5983cf2e4050738658b003b5b60573589b9"
          });

          // Login to CometChat
          await (window as any).CometChatWidget.login({
            "uid": user.id
          });

          // Launch widget
          await (window as any).CometChatWidget.launch({
            "widgetID": "15b02a26-ed76-4990-86b8-2868c0af2815",
            "docked": "true",
            "alignment": "left",
            "roundedCorners": "true",
            "height": "450px",
            "width": "400px",
            "defaultID": 'cometchat-uid-1',
            "defaultType": 'user'
          });

          setIsCometChatInitialized(true);
        } catch (error) {
          console.error("CometChat initialization error:", error);
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initChat, retryInterval);
          }
        }
      };

      initChat();
    }
  }, [user, isCometChatInitialized]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user?.email) return;
    
    try {
      // First, wait for a short delay to ensure the profile is created
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data, error } = await supabase
        .from('User Dps')
        .select('Username, Bio, "piture link", Status, Location, is_admin, is_founding_member')
        .eq('email', user.email)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Profile not found');
        return;
      }

      setProfile(data);
      setNewBio(data.Bio || '');
      fetchCoins(data.Username);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    }
  };

  const fetchCoins = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from('Challenge Coin Table')
        .select('*')
        .eq('Username', username)
        .order('Priority', { ascending: true })
        .order('Featured', { ascending: false });

      if (error) throw error;

      const coinsWithPriority = (data || []).map((coin, index) => ({
        ...coin,
        Priority: coin.Priority ?? index
      }));

      setCoins(coinsWithPriority);
    } catch (error) {
      console.error('Error fetching coins:', error);
      toast.error('Failed to load coins');
    }
  };

  const handleBioSave = async () => {
    if (!user?.email) return;
    const { error } = await supabase
      .from('User Dps')
      .update({ Bio: newBio })
      .eq('email', user.email);

    if (error) {
      toast.error('Failed to update bio');
      return;
    }

    setProfile(prev => prev ? { ...prev, Bio: newBio } : null);
    setIsEditingBio(false);
    toast.success('Bio updated successfully');
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !user) return;

    setIsReordering(true);
    const items = Array.from(coins);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      Priority: index
    }));

    setCoins(updatedItems);

    try {
      // Update each coin's priority in the database
      for (const item of updatedItems) {
        const { error } = await supabase
          .from('Challenge Coin Table')
          .update({ Priority: item.Priority })
          .eq('id', item.id)
          .eq('UserId', user.id);

        if (error) throw error;
      }

      toast.success('Coin order updated successfully');
    } catch (error) {
      console.error('Error updating coin order:', error);
      fetchCoins(profile?.Username || ''); // Revert to original order if update fails
      toast.error('Failed to update coin order');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDeleteCoin = async (coinId: number) => {
    try {
      const coinToDelete = coins.find(coin => coin.id === coinId);
      if (!coinToDelete) return;

      const frontFileName = coinToDelete['Coin Image'].split('/').pop();
      const backFileName = coinToDelete['BacksideUrl']?.split('/').pop();

      const { error: dbError } = await supabase
        .from('Challenge Coin Table')
        .delete()
        .eq('id', coinId);

      if (dbError) throw dbError;

      if (frontFileName) {
        await supabase.storage
          .from('Coin Images')
          .remove([frontFileName]);
      }

      if (backFileName) {
        await supabase.storage
          .from('Coin Images')
          .remove([backFileName]);
      }

      setCoins(coins.filter(coin => coin.id !== coinId));
      toast.success('Coin deleted successfully');
    } catch (error) {
      console.error('Error deleting coin:', error);
      toast.error('Failed to delete coin');
    } finally {
      setDeletingCoinId(null);
    }
  };

  const toggleCoinFlip = (coinId: number) => {
    setFlippedCoins(prev => ({
      ...prev,
      [coinId]: !prev[coinId]
    }));
  };

  return (
    <div 
      className="min-h-screen bg-[#0d182a] bg-opacity-95"
      style={{
        backgroundImage: `url('${getBackgroundImage(theme)}')`,
        backgroundBlendMode: 'overlay',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ThemeSelector />
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <img
                src={profile?.['piture link'] || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile?.Username || 'User'}`}
                alt="Profile"
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full shadow-lg"
              />
              {profile && (
                <div className="absolute -bottom-2 -right-2">
                  <UserBadges 
                    isAdmin={profile.is_admin} 
                    isFoundingMember={profile.is_founding_member}
                    size={20}
                  />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-words">
                {profile?.Username || 'Loading...'}
              </h1>
              {isEditingBio ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    maxLength={250}
                    className="flex-1 bg-white/20 text-white rounded-md p-2 backdrop-blur-sm resize-none"
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                  <button
                    onClick={handleBioSave}
                    className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
                  >
                    <Save size={20} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <p className="text-gray-300 break-words">{profile?.Bio || 'No bio yet'}</p>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {profile?.Status && (
                    <div className="flex items-center gap-2 text-gray-300 justify-center sm:justify-start">
                      <User size={16} className="text-blue-400 flex-shrink-0" />
                      <span className="break-words">{profile.Status}</span>
                    </div>
                  )}
                  {profile?.Location && (
                    <div className="flex items-center gap-2 text-gray-300 justify-center sm:justify-start">
                      <MapPin size={16} className="text-red-400 flex-shrink-0" />
                      <span className="break-words">{profile.Location}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <h2 className="text-2xl font-bold text-white">My Collection</h2>
          <Link
            to="/upload"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Coin
          </Link>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="coins">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {coins.map((coin, index) => (
                  <Draggable key={coin.id} draggableId={String(coin.id)} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden transform hover:scale-105 transition-transform duration-200 ${
                          isReordering ? 'opacity-75' : ''
                        } ${coin.Featured ? 'ring-2 ring-yellow-500' : ''}`}
                      >
                        <div className="relative group">
                          <div className="relative w-[200px] h-[200px] mx-auto">
                            <img
                              src={flippedCoins[coin.id] && coin.BacksideUrl ? coin.BacksideUrl : coin['Coin Image']}
                              alt={coin['Coin Name']}
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                          </div>
                          {coin.Featured && (
                            <div className="absolute top-2 right-2">
                              <Star className="h-6 w-6 text-yellow-500 fill-current" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center p-4">
                              <h3 className="font-bold break-words">{coin['Coin Name']}</h3>
                              <p className="text-sm">{new Date(coin['Date Issued']).toLocaleDateString()}</p>
                              <Link
                                to={`/coin/${coin.id}`}
                                className="mt-2 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Details
                              </Link>
                              {coin.BacksideUrl && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    toggleCoinFlip(coin.id);
                                  }}
                                  className="mt-2 flex items-center gap-2 mx-auto text-blue-400 hover:text-blue-300"
                                >
                                  <Rotate3D size={16} />
                                  Flip Coin
                                </button>
                              )}
                              {deletingCoinId === coin.id ? (
                                <div className="mt-4 flex gap-2 justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleDeleteCoin(coin.id);
                                    }}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDeletingCoinId(null);
                                    }}
                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setDeletingCoinId(coin.id);
                                  }}
                                  className="mt-4 flex items-center gap-2 mx-auto text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={16} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {coins.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg">Start building your collection by adding your first coin!</p>
          </div>
        )}
      </div>
    </div>
  );
};