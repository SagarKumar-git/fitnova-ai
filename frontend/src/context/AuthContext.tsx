import { API_BASE_URL } from "../config";
import React, { createContext, useContext, useState, useEffect } from 'react';
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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirm_password: string, role?: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<Profile | null>;
  updateProfile: (profileData: Omit<Profile, 'profile_id' | 'user_id' | 'created_at'>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get token helper
  const getToken = () => localStorage.getItem('fitnova_token');

  // Verify authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Try fetching profile or basic health check with token
        // In FastAPI we protect profile reads
        const response = await fetch(`${API_BASE_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
          
          // Let's deduce user from localStorage or make a call. 
          // Since we stored user details on login, let's load it from localStorage.
          const storedUser = localStorage.getItem('fitnova_user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Sync with profile check
            parsedUser.has_profile = true;
            setUser(parsedUser);
          }
        } else {
          // If profile fetch fails (e.g. 404 meaning user exists but profile isn't setup),
          // check if user details exist in localStorage
          const storedUser = localStorage.getItem('fitnova_user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // Token expired or invalid
            logout();
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        // On network error, retain cached user if present
        const storedUser = localStorage.getItem('fitnova_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('fitnova_token', data.access_token);
      localStorage.setItem('fitnova_user', JSON.stringify(data.user));
      setUser(data.user);
      
      // Auto fetch profile if it exists
      if (data.user.has_profile) {
        try {
          const profileResp = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          if (profileResp.ok) {
            const profileData = await profileResp.json();
            setProfile(profileData);
          }
        } catch (e) {
          console.error("Failed to load profile after login", e);
        }
      } else {
        setProfile(null);
      }
    } catch (error) {
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, confirm_password: string, role: string = "user") => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirm_password, role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }
      
      // Registration successful! We don't automatically log in here according to standard APIs
      // or we can auto-login if registration returns a token. Since registration returns UserResponse
      // (not Token), the flow is: register -> redirect to login, or we can login them immediately.
      // The register route returns UserResponse, so the register page will trigger login immediately
      // or redirect to Login page. Let's make it redirect to login with a success message!
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fitnova_token');
    localStorage.removeItem('fitnova_user');
    setUser(null);
    setProfile(null);
  };

  const fetchProfile = async (): Promise<Profile | null> => {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
    return null;
  };

  const updateProfile = async (profileData: Omit<Profile, 'profile_id' | 'user_id' | 'created_at'>) => {
    const token = getToken();
    if (!token) throw new Error("No authentication token");

    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update profile');
    }

    const updatedProfile = await response.json();
    setProfile(updatedProfile);
    
    // Update local user details as profile is now completed
    if (user) {
      const updatedUser = { ...user, has_profile: true };
      localStorage.setItem('fitnova_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;
    // Simple mock refresh or load profile to ensure status matches
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
        login,
        register,
        logout,
        fetchProfile,
        updateProfile,
        refreshUser
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
