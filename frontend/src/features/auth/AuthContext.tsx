import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../../services/api';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  mfa_enabled: boolean;
  roles: string[];
  permissions: string[];
}

export interface Tenant {
  id: string;
  name: string;
  trading_name?: string;
  kra_pin?: string;
  email: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
      const tenantData = await apiRequest<Tenant>('/tenants/me');
      setTenant(tenantData);
    } catch {
      setUser(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, totpCode?: string) => {
    const data = await apiRequest<{
      access_token?: string;
      refresh_token?: string;
      mfa_required: boolean;
      temp_token?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, totp_code: totpCode }),
    });

    if (data.mfa_required) {
      return data;
    }

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchProfile();
    }
    return data;
  };

  const register = async (payload: any) => {
    const data = await apiRequest<{
      access_token: string;
      refresh_token: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    await fetchProfile();
    return data;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isLoading,
        login,
        register,
        logout,
        refreshUser: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
