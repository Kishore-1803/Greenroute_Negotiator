import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to login');
      }

      const data = await res.json();
      
      login(data.access_token, {
        id: data.user.id,
        name: data.user.name,
        personalityTag: data.user.personality_tag,
        location: data.user.location,
        memberSince: 'Today',
        sustainabilityStatus: { level: 'SUSTAINABILITY STATUS', title: 'Level 1 Green Starter' },
        preferredModes: (data.user.preferred_modes || []).map((m: string) => ({ id: m, label: m, icon: m === 'car' ? '🚗' : m === 'two_wheeler' ? '⚡' : '🚲' })),
        stats: { avoidedCo2Kg: 0, costSavedInr: 0, lowCarbonRatePercent: 0, totalJourneys: 0, greenChoices: 0, treesEquivalent: 0, vehicleTripsPrevented: 0 }
      });
      
      navigate('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col justify-center">
      <div className="bg-black/40 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-[#8EE074]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p className="text-white/70 mt-2 text-sm">Sign in to continue your green journey.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Email or Phone Number</label>
            <input 
              type="text" 
              required 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#8EE074]/50 transition-all"
              placeholder="Enter your email or phone number"
            />
          </div>
          
          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#8EE074]/50 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/80 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 w-full bg-gradient-to-r from-[#8EE074] to-emerald-400 text-slate-900 font-bold text-lg rounded-xl px-4 py-3 shadow-[0_0_20px_rgba(142,224,116,0.3)] hover:shadow-[0_0_30px_rgba(142,224,116,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-white/60 relative z-10">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#8EE074] font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
