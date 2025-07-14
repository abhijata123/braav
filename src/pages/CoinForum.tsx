import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Rotate3D, User, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../store/themeStore';
import { getBackgroundImage } from '../utils/theme';
import { AdminActions } from '../components/AdminActions';
import { UserBadges } from '../components/UserBadges';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { NewCoinBadge } from '../components/NewCoinBadge';
import { MessageNotification } from '../components/MessageNotification';
import { CoinSkeleton } from '../components/CoinSkeleton';
import { useInView } from 'react-intersection-observer';

interface User {
  Username: string;
  'piture link': string | null;
  Status: string | null;
  is_admin: boolean;
  is_founding_member: boolean;
}

interface Coin {
  id: number;
  'Coin Name': string;
  'Coin Image': string;
  'BacksideUrl': string | null;
  'Date Issued': string;
  Featured: boolean;
  Username: string;
  'Mode Of Acquiring': string;
  UserId: string;
  created_at: string;
  'Has Copyright': boolean;
  owner: {
    Username: string;
    'piture link': string | null;
    Status: string | null;
    is_admin: boolean;
    is_founding_member: boolean;
  };
}

const COINS_PER_PAGE = 12;

export const CoinForum: React.FC = () => {
  const { user } = useAuthStore();
  const { theme, initializeTheme } = useThemeStore();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [flippedCoins, setFlippedCoins] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uniqueUsers, setUniqueUsers] = useState<{ Username: string; 'piture link': string | null; Status: string | null; coinCount: number; is_admin: boolean; is_founding_member: boolean }[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [isCometChatInitialized, setIsCometChatInitialized] = useState(false);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});
  const notificationSoundRef = useRef<HTMLAudioElement>(null);
  const [notification, setNotification] = useState<{
    sender: { name: string; avatar?: string; uid: string };
    message: string;
  } | null>(null);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px 0px',
  });

  // Initialize theme for the current user
  useEffect(() => {
    if (user) {
      initializeTheme();
    }
  }, [user]);

  useEffect(() => {
    if (user && !isCometChatInitialized) {
      let retryCount = 0;
      const maxRetries = 3;
      const retryInterval = 1000;

      const initChat = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
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

          await (window as any).CometChatWidget.init({
            "appID": "27191081cbac1c5c",
            "appRegion": "us",
            "authKey": "9060f5983cf2e4050738658b003b5b60573589b9"
          });

          await (window as any).CometChatWidget.login({
            "uid": user.id
          });

          await (window as any).CometChatWidget.launch({
            "widgetID": "15b02a26-ed76-4990-86b8-2868c0af2815",
            "docked": "true",
            "alignment": "left",
            "roundedCorners": "true",
            "height": "450px",
            "width": "400px",
            "defaultID": 'cometchat-uid-1',
            "defaultType": 'user'
          }).then(() => {
            // Add message listener
            (window as any).CometChatWidget.on("onMessageReceived", (message: any) => {
              console.log("CometChatWidget onMessageReceived in CoinForum", message);
              
              // Play notification sound
              if (notificationSoundRef.current) {
                notificationSoundRef.current.volume = 0.5; // Set volume to 50%
                notificationSoundRef.current.play().catch(err => {
                  console.error("Error playing notification sound:", err);
                });
              }
              
              // Show popup notification
              setNotification({
                sender: {
                  name: message.sender.name || message.sender.uid,
                  avatar: message.sender.avatar,
                  uid: message.sender.uid
                },
                message: message.text || "New message"
              });
            });
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
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset and fetch when search term changes
  useEffect(() => {
    setCoins([]);
    setPage(0);
    setHasMore(true);
    fetchPaginatedCoins(0, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Load more coins when scrolling
  const loadMoreCoins = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchPaginatedCoins(page + 1, debouncedSearchTerm);
    }
  }, [loadingMore, hasMore, loading, page, debouncedSearchTerm]);

  useEffect(() => {
    if (inView) {
      loadMoreCoins();
    }
  }, [inView, loadMoreCoins]);

  // Update unique users when coins change
  useEffect(() => {
    const userMap = new Map();
    coins.forEach(coin => {
      if (coin.owner && coin.Username) {
        if (!userMap.has(coin.Username)) {
          userMap.set(coin.Username, {
            Username: coin.Username,
            'piture link': coin.owner ? coin.owner['piture link'] : null,
            Status: coin.owner ? coin.owner.Status : null,
            coinCount: 1,
            is_admin: coin.owner ? coin.owner.is_admin : false,
            is_founding_member: coin.owner ? coin.owner.is_founding_member : false
          });
        } else {
          userMap.get(coin.Username).coinCount++;
        }
      }
    });
    setUniqueUsers(Array.from(userMap.values()));
  }, [coins]);

  // Generate suggestions from loaded coins
  useEffect(() => {
    if (coins.length > 0 && searchTerm.trim().length > 0) {
      const uniqueNames = [...new Set(coins
        .map(coin => coin['Coin Name'])
        .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
      )];
      setSuggestions(uniqueNames.slice(0, 5));
      setShowSuggestions(uniqueNames.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, coins]);

  const preloadImage = (src: string, coinId: number, isMainImage = true) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (isMainImage) {
        setLoadingImages(prev => ({
          ...prev,
          [coinId]: false
        }));
      }
    };
    img.onerror = () => {
      if (isMainImage) {
        setLoadingImages(prev => ({
          ...prev,
          [coinId]: false
        }));
      }
      console.error(`Failed to load image: ${src}`);
    };
  };

  const fetchPaginatedCoins = async (currentPage: number, currentSearchTerm: string) => {
    const isInitialLoad = currentPage === 0;
    
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const start = currentPage * COINS_PER_PAGE;
      const end = start + COINS_PER_PAGE - 1;

      let query = supabase
        .from('Challenge Coin Table')
        .select('*, created_at, "Has Copyright"')
        .eq('Public Display', true)
        .order('created_at', { ascending: false })
        .range(start, end);

      // Apply search filter if search term exists
      if (currentSearchTerm.trim()) {
        query = query.ilike('Coin Name', `%${currentSearchTerm}%`);
      }

      const { data: coinData, error: coinError } = await query;

      if (coinError) throw coinError;

      if (!coinData || coinData.length === 0) {
        if (isInitialLoad) {
          setCoins([]);
        }
        setHasMore(false);
        return;
      }

      // Fetch user data for coin owners
      const usernames = [...new Set(coinData.map(coin => coin.Username))];
      const { data: userData, error: userError } = await supabase
        .from('User Dps')
        .select('Username, "piture link", Status, is_admin, is_founding_member')
        .in('Username', usernames);

      if (userError) throw userError;

      const userMap = new Map(userData?.map(user => [user.Username, user]) || []);

      const coinsWithOwner = coinData.map(coin => ({
        ...coin,
        owner: userMap.get(coin.Username) || {
          Username: coin.Username,
          'piture link': null,
          Status: null,
          is_admin: false,
          is_founding_member: false
        }
      }));

      // Initialize loading state for new coins
      const newLoadingState = isInitialLoad ? {} : { ...loadingImages };
      coinsWithOwner.forEach(coin => {
        newLoadingState[coin.id] = true;
        preloadImage(coin['Coin Image'], coin.id);
        if (coin.BacksideUrl) {
          preloadImage(coin.BacksideUrl, coin.id, false);
        }
      });
      setLoadingImages(newLoadingState);

      // Update coins state
      if (isInitialLoad) {
        setCoins(coinsWithOwner);
      } else {
        setCoins(prev => [...prev, ...coinsWithOwner]);
      }

      // Update pagination state
      setPage(currentPage);
      setHasMore(coinData.length === COINS_PER_PAGE);

    } catch (error) {
      console.error('Error fetching coins:', error);
      toast.error('Failed to load coins');
      if (isInitialLoad) {
        setCoins([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const toggleCoinFlip = (coinId: number) => {
    setFlippedCoins(prev => ({
      ...prev,
      [coinId]: !prev[coinId]
    }));
  };

  // Prevent right-click and other ways to save the image
  const preventSave = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
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
      {/* Hidden audio element for notification sound */}
      <audio ref={notificationSoundRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      
      {notification && (
        <MessageNotification 
          sender={notification.sender}
          message={notification.message}
          onClose={() => setNotification(null)}
          onClick={() => {
            (window as any).CometChatWidget.chatWithUser(notification.sender.uid);
            setNotification(null);
          }}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6 mb-8">
          <h1 className="text-3xl font-bold text-white text-center sm:text-left">Coin Forum</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full" ref={suggestionsRef}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by coin name..."
                className="w-full px-4 py-3 pl-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg border border-white/10 overflow-hidden">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(searchTerm || debouncedSearchTerm) && (
            <div className="text-gray-400 text-sm">
              Found {coins.length} {coins.length === 1 ? 'result' : 'results'} for "{debouncedSearchTerm || searchTerm}"
              {hasMore && ' (loading more...)'}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {coins.map((coin) => (
                <div
                  key={coin.id}
                  className={`bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden ${
                    coin.Featured ? 'ring-2 ring-yellow-500' : ''
                  }`}
                >
                  <Link
                    to={`/collection/${coin.Username}/coin/${coin.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group block"
                  >
                    <NewCoinBadge dateAdded={coin.created_at} />
                    {loadingImages[coin.id] ? (
                      <div className="relative aspect-square flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div 
                        className="relative aspect-square"
                        onContextMenu={preventSave} // Prevent right-click
                      >
                        <img
                          src={flippedCoins[coin.id] && coin.BacksideUrl ? coin.BacksideUrl : coin['Coin Image']}
                          alt={coin['Coin Name']}
                          className="absolute inset-0 w-full h-full object-contain p-4 select-none"
                          width="300"
                          height="300"
                          loading="lazy"
                          draggable="false"
                          style={{
                            WebkitUserSelect: 'none',
                            userSelect: 'none',
                            pointerEvents: 'none'
                          }}
                          onLoad={() => {
                            setLoadingImages(prev => ({
                              ...prev,
                              [coin.id]: false
                            }));
                          }}
                          onError={() => {
                            setLoadingImages(prev => ({
                              ...prev,
                              [coin.id]: false
                            }));
                          }}
                        />
                        {coin['Has Copyright'] && (
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                            Made by {coin.Username}
                          </div>
                        )}
                      </div>
                    )}
                    {coin.Featured && (
                      <div className="absolute top-2 right-2">
                        <Star className="h-6 w-6 text-yellow-500 fill-current" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center p-4">
                        <h3 className="font-bold break-words">{coin['Coin Name']}</h3>
                        <p className="text-sm text-gray-300 mt-2">
                          {new Date(coin['Date Issued']).toLocaleDateString()}
                        </p>
                        {coin.BacksideUrl && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleCoinFlip(coin.id);
                            }}
                            className="mt-4 flex items-center gap-2 mx-auto text-blue-400 hover:text-blue-300"
                          >
                            <Rotate3D size={16} />
                            Flip Coin
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        to={`/collection/${coin.Username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <img
                              src={coin.owner && coin.owner['piture link'] ? coin.owner['piture link'] : `https://api.dicebear.com/7.x/initials/svg?seed=${coin.owner ? coin.owner.Username : coin.Username}`}
                              alt={coin.owner ? coin.owner.Username : coin.Username}
                              className="w-full h-full object-cover"
                              width="32"
                              height="32"
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            <UserBadges 
                              isAdmin={coin.owner ? coin.owner.is_admin : false} 
                              isFoundingMember={coin.owner ? coin.owner.is_founding_member : false}
                              size={12}
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{coin.owner ? coin.owner.Username : coin.Username}</p>
                          {coin.owner && coin.owner.Status && (
                            <p className="text-sm text-gray-400 truncate">{coin.owner.Status}</p>
                          )}
                        </div>
                      </Link>
                      <AdminActions 
                        coinId={coin.id} 
                        userEmail={coin.UserId}
                        onSuccess={() => {
                          // Remove the deleted coin from the current coins array
                          setCoins(prev => prev.filter(c => c.id !== coin.id));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading skeletons */}
              {(loading || loadingMore) && Array.from({ length: loading ? 6 : 3 }).map((_, index) => (
                <CoinSkeleton key={`skeleton-${index}`} />
              ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="text-center mt-8">
                <div className="text-gray-400">Loading more coins...</div>
              </div>
            )}

            {/* All coins loaded message */}
            {!hasMore && coins.length > 0 && !loading && (
              <div className="text-center text-gray-400 mt-8">
                <p>✨ All coins loaded ({coins.length} total)</p>
                <p className="text-sm mt-1">You've reached the end of the forum!</p>
              </div>
            )}

            {/* No coins found */}
            {coins.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
                <Search className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg">
                  {debouncedSearchTerm ? 'No coins found matching your search.' : 'No public coins available.'}
                </p>
                <p className="text-sm mt-2">
                  {debouncedSearchTerm ? 'Try adjusting your search terms.' : 'Check back later for new coins!'}
                </p>
              </div>
            )}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-10" />
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <User className="h-5 w-5" />
                Contributors
              </h2>
              <div className="space-y-4">
                {uniqueUsers.map((collector) => (
                  <Link
                    key={collector.Username}
                    to={`/collection/${collector.Username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <img
                            src={collector['piture link'] ? collector['piture link'] : `https://api.dicebear.com/7.x/initials/svg?seed=${collector.Username}`}
                            alt={collector.Username}
                            className="w-full h-full object-cover"
                            width="48"
                            height="48"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          <UserBadges 
                            isAdmin={collector.is_admin} 
                            isFoundingMember={collector.is_founding_member}
                            size={14}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{collector.Username}</p>
                        {collector.Status && (
                          <p className="text-sm text-gray-400 truncate">{collector.Status}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-400">{collector.coinCount} coins</p>
                      </div>
                    </div>
                  </Link>
                ))}

                {uniqueUsers.length === 0 && !loading && (
                  <div className="text-center text-gray-400">
                    <p>No contributors found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};