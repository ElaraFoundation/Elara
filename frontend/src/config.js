/**
 * Global configuration settings for BioProof frontend
 */

// Smart contract address
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x123456789abcdef123456789abcdef123456789';

// Network configuration
export const NETWORK_CONFIG = {
  mainnet: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/your-infura-id'],
    blockExplorerUrls: ['https://etherscan.io']
  },
  goerli: {
    chainId: '0x5',
    chainName: 'Goerli Testnet',
    nativeCurrency: {
      name: 'Goerli Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://goerli.infura.io/v3/your-infura-id'],
    blockExplorerUrls: ['https://goerli.etherscan.io']
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com']
  },
  mumbai: {
    chainId: '0x13881',
    chainName: 'Polygon Mumbai Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com']
  }
};

// Default network to use
export const DEFAULT_NETWORK = process.env.REACT_APP_DEFAULT_NETWORK || 'goerli';

// IPFS gateway URL
export const IPFS_GATEWAY = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';

// API base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Default pagination settings
export const PAGINATION = {
  itemsPerPage: 10,
  maxPagesDisplayed: 5
};

// Validation constants
export const VALIDATION = {
  addressRegex: /^0x[a-fA-F0-9]{40}$/,
  nameMaxLength: 100,
  descriptionMaxLength: 1000
};

// Biometric data types
export const BIOMETRIC_DATA_TYPES = [
  {
    id: 'fingerprint',
    name: 'Fingerprint',
    description: 'Fingerprint scan data',
    sensitivity: 'high'
  },
  {
    id: 'dna',
    name: 'DNA',
    description: 'Genetic data samples',
    sensitivity: 'critical'
  },
  {
    id: 'facial',
    name: 'Facial Recognition',
    description: 'Facial structure and feature data',
    sensitivity: 'high'
  },
  {
    id: 'retina',
    name: 'Retina Scan',
    description: 'Retinal pattern data',
    sensitivity: 'high'
  },
  {
    id: 'voice',
    name: 'Voice',
    description: 'Voice pattern recordings',
    sensitivity: 'medium'
  },
  {
    id: 'gait',
    name: 'Gait Analysis',
    description: 'Walking pattern data',
    sensitivity: 'medium'
  },
  {
    id: 'heartrate',
    name: 'Heart Rate',
    description: 'Cardiac rhythm data',
    sensitivity: 'medium'
  },
  {
    id: 'brainwave',
    name: 'Brainwave',
    description: 'EEG data',
    sensitivity: 'critical'
  },
  {
    id: 'bloodsample',
    name: 'Blood Sample',
    description: 'Blood analysis data',
    sensitivity: 'high'
  }
];

// Consent status colors
export const CONSENT_STATUS_COLORS = {
  Granted: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: 'text-green-500'
  },
  Pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: 'text-yellow-500'
  },
  Revoked: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: 'text-red-500'
  },
  Expired: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: 'text-gray-500'
  },
  None: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: 'text-blue-500'
  }
};

// Permission types for consent
export const PERMISSION_TYPES = [
  {
    key: 'share_demographics',
    label: 'Share Demographic Information',
    description: 'Allow sharing of basic demographic information with researchers'
  },
  {
    key: 'share_biometrics',
    label: 'Share Biometric Data',
    description: 'Allow sharing of collected biometric data with the study team'
  },
  {
    key: 'future_research',
    label: 'Use for Future Research',
    description: 'Allow data to be used in future related research projects'
  },
  {
    key: 'third_party',
    label: 'Share with Third Parties',
    description: 'Allow data to be shared with third-party researchers or organizations'
  },
  {
    key: 'commercial_use',
    label: 'Commercial Applications',
    description: 'Allow data to be used in commercial applications or products'
  },
  {
    key: 'store_samples',
    label: 'Store Physical Samples',
    description: 'Allow physical biometric samples to be stored for future use'
  }
];

// Study types
export const STUDY_TYPES = [
  'Clinical Trial',
  'Observational Study',
  'Survey Research',
  'Longitudinal Study',
  'Cross-sectional Study',
  'Case Study',
  'Experimental Study',
  'Pilot Study',
  'Meta-analysis'
];

// Organization types
export const ORGANIZATION_TYPES = [
  'Academic Institution',
  'Hospital/Medical Center',
  'Government Agency',
  'Research Institute',
  'Pharmaceutical Company',
  'Biotech Company',
  'Non-profit Organization',
  'Private Laboratory'
];

// Date format options
export const DATE_FORMATS = {
  short: 'MMM d, yyyy',
  long: 'MMMM d, yyyy',
  withTime: 'MMM d, yyyy h:mm a',
  iso: 'yyyy-MM-dd'
};

export default {
  CONTRACT_ADDRESS,
  NETWORK_CONFIG,
  DEFAULT_NETWORK,
  IPFS_GATEWAY,
  API_BASE_URL,
  PAGINATION,
  VALIDATION,
  BIOMETRIC_DATA_TYPES,
  CONSENT_STATUS_COLORS,
  PERMISSION_TYPES,
  STUDY_TYPES,
  ORGANIZATION_TYPES,
  DATE_FORMATS
};