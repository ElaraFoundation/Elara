import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ethers } from 'ethers';

// Components
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import ParticipantTable from '../components/studies/ParticipantTable';
import ConsentRequestForm from '../components/consent/ConsentRequestForm';
import ConsentDetailsCard from '../components/consent/ConsentDetailsCard';
import BiometricDataTable from '../components/studies/BiometricDataTable';
import StudyMetadataCard from '../components/studies/StudyMetadataCard';

// Icons
import { FiUsers, FiCheckCircle, FiAlertCircle, FiClock, FiEdit, FiTrash2, FiX } from 'react-icons/fi';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

// API and utils
import api from '../utils/api';
import { formatAddress } from '../utils/format';

function StudyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contract, address } = useWeb3();
  
  const [study, setStudy] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userConsentStatus, setUserConsentStatus] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Load study data
  useEffect(() => {
    const fetchStudyDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get study from blockchain/backend
        const response = await api.get(`/api/studies/${id}`);
        const studyData = response.data;
        
        setStudy(studyData);
        setMetadata(studyData.metadata);
        setIsOwner(studyData.owner.toLowerCase() === address?.toLowerCase());
        
        // Get participants if user is the owner
        if (studyData.owner.toLowerCase() === address?.toLowerCase()) {
          const participantsResponse = await api.get(`/api/consents/study/${id}`);
          setParticipants(participantsResponse.data);
        }
        
        // Check user's consent status if not owner
        if (address && studyData.owner.toLowerCase() !== address.toLowerCase()) {
          try {
            const consentStatus = await contract.getConsentStatus(
              ethers.BigNumber.from(id),
              address
            );
            
            const statusMap = ['None', 'Pending', 'Granted', 'Revoked', 'Expired'];
            setUserConsentStatus(statusMap[consentStatus]);
          } catch (error) {
            console.error('Error fetching consent status:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching study details:', error);
        setError('Failed to load study details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (contract && address) {
      fetchStudyDetails();
    }
  }, [id, contract, address, refreshTrigger]);
  
  // Update study status
  const updateStudyStatus = async (active) => {
    try {
      if (!isOwner) return;
      
      const tx = await contract.setStudyActive(
        ethers.BigNumber.from(id),
        active
      );
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success(`Study ${active ? 'activated' : 'deactivated'} successfully!`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error updating study status:', error);
      toast.error('Failed to update study status. Please try again.');
    }
  };
  
  // Request participation
  const requestParticipation = async () => {
    // Navigate to consent page
    navigate(`/studies/${id}/consent`);
  };
  
  // Handle consent request form submission
  const handleConsentRequest = async (formData) => {
    try {
      const { participant, expirationDate, consentDocument } = formData;
      
      // Upload consent document to IPFS
      const ipfsResponse = await api.post('/api/ipfs/upload', {
        content: consentDocument
      });
      
      const docCid = ipfsResponse.data.cid;
      
      // Convert expiration date to unix timestamp if provided
      let expirationTimestamp = 0;
      if (expirationDate) {
        expirationTimestamp = Math.floor(new Date(expirationDate).getTime() / 1000);
      }
      
      // Request consent on blockchain
      const tx = await contract.requestConsent(
        ethers.BigNumber.from(id),
        participant,
        docCid,
        expirationTimestamp
      );
      
      toast.info('Transaction submitted. Waiting for confirmation...');
      
      await tx.wait();
      
      toast.success('Consent request sent successfully!');
      setShowRequestForm(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error requesting consent:', error);
      toast.error('Failed to send consent request. Please try again.');
    }
  };
  
  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!study) return <ErrorMessage message="Study not found" />;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Study Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{study.title}</h1>
            <p className="text-gray-600 mb-4">{study.description}</p>
            <div className="flex items-center text-gray-500 mb-2">
              <span className="mr-2">Owner:</span>
              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                {formatAddress(study.owner)}
              </span>
            </div>
            <div className="flex items-center text-gray-500 mb-2">
              <span className="mr-2">Created:</span>
              <span>{format(new Date(study.creationDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                study.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {study.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {isOwner && (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/studies/${id}/edit`)}
                >
                  <FiEdit className="mr-1" />
                  Edit
                </button>
                
                <button
                  className={`btn btn-sm ${study.active ? 'btn-error' : 'btn-success'}`}
                  onClick={() => updateStudyStatus(!study.active)}
                >
                  {study.active ? (
                    <>
                      <FiX className="mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="mr-1" />
                      Activate
                    </>
                  )}
                </button>
              </>
            )}
            
            {!isOwner && userConsentStatus === 'None' && study.active && (
              <button
                className="btn btn-primary btn-sm"
                onClick={requestParticipation}
              >
                Request Participation
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Study Content Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Study details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Study Details</h2>
            <div className="space-y-4">
              {/* Study Metadata */}
              {metadata && (
                <StudyMetadataCard metadata={metadata} />
              )}
              
              {/* Biometric Data Types */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Biometric Data Collection</h3>
                <BiometricDataTable 
                  biometricData={metadata?.biometricData || []} 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Right column - Participants/Consent */}
        <div className="lg:col-span-1">
          {/* Participants Section (for study owner) */}
          {isOwner && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Participants</h2>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowRequestForm(true)}
                >
                  Request Consent
                </button>
              </div>
              
              {/* Participants Summary */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {participants.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {participants.filter(p => p.status === 'Granted').length}
                  </div>
                  <div className="text-sm text-gray-600">Consented</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {participants.filter(p => p.status === 'Pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
              
              {/* Participants Table */}
              <ParticipantTable participants={participants} studyId={id} />
              
              {/* Consent Request Modal */}
              {showRequestForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                    <h3 className="text-xl font-semibold mb-4">Request Consent</h3>
                    <ConsentRequestForm 
                      onSubmit={handleConsentRequest}
                      onCancel={() => setShowRequestForm(false)}
                      studyId={id}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Participant's Consent Status (for participant) */}
          {!isOwner && userConsentStatus && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Consent Status</h2>
              
              <div className="mb-4">
                <div className={`px-4 py-3 rounded-lg ${
                  userConsentStatus === 'Granted' ? 'bg-green-100' :
                  userConsentStatus === 'Pending' ? 'bg-yellow-100' :
                  userConsentStatus === 'Revoked' ? 'bg-red-100' :
                  userConsentStatus === 'Expired' ? 'bg-gray-100' : 'bg-blue-100'
                }`}>
                  <div className="flex items-center">
                    {userConsentStatus === 'Granted' && <FiCheckCircle className="text-green-500 mr-2 text-xl" />}
                    {userConsentStatus === 'Pending' && <FiClock className="text-yellow-500 mr-2 text-xl" />}
                    {userConsentStatus === 'Revoked' && <FiX className="text-red-500 mr-2 text-xl" />}
                    {userConsentStatus === 'Expired' && <FiAlertCircle className="text-gray-500 mr-2 text-xl" />}
                    <div>
                      <div className="font-semibold">{userConsentStatus}</div>
                      <div className="text-sm">
                        {userConsentStatus === 'Granted' && "You have granted consent to this study"}
                        {userConsentStatus === 'Pending' && "Your consent is requested for this study"}
                        {userConsentStatus === 'Revoked' && "You have revoked your consent"}
                        {userConsentStatus === 'Expired' && "Your consent has expired"}
                        {userConsentStatus === 'None' && "You are not participating in this study"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {userConsentStatus === 'Pending' && (
                <div className="flex space-x-2">
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => navigate(`/consents/${id}`)}
                  >
                    Review Request
                  </button>
                </div>
              )}
              
              {userConsentStatus === 'Granted' && (
                <div className="flex space-x-2">
                  <button 
                    className="btn btn-outline btn-error btn-sm"
                    onClick={() => navigate(`/consents/${id}`)}
                  >
                    Manage Consent
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudyDetailsPage;