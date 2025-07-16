import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Collection } from './pages/Collection';
import { Upload } from './pages/Upload';
import { CoinDetails } from './pages/CoinDetails';
import { UserDetails } from './pages/UserDetails';
import { LoaderPage } from './pages/LoaderPage';
import { PublicCollection } from './pages/PublicCollection';
import { PublicCoinDetails } from './pages/PublicCoinDetails';
import { Leaderboard } from './pages/Leaderboard';
import { SendCoin } from './pages/SendCoin';
import { Search } from './pages/Search';
import { CoinForum } from './pages/CoinForum';
import { Notifications } from './pages/Notifications';
import { Posts } from './pages/Posts';
import { CreateCoin } from './pages/CreateCoin';
import { Events } from './pages/Events';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useAdminStore } from './store/adminStore';
import { supabase } from './lib/supabase';

// PWA Redirect Handler Hook
const usePWARedirectHandler = () => {
  useEffect(() => {
    const handlePWARedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isPWARedirect = urlParams.get('pwa');
      
      console.log('=== PWA Redirect Handler Debug ===');
      console.log('Current URL:', window.location.href);
      console.log('PWA redirect detected:', isPWARedirect);
      console.log('Is running in PWA mode:', window.matchMedia('(display-mode: standalone)').matches);
      
      if (isPWARedirect === 'true') {
        console.log('PWA redirect detected, processing...');
        
        // Handle Supabase auth session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Session found, user authenticated');
          
          // Clean up the URL (remove ?pwa=true)
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          
          // Try multiple methods to redirect to PWA
          console.log('Attempting to redirect to PWA...');
          
          // Method 1: Try to open PWA directly
          try {
            // For Android Chrome
            if (navigator.userAgent.includes('Android')) {
              window.location.href = 'intent://coins.braav.co/#Intent;scheme=https;package=com.android.chrome;end';
              return;
            }
            
            // For iOS Safari
            if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
              window.location.href = 'https://coins.braav.co';
              return;
            }
            
            // Generic fallback
            window.location.href = 'https://coins.braav.co';
            
          } catch (error) {
            console.error('Failed to redirect to PWA:', error);
            
            // Fallback: Show message to user
            document.body.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
                padding: 20px;
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
              ">
                <h2 style="color: #333; margin-bottom: 20px;">✅ Login Successful!</h2>
                <p style="color: #666; margin-bottom: 30px;">Please open your installed <strong>Coins</strong> app to continue.</p>
                <button onclick="window.location.href='https://coins.braav.co'" style="
                  background-color: #007bff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  font-size: 16px;
                  cursor: pointer;
                ">Open App</button>
              </div>
            `;
          }
        } else {
          console.log('No session found, auth may have failed');
        }
      }
    };
    
    // Run the handler
    handlePWARedirect();
  }, []);
};

// Protected Route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Admin Route wrapper component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const { isAdmin } = useAdminStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { user } = useAuthStore();
  const { checkAdminStatus } = useAdminStore();
  const { initializeTheme } = useThemeStore();

  // Add PWA redirect handler
  usePWARedirectHandler();

  useEffect(() => {
    if (user) {
      initializeTheme();
      checkAdminStatus(user.email!);
    }
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/loading" element={<LoaderPage />} />
        <Route path="/collection/:username" element={<PublicCollection />} />
        <Route path="/collection/:username/coin/:id" element={<PublicCoinDetails />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Posts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-collection"
            element={
              <ProtectedRoute>
                <Collection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <AdminRoute>
                <CreateCoin />
              </AdminRoute>
            }
          />
          <Route
            path="/coin/:id"
            element={
              <ProtectedRoute>
                <CoinDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/send"
            element={
              <ProtectedRoute>
                <SendCoin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forum"
            element={
              <ProtectedRoute>
                <CoinForum />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <Events />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;