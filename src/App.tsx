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
import { CreateCustodialWallet } from './pages/CreateCustodialWallet';
import { SubmitVettingRequests } from './pages/SubmitVettingRequests';
import { VettingAdminDashboard } from './pages/VettingAdminDashboard';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useAdminStore } from './store/adminStore';

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

// Vetting Admin Route wrapper component
const VettingAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const AUTHORIZED_ADMINS = [
    'anna+test@braav.co',
    'abhijatasen18+charlotte@gmail.com',
    'ashleyblewis@gmail.com'
  ];

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!AUTHORIZED_ADMINS.includes(user.email!)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { user } = useAuthStore();
  const { checkAdminStatus } = useAdminStore();
  const { initializeTheme } = useThemeStore();

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
          <Route
            path="/create-wallet"
            element={
              <ProtectedRoute>
                <CreateCustodialWallet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submit-vetting-requests"
            element={
              <ProtectedRoute>
                <SubmitVettingRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vetting-dashboard"
            element={
              <VettingAdminRoute>
                <VettingAdminDashboard />
              </VettingAdminRoute>
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