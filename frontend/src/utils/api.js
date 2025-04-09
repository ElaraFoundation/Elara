import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bioProofToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle session expiration
    if (error.response && error.response.status === 401) {
      // Clear token if it exists
      if (localStorage.getItem('bioProofToken')) {
        localStorage.removeItem('bioProofToken');
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

// IPFS-related API functions
export const ipfsAPI = {
  // Upload JSON content to IPFS
  uploadJSON: async (content) => {
    const response = await api.post('/ipfs/upload', { content });
    return response.data.cid;
  },
  
  // Get content from IPFS by CID
  getFromIPFS: async (cid) => {
    const response = await api.get(`/ipfs/${cid}`);
    return response.data;
  }
};

// Study-related API functions
export const studyAPI = {
  // Get all studies
  getAll: async () => {
    const response = await api.get('/studies');
    return response.data;
  },
  
  // Get study by ID
  getById: async (id) => {
    const response = await api.get(`/studies/${id}`);
    return response.data;
  },
  
  // Create new study
  create: async (studyData) => {
    const response = await api.post('/studies', studyData);
    return response.data;
  },
  
  // Update study
  update: async (id, studyData) => {
    const response = await api.put(`/studies/${id}`, studyData);
    return response.data;
  }
};

// Consent-related API functions
export const consentAPI = {
  // Request consent from participant
  requestConsent: async (data) => {
    const response = await api.post('/consents/request', data);
    return response.data;
  },
  
  // Grant consent
  grantConsent: async (consentId) => {
    const response = await api.post(`/consents/${consentId}/grant`);
    return response.data;
  },
  
  // Revoke consent
  revokeConsent: async (consentId) => {
    const response = await api.post(`/consents/${consentId}/revoke`);
    return response.data;
  },
  
  // Update specific permission
  updatePermission: async (consentId, permissionKey, granted) => {
    const response = await api.post(`/consents/${consentId}/permissions`, {
      permissionKey,
      granted
    });
    return response.data;
  },
  
  // Get participant's consents
  getParticipantConsents: async (address) => {
    const response = await api.get(`/consents/participant/${address}`);
    return response.data;
  },
  
  // Get study's consents
  getStudyConsents: async (studyId) => {
    const response = await api.get(`/consents/study/${studyId}`);
    return response.data;
  }
};

// User-related API functions
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  
  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  }
};

// Authentication-related API functions
export const authAPI = {
  // Request nonce for authentication
  getNonce: async () => {
    const response = await api.post('/auth/nonce');
    return response.data.nonce;
  },
  
  // Login with signature
  login: async (walletAddress, signature, nonce, isResearcher = false) => {
    const response = await api.post('/auth/login', {
      walletAddress,
      signature,
      nonce,
      isResearcher
    });
    return response.data;
  },
  
  // Verify token validity
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  }
};

export default api;