import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { format } from 'date-fns';

// Components
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import PermissionList from '../components/consent/PermissionList';
import DocumentViewer from '../components/common/DocumentViewer';
import CredentialCard from '../components/credentials/CredentialCard';

// Icons
import { FiClock, FiCheckCircle, FiX, FiAlertCircle, FiFileText, FiShield, FiKey } from 'react-icons/fi';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

// API and utils
import api from '../utils/api';
import { formatAddress, formatDate } from '../utils/format';

function ConsentDetailsPage() {
  const { id: consentIdOrStudyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contract, address } = useWeb3();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(null);
  const [study, setStudy] = useState(null);
  const [consentDocument, setConsentDocument] = useState(null);
  const [credential, setCredential] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [consentId, setConsentId] = useState(null);
  const [showingCredential, setShowingCredential] = useState(false);
  
  // Load consent data
  useEffect(() => {
    const fetchConsentDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First check if the ID is a study ID or consent ID
        let foundConsentId;
        
        try {
          // Try to get consent index from study ID and participant address
          const consentIdBigNum = await contract.consentIndex(
            ethers.BigNumber.from(consentIdOrStudyId),
            address
          );
          foundConsentId = consentIdBigNum.toNumber();
        } catch (error) {
          // If that fails, assume the ID is already a consent ID
          foundConsentId = parseInt(consentIdOrStudyId);
        }
        
        if (foundConsentId === 0) {
          throw new Error('Consent not found');
        }
        
        setConsentId(foundConsentId);
        
        // Get consent from blockchain
        const consentData = await contract.consents(foundConsentId);
        
        const statusMap = ['None', 'Pending', 'Granted', 'Revoked', 'Expired'];
        const consentStatus = statusMap[consentData.status];
        
        // Get study details
        const studyId = consentData.studyId.toNumber();
        const studyResponse = await api.get(`/api/studies/${studyId}`);
        
        setStudy(studyResponse.data);
        
        // Build consent object
        const consentObj = {
          id: foundConsentId,
          participant: consentData.participant,
          studyId: studyId,
          status: consentStatus,
          ipfsConsentDocHash: consentData.ipfsConsentDocHash,
          ipfsCredentialHash: consentData.ipfsCredentialHash,
          timestamp: new Date(consentData.timestamp.toNumber() * 1000),
          expirationDate: consentData.expirationDate.toNumber() > 0 
            ? new Date(consentData.expirationDate.toNumber() * 1000)
            : null
        };
        
        setConsent(consentObj);
        
        // Fetch consent document from IPFS
        const consentDocResponse = await api.get(`/api/ipfs/${consentData.ipfsConsentDocHash}`);
        setConsentDocument(consentDocResponse.data);
        
        // If consent is granted, fetch credential and permissions
        if (consentStatus === 'Granted' && consentData.ipfsCredentialHash) {
          try {
            const credentialResponse = await api.get(`/api/ipfs/${consentData.ipfsCredentialHash}`);
            setCredential(credentialResponse.data);
          } catch (error) {
            console.error('Error fetching credential:', error);
          }
          
          // TODO: Fetch permissions when backend support is available
          setPermissions([
            { key: 'share_demographics', label: 'Share Demographic Information', granted: true },
            { key: 'share_biometrics', label: 'Share Biometric Data', granted: true },
            { key: 'future_research', label: 'Use Data for Future Research', granted: false },
            { key: 'third_party', label: 'Share with Third Parties', granted: false },
          ]);
        }
      } catch (error) {
        console.error('Error fetching consent details:', error);
        setError('Failed to load consent details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (contract && address) {
      fetchConsentDetails();
    }
  }, [consentIdOrStudyId, contract, address]);
  
  // Grant consent
  const grantConsent = async () => {
    try {
      // Create and sign verifiable credential
      const response = await api.post(`/api/consents/${consentId}/grant`);
      
      const credentialCid = response.data.credentialCid;
      
      // Grant consent on blockchain
      const tx = await contract.grantConsent(consentId, credentialCid);
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success('Consent granted successfully!');
      window.location.reload(); // Reload to show updated state
    } catch (error) {
      console.error('Error granting consent:', error);
      toast.error('Failed to grant consent. Please try again.');
    }
  };
  
  // Revoke consent
  const revokeConsent = async () => {
    try {
      const tx = await contract.revokeConsent(consentId);
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success('Consent revoked successfully!');
      window.location.reload(); // Reload to show updated state
    } catch (error) {
      console.error('Error revoking consent:', error);
      toast.error('Failed to revoke consent. Please try again.');
    }
  };
  
  // Update permission
  const updatePermission = async (key, granted) => {
    try {
      const tx = await contract.updateSpecificPermission(consentId, key, granted);
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success(`Permission ${granted ? 'granted' : 'revoked'} successfully!`);
      
      // Update local state
      setPermissions(prev => 
        prev.map(p => p.key === key ? { ...p, granted } : p)
      );
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission. Please try again.');
    }
  };
  
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!consent || !study) return <ErrorMessage message="Consent not found" />;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Consent Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-sm text-gray-500 mb-1">Study</div>
            <h1 className="text-2xl font-bold mb-2">{study.title}</h1>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-semibold ${
            consent.status === 'Granted' ? 'bg-green-100 text-green-800' :
            consent.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
            consent.status === 'Revoked' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {consent.status}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-blue-100 rounded-full">
              <FiFileText className="text-blue-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Requested</div>
              <div>{format(consent.timestamp, 'MMM d, yyyy')}</div>
            </div>
          </div>
          
          {consent.expirationDate && (
            <div className="flex items-center">
              <div className="mr-3 p-2 bg-orange-100 rounded-full">
                <FiClock className="text-orange-700" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Expires</div>
                <div>{format(consent.expirationDate, 'MMM d, yyyy')}</div>
              </div>
            </div>
          )}
          
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-purple-100 rounded-full">
              <FiKey className="text-purple-700" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Consent ID</div>
              <div>{consentId}</div>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="mt-6 flex space-x-3">
          {consent.status === 'Pending' && (
            <>
              <button 
                className="btn btn-primary"
                onClick={grantConsent}
              >
                <FiCheckCircle className="mr-2" />
                Grant Consent
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => navigate(`/studies/${consent.studyId}`)}
              >
                Back to Study
              </button>
            </>
          )}
          
          {consent.status === 'Granted' && (
            <>
              <button 
                className="btn btn-error"
                onClick={revokeConsent}
              >
                <FiX className="mr-2" />
                Revoke Consent
              </button>
              {credential && (
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowingCredential(!showingCredential)}
                >
                  <FiShield className="mr-2" />
                  {showingCredential ? 'Hide Credential' : 'View Credential'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Consent Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Consent Document */}
        <div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Consent Document</h2>
            {consentDocument && (
              <DocumentViewer document={consentDocument} />
            )}
          </div>
        </div>
        
        {/* Right column - Permissions & Credential */}
        <div>
          {/* Permissions Section */}
          {consent.status === 'Granted' && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Data Permissions</h2>
              <PermissionList 
                permissions={permissions}
                onUpdate={updatePermission}
                readonly={consent.status !== 'Granted'}
              />
            </div>
          )}
          
          {/* Credential Section */}
          {showingCredential && credential && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Verifiable Credential</h2>
              <CredentialCard credential={credential} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsentDetailsPage;