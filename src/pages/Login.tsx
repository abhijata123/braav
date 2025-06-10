import React, { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Logo } from '../components/Logo';

// Email normalization utility function
const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { user } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize the email before processing
      const normalizedEmail = normalizeEmail(email);

      // Check if user exists in User Dps table (using normalized email)
      const { data: userData, error: userError } = await supabase
        .from('User Dps')
        .select('email')
        .eq('email', normalizedEmail)
        .single();

      // If user doesn't exist, redirect to signup
      if (!userData || userError) {
        toast.error('Please sign up first to create an account');
        navigate('/signup', { 
          state: { 
            email: normalizedEmail,
            message: 'Please create an account before attempting to log in'
          } 
        });
        setLoading(false);
        return;
      }

      // If user exists, proceed with magic link login (using normalized email)
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (signInError) throw signInError;

      setMagicLinkSent(true);
      toast.success('Check your email for the login link!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0d182a] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center">
          <div className="flex justify-center w-full">
            <Logo showText={false} />
          </div>
          <p className="mt-2 text-sm text-gray-400">Sign in to manage your collection</p>
        </div>

        {magicLinkSent ? (
          <div className="text-center space-y-4">
            <div className="bg-blue-500/10 text-blue-500 p-4 rounded-lg">
              <h2 className="text-lg font-medium mb-2">Check your email</h2>
              <p className="text-sm">
                We've sent a magic link to <strong>{normalizeEmail(email)}</strong>
              </p>
              <p className="text-sm mt-2">
                Click the link in the email to sign in to your account.
              </p>
            </div>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-blue-500 hover:text-blue-400 text-sm"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </div>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                New to Challenge Coins?{' '}
                <Link to="/signup" className="text-blue-500 hover:text-blue-400 font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};