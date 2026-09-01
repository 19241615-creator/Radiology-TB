import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, Eye, EyeOff, Shield, ShieldCheck, ArrowRight, Key } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect to dashboard if already logged in / Load saved username
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
      return;
    }
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal. Periksa kembali username dan password Anda.');
      }

      // Save token and user details to local storage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Remember me logic
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }

      // Trigger split-screen double-door animation
      setIsSplitting(true);
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden">
      
      {/* 1. Left Hero Section (Hidden on mobile) */}
      <div className={`hidden lg:flex w-1/2 text-white p-16 flex-col justify-between relative overflow-hidden transition-all duration-800 cubic-bezier(0.4, 0, 0.2, 1) transform ${isSplitting ? '-translate-x-full opacity-0' : 'translate-x-0'}`}>
        <div className="absolute inset-0 z-0">
          <img 
            alt="Radiology Background" 
            className="absolute inset-0 w-full h-full object-cover" 
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80"
          />
          <div className="absolute inset-0 bg-[#002f3f]/75 backdrop-blur-[1px]"></div>
        </div>

        {/* Top Left Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="Logo Radiology TB" 
            className="w-11 h-11 rounded-full border border-white/20 object-cover shadow-md"
          />
          <div>
            <div className="font-extrabold text-[15px] tracking-wider text-white">RADIOLOGY <span className="text-[#00dfb6]">TB</span></div>
            <div className="text-[9px] text-white/60 tracking-widest font-semibold uppercase mt-0.5">Clinical Precision</div>
          </div>
        </div>

        {/* Main Copy */}
        <div className="relative z-10 flex-grow flex flex-col justify-center max-w-lg mt-10">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            RADIOLOGY <span className="text-[#00dfb6]">TB</span> SYSTEM
          </h1>
          <p className="text-sm text-white/80 mt-4 leading-relaxed font-medium">
            Sistem Informasi Radiologi untuk Skrining dan Pelaporan Tuberkulosis
          </p>
          <div className="w-16 h-1 bg-[#00dfb6] mt-6 rounded-full shadow-sm"></div>
        </div>

        {/* Placeholder to balance layout */}
        <div className="relative z-10 text-[10px] text-white/40 font-medium">
          Sistem Informasi Radiologi TB &copy; 2026
        </div>
      </div>

      {/* 2. Right Login Section */}
      <div className={`w-full lg:w-1/2 bg-slate-50 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 relative z-20 shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-800 cubic-bezier(0.4, 0, 0.2, 1) transform ${isSplitting ? 'translate-x-full opacity-0' : 'translate-x-0'}`}>
        <div className="w-full max-w-[440px] bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 relative">
          
          {/* Central Logo Circle */}
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto shadow-lg border border-slate-100 bg-white">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 text-center mt-5">Welcome Back!</h2>
          <p className="text-slate-400 text-xs text-center mt-1">Silakan masuk untuk mengakses sistem.</p>

          {error && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 mt-5">
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-rose-800 font-semibold">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            
            {/* Username Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="username">
                Email / Username
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0.5 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="Masukkan email atau username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1.5">
                <div className="absolute inset-y-0 left-0.5 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all bg-slate-50/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 inset-y-0 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-xs text-slate-500 font-semibold select-none cursor-pointer">
                Ingat saya
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#00475e] hover:bg-[#00384a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Masuk ke Sistem...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>© 2026 Radiology TB System. All rights reserved.</span>
        </div>
      </div>

    </div>
  );
}
