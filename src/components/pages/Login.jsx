import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginUserMutation, useGoogleLoginMutation, useLazyGetProfileQuery } from '../store/authApi';
import { setUser } from '../store/authSlice';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, LogIn, Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const Login = () => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loginUser, { isLoading: loginLoading }] = useLoginUserMutation();
  const [googleLogin, { isLoading: googleLoading }] = useGoogleLoginMutation();
  const [getProfile] = useLazyGetProfileQuery();

  // ── Shared post-auth handling for both email/password and Google ──
  const finishLogin = (user) => {
    const userId = user._id || user.id;
    if (!userId) {
      throw new Error('User ID not found. Please contact support.');
    }
    const userWithId = { ...user, _id: userId };

    dispatch(setUser(userWithId));

    setUserName(userWithId.username || userWithId.email?.split('@')[0] || 'User');
    setShowWelcome(true);

    setTimeout(() => {
      setShowWelcome(false);
      if (userWithId.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    }, 2000);
  };

  // ── Google login (auth-code flow — matches backend's code exchange) ──
  const googleLoginHandler = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (response) => {
      try {
        const result = await googleLogin(response.code).unwrap();
        const user = result?.user;
        if (!user) throw new Error('No user data received from Google login.');
        finishLogin(user);
      } catch (error) {
        setMessage(error?.data?.message || error.message || 'Google sign-in failed. Please try again.');
        setTimeout(() => setMessage(''), 4000);
      }
    },
    onError: () => {
      setMessage('Google sign-in failed. Please try again.');
      setTimeout(() => setMessage(''), 4000);
    },
  });

  // ── Email/password login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const loginResponse = await loginUser({ email: trimmedEmail, password }).unwrap();

      let user = loginResponse?.user || loginResponse?.data?.user || null;

      if (!user) {
        try {
          const profileData = await getProfile().unwrap();
          user = profileData?.user || profileData;
        } catch (profileError) {
          throw new Error('Could not fetch user profile. Please try again.');
        }
      }

      if (!user) {
        throw new Error('No user data received from server.');
      }

      finishLogin(user);
    } catch (error) {
      setMessage(error.message || error?.data?.message || 'Invalid email or password. Please try again.');
      setTimeout(() => setMessage(''), 4000);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {showWelcome && (
        <div className="fixed top-5 right-5 z-50 animate-slide-in-right">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <CheckCircle size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Welcome back! 👋</p>
              <p className="text-sm opacity-90">Hello, {userName}!</p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 animate-gradient">
        <div className="absolute inset-0 bg-black opacity-20"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
      </div>

      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-20 animate-float-particle"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 10 + 5 + 's'
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-105 animate-fade-in-up border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full mb-4 shadow-lg animate-bounce-slow">
              <LogIn className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-gray-500 mt-2">Sign in to continue your journey</p>
          </div>

          {message && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
              <p className="text-red-700 text-sm flex items-center gap-2">
                <Sparkles size={16} />
                {message}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={googleLoginHandler}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 mb-5 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-semibold text-gray-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors duration-300" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  maxLength={254}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors duration-300" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgotpassword" className="text-sm text-purple-600 hover:text-purple-700 hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="relative w-full mt-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden group"
            >
              <span className={`relative z-10 flex items-center justify-center gap-2 ${loginLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                <LogIn size={18} />
                {loginLoading ? 'Logging in...' : 'Login'}
              </span>
              {loginLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-blue-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline inline-flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
              Register here
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-180deg); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          50% { transform: translateY(-100px) translateX(50px); opacity: 0.5; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-gradient { background-size: 200% 200%; animation: gradient 10s ease infinite; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle 8s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-slide-in-right { animation: slide-in-right 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default Login;