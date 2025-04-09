import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import BioProofConsentABI from '../contracts/BioProofConsent.json';
import { CONTRACT_ADDRESS } from '../config';

const Web3Context = createContext();

export function useWeb3() {
  return useContext(Web3Context);
}

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [contract, setContract] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Initialize Web3
  const initWeb3 = async () => {
    try {
      setLoading(true);
      
      // Check if MetaMask is installed
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(provider);
        
        // Request accounts access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setAddress(address);
        
        // Get network ID
        const network = await provider.getNetwork();
        setNetworkId(network.chainId);
        
        // Get signer
        const signer = provider.getSigner();
        setSigner(signer);
        
        // Initialize contract
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BioProofConsentABI.abi,
          signer
        );
        setContract(contract);
        
        setConnected(true);
        
        // Setup event listeners for MetaMask
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
      } else {
        toast.error('Please install MetaMask to use this application');
      }
    } catch (error) {
      console.error('Web3 initialization error:', error);
      toast.error('Failed to connect to MetaMask');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      setConnected(false);
      setAddress(null);
      setSigner(null);
      setContract(null);
      toast.info('Please connect to MetaMask');
    } else if (accounts[0] !== address) {
      // User has switched accounts
      setAddress(accounts[0]);
      if (provider) {
        const signer = provider.getSigner();
        setSigner(signer);
        
        // Re-initialize contract with new signer
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BioProofConsentABI.abi,
          signer
        );
        setContract(contract);
      }
      toast.info('Account changed');
    }
  };

  const handleChainChanged = (chainId) => {
    // Page reload is recommended by MetaMask on chain change
    window.location.reload();
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAddress(null);
    setSigner(null);
    setContract(null);
    toast.info('Disconnected from MetaMask');
  };

  const connectWallet = async () => {
    try {
      await initWeb3();
      return true;
    } catch (error) {
      console.error('Connect wallet error:', error);
      toast.error('Failed to connect wallet');
      return false;
    }
  };

  // Helper function to check if network is correct
  const isCorrectNetwork = () => {
    // Replace with your target network ID (e.g., 1 for Ethereum Mainnet, 5 for Goerli, etc.)
    const targetNetworkId = process.env.REACT_APP_NETWORK_ID || 5;
    return networkId === parseInt(targetNetworkId);
  };

  // Function to switch network
  const switchNetwork = async () => {
    try {
      const targetNetworkId = process.env.REACT_APP_NETWORK_ID || 5;
      let targetNetworkParams;
      
      // Define network parameters based on the target network
      switch (parseInt(targetNetworkId)) {
        case 1:
          targetNetworkParams = {
            chainId: '0x1', // Ethereum Mainnet
          };
          break;
        case 5:
          targetNetworkParams = {
            chainId: '0x5', // Goerli Testnet
          };
          break;
        case 80001:
          targetNetworkParams = {
            chainId: '0x13881', // Mumbai Testnet
            chainName: 'Polygon Mumbai Testnet',
            nativeCurrency: {
              name: 'MATIC',
              symbol: 'MATIC',
              decimals: 18
            },
            rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
            blockExplorerUrls: ['https://mumbai.polygonscan.com/']
          };
          break;
        default:
          targetNetworkParams = {
            chainId: '0x5', // Default to Goerli
          };
      }
      
      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetNetworkParams.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [targetNetworkParams],
          });
        } else {
          throw switchError;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Network switch error:', error);
      toast.error('Failed to switch network');
      return false;
    }
  };

  useEffect(() => {
    // Check if user has previously connected
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            // User has previously allowed account access
            await initWeb3();
          }
        } catch (error) {
          console.error('Connection check error:', error);
        }
      }
      setLoading(false);
    };

    checkConnection();

    return () => {
      // Clean up event listeners when component unmounts
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  const value = {
    provider,
    signer,
    address,
    contract,
    networkId,
    loading,
    connected,
    connectWallet,
    isCorrectNetwork,
    switchNetwork
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}