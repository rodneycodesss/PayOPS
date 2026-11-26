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
  isTestAccount: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<any>;
  demoLogin: () => Promise<any>;
  verifyLogin2fa: (tempToken: string, code: string) => Promise<any>;
  resendLogin2fa: (tempToken: string) => Promise<any>;
  requestMagicLink: (email: string) => Promise<{ message: string; email: string; expires_in: number; dev_link?: string }>;
  verifyEmailLink: (token: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  requestRegisterOtp: (payload: any) => Promise<any>;
  resendRegisterOtp: (email: string) => Promise<any>;
  verifyRegisterOtp: (email: string, code: string) => Promise<any>;
  enable2FA: () => Promise<any>;
  disable2FA: () => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('user_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    try {
      const cached = localStorage.getItem('tenant_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(!user);

  const fetchProfile = async () => {
    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
      localStorage.setItem('user_profile', JSON.stringify(userData));
      const tenantData = await apiRequest<Tenant>('/tenants/me');
      setTenant(tenantData);
      localStorage.setItem('tenant_profile', JSON.stringify(tenantData));
    } catch {
      setUser(null);
      setTenant(null);
      localStorage.removeItem('user_profile');
      localStorage.removeItem('tenant_profile');
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
      delivery_channel?: string;
      dev_otp?: string;
      dev_link?: string;
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

  const demoLogin = async () => {
    const data = await apiRequest<{
      access_token: string;
      refresh_token: string;
    }>('/auth/demo-login', {
      method: 'POST',
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchProfile();
    }
    return data;
  };

  const verifyLogin2fa = async (tempToken: string, code: string) => {
    const data = await apiRequest<{
      access_token: string;
      refresh_token: string;
    }>('/auth/login/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken, code }),
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchProfile();
    }
    return data;
  };

  const resendLogin2fa = async (tempToken: string) => {
    return await apiRequest<{ message: string; dev_otp?: string; dev_link?: string }>('/auth/login/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ temp_token: tempToken }),
    });
  };

  const requestMagicLink = async (email: string) => {
    return await apiRequest<{
      message: string;
      email: string;
      expires_in: number;
      dev_link?: string;
    }>('/auth/magic-link/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const verifyEmailLink = async (token: string) => {
    const data = await apiRequest<{
      access_token: string;
      refresh_token: string;
    }>('/auth/verify-email-link', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

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

  const requestRegisterOtp = async (payload: any) => {
    return await apiRequest<{
      message: string;
      email: string;
      expires_in: number;
      dev_otp?: string;
    }>('/auth/register/request-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const resendRegisterOtp = async (email: string) => {
    return await apiRequest<{
      message: string;
      email: string;
      expires_in: number;
      dev_otp?: string;
    }>('/auth/register/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const verifyRegisterOtp = async (email: string, code: string) => {
    const data = await apiRequest<{
      access_token: string;
      refresh_token: string;
    }>('/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    if (data.access_token && data.refresh_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      await fetchProfile();
    }
    return data;
  };

  const enable2FA = async () => {
    const res = await apiRequest<{ message: string }>('/auth/mfa/enable-email', {
      method: 'POST',
    });
    await fetchProfile();
    return res;
  };

  const disable2FA = async () => {
    const res = await apiRequest<{ message: string }>('/auth/mfa/disable', {
      method: 'POST',
    });
    await fetchProfile();
    return res;
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
    localStorage.removeItem('user_profile');
    localStorage.removeItem('tenant_profile');
    setUser(null);
    setTenant(null);
  };

  const isTestAccount = user?.email === 'rodney@rodstartechdevs.co.ke';

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isLoading,
        isTestAccount,
        login,
        demoLogin,
        verifyLogin2fa,
        resendLogin2fa,
        requestMagicLink,
        verifyEmailLink,
        register,
        requestRegisterOtp,
        resendRegisterOtp,
        verifyRegisterOtp,
        enable2FA,
        disable2FA,
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
