import { API_BASE_URL } from "../config";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  has_profile: boolean;
}

export interface Profile {
  profile_id: string;
  user_id: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  experience_level: string;
  activity_level: string;
  workout_days_per_week: number;
  gym_access: boolean;
  target_weight: number;
  current_body_fat: number | null;
  target_body_fat: number | null;
  goal_deadline: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirm_password: string, role?: string) => Promise<void>;
  logout: (expired?: boolean) => void;
  fetchProfile: () => Promise<Profile | null>;
  updateProfile: (profileData: Omit<Profile, 'profile_id' | 'user_id' | 'created_at'>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearSessionExpired: () => void;
  /** Centralized fetch wrapper — auto-attaches Bearer token and handles 401/403 globally */
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// JWT helpers — pure functions, no side effects
// ---------------------------------------------------------------------------

/**
 * Decodes the payload of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Returns true if the JWT is expired or cannot be parsed.
 * Adds a 30-second clock-skew buffer (expire 30 seconds early to avoid
 * making requests with a token that is about to expire).
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Expire the token 30 seconds early to prevent near-expiry failures
  return payload.exp < nowSeconds + 30;
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  // Prevent duplicate expiry events (e.g. multiple concurrent 401s)
  const expiredFired = useRef(false);

  // Get token helper
  const getToken = () => localStorage.getItem('fitnova_token');

  // ---------------------------------------------------------------------------
  // logout — clears all local state and storage
  // ---------------------------------------------------------------------------
  const logout = useCallback((expired = false) => {
    localStorage.removeItem('fitnova_token');
    localStorage.removeItem('fitnova_user');
    setUser(null);
    setProfile(null);
    if (expired && !expiredFired.current) {
      expiredFired.current = true;
      setSessionExpired(true);
    }
  }, []);

  const clearSessionExpired = useCallback(() => {
    setSessionExpired(false);
    expiredFired.current = false;
  }, []);

  // ---------------------------------------------------------------------------
  // handleAuthError — called whenever a backend response is 401/403
  // Detects whether it's an expired token and fires the correct logout path.
  // ---------------------------------------------------------------------------
  const handleAuthError = useCallback((status: number, token: string | null) => {
    if (status === 401 || status === 403) {
      const expired = token ? isTokenExpired(token) : true;
      logout(expired);
      return true; // signal: auth error handled
    }
    return false;
  }, [logout]);

  // ---------------------------------------------------------------------------
  // apiFetch — drop-in fetch wrapper that auto-handles auth errors globally
  // ---------------------------------------------------------------------------
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = getToken();

      // Pre-flight: if we have a token that is already expired, bail immediately
      if (token && isTokenExpired(token)) {
        logout(true);
        // Return a synthetic 401 so callers can react without crashing
        return new Response(JSON.stringify({ detail: 'Token expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { ...options, headers });

      // Post-flight: handle 401/403 from backend
      if (response.status === 401 || response.status === 403) {
        handleAuthError(response.status, token);
      }

      return response;
    },
    [logout, handleAuthError]
  );

  // ---------------------------------------------------------------------------
  // Verify authentication on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Immediately check local expiry before hitting the network
      if (isTokenExpired(token)) {
        logout(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch(`${API_BASE_URL}/profile`);

        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);

          const storedUser = localStorage.getItem('fitnova_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.has_profile = true;
            setUser(parsedUser);
          }
        } else if (response.status === 401 || response.status === 403) {
          // handleAuthError already called inside apiFetch — nothing extra needed
        } else {
          // 404 = no profile yet; user exists but hasn't set up profile
          const storedUser = localStorage.getItem('fitnova_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            logout(false);
          }
        }
      } catch (err) {
        console.error('Auth initialization failed (network error):', err);
        // On network error, retain cached user if present — don't force logout
        const storedUser = localStorage.getItem('fitnova_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // login
  // ---------------------------------------------------------------------------
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    clearSessionExpired();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = 'Login failed. Please check your credentials.';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Response body not JSON-parseable
        }
        throw new Error(message);
      }

      const data = await response.json();
      localStorage.setItem('fitnova_token', data.access_token);
      localStorage.setItem('fitnova_user', JSON.stringify(data.user));
      setUser(data.user);
      expiredFired.current = false;

      // Auto fetch profile if it exists
      if (data.user.has_profile) {
        try {
          const profileResp = await apiFetch(`${API_BASE_URL}/profile`);
          if (profileResp.ok) {
            const profileData = await profileResp.json();
            setProfile(profileData);
          }
        } catch (e) {
          console.error('Failed to load profile after login', e);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      logout(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // register
  // ---------------------------------------------------------------------------
  const register = async (
    name: string,
    email: string,
    password: string,
    confirm_password: string,
    role: string = 'user'
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirm_password, role }),
      });

      if (!response.ok) {
        let message = 'Registration failed. Please try again.';
        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          // Response body not JSON-parseable
        }
        throw new Error(message);
      }
      // Registration returns UserResponse — caller redirects to /login
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // fetchProfile
  // ---------------------------------------------------------------------------
  const fetchProfile = async (): Promise<Profile | null> => {
    const token = getToken();
    if (!token) return null;

    if (isTokenExpired(token)) {
      logout(true);
      return null;
    }

    try {
      const response = await apiFetch(`${API_BASE_URL}/profile`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);

        // Update user has_profile status locally
        if (user && !user.has_profile) {
          const updatedUser = { ...user, has_profile: true };
          localStorage.setItem('fitnova_user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
        return profileData;
      } else if (response.status === 404) {
        setProfile(null);
      }
      // 401/403 handled inside apiFetch
    } catch (err) {
      console.error('Error fetching profile (network error):', err);
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // updateProfile
  // ---------------------------------------------------------------------------
  const updateProfile = async (
    profileData: Omit<Profile, 'profile_id' | 'user_id' | 'created_at'>
  ) => {
    const token = getToken();
    if (!token) throw new Error('No authentication token. Please log in again.');

    if (isTokenExpired(token)) {
      logout(true);
      throw new Error('Your session has expired. Please log in again.');
    }

    const response = await apiFetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      let message = 'Failed to update profile.';
      try {
        const errorData = await response.json();
        message = errorData.detail || message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const updatedProfile = await response.json();
    setProfile(updatedProfile);

    if (user) {
      const updatedUser = { ...user, has_profile: true };
      localStorage.setItem('fitnova_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  // ---------------------------------------------------------------------------
  // refreshUser
  // ---------------------------------------------------------------------------
  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;
    if (isTokenExpired(token)) {
      logout(true);
      return;
    }
    await fetchProfile();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoading,
        sessionExpired,
        login,
        register,
        logout,
        fetchProfile,
        updateProfile,
        refreshUser,
        clearSessionExpired,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
