import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { useWeb3 } from './Web3Context';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { provider, signer, address } = useWeb3();

  useEffect(() => {
    // Check if user is already logged in (JWT exists in localStorage)
    const checkAuth = async () => {
      const token = localStorage.getItem('bioProofToken');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Validate token by making a request to the backend
          const response = await api.get('/api/auth/verify');
          setCurrentUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token validation error:', error);
          // Token is invalid or expired, remove it
          localStorage.removeItem('bioProofToken');
          api.defaults.headers.common['Authorization'] = '';
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (isResearcher = false) => {
    try {
      if (!provider || !address) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);

      // Request a nonce from the server
      const nonceResponse = await api.post('/api/auth/nonce');
      const nonce = nonceResponse.data.nonce;

      // Sign the message with the wallet
      const message = `Login to BioProof with nonce: ${nonce}`;
      const signature = await signer.signMessage(message);

      // Send the signature to the backend
      const authResponse = await api.post('/api/auth/login', {
        walletAddress: address,
        signature,
        nonce,
        isResearcher
      });

      // Save the token
      const { token } = authResponse.data;
      localStorage.setItem('bioProofToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Set user data
      setCurrentUser({
        walletAddress: address,
        isResearcher
      });
      setIsAuthenticated(true);

      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bioProofToken');
    api.defaults.headers.common['Authorization'] = '';
    setCurrentUser(null);
    setIsAuthenticated(false);
    toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const response = await api.put('/api/users/profile', profileData);
      setCurrentUser(prev => ({ ...prev, ...response.data }));
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user: currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}