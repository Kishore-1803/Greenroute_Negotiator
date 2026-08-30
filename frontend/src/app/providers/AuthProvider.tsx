import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getToken, setToken, removeToken } from '@/lib/auth';
import type { UserProfile } from '@/pages/Profile/data/profileData';

// We map UserDTO to our frontend UserProfile
interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updatedProfile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/v1/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const profile: UserProfile = {
          id: data.user.id,
          name: data.user.name,
          personalityTag: data.user.personality_tag,
          location: data.user.location,
          memberSince: data.user.created_at ? new Date(data.user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Member',
          sustainabilityStatus: {
            level: 'SUSTAINABILITY STATUS',
            title: 'Level 1 Green Starter',
          },
          avatarUrl: data.user.avatar_url,
          preferredModes: data.user.preferred_modes.map((m: string) => ({
            id: m,
            label: m === 'two_wheeler' ? 'Two-Wheeler / EV' : m.charAt(0).toUpperCase() + m.slice(1),
            icon: m === 'car' ? '🚗' : m === 'two_wheeler' ? '⚡' : m === 'bus' ? '🚌' : m === 'metro' ? '🚇' : '🚲',
          })),
          stats: {
            avoidedCo2Kg: Number((data.impact.carbon_saved_g / 1000).toFixed(1)) || 0,
            costSavedInr: Math.round(data.impact.cost_saved_inr) || 0,
            lowCarbonRatePercent: data.impact.total_trips > 0 ? Math.round((data.impact.green_choices / data.impact.total_trips) * 100) : 0,
            totalJourneys: data.impact.total_trips || 0,
            greenChoices: data.impact.green_choices || 0,
            treesEquivalent: data.impact.trees_equivalent || 0,
            vehicleTripsPrevented: data.impact.vehicle_trips_prevented || 0,
          },
        };
        setUser(profile);
      } else {
        removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error("Auth initialization error:", error);
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = (token: string, userData: UserProfile) => {
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  const updateUser = (updatedProfile: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedProfile } : null));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
