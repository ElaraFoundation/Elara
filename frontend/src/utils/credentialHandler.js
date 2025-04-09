const { ethers } = require('ethers');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Credential Handler Utility
 * Manages creation and verification of Verifiable Credentials for biometric consent
 */
class CredentialHandler {
  constructor() {
    // Initialize with empty wallet and load from env if available
    this.wallet = null;
    this.issuerDid = null;
    this.init();
  }

  /**
   * Initialize the handler with environment variables
   */
  init() {
    try {
      // If private key is provided in env, initialize wallet
      if (process.env.ISSUER_PRIVATE_KEY) {
        this.wallet = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY);
        this.issuerDid = process.env.ISSUER_DID || `did:ethr:${this.wallet.address}`;
      }
    } catch (error) {
      console.error('Error initializing CredentialHandler:', error);
    }
  }

  /**
   * Create a verifiable credential for biometric consent
   * @param {string} participantAddress - Ethereum address of the participant
   * @param {number} consentId - ID of the consent record
   * @param {number} studyId - ID of the research study
   * @param {Object} additionalData - Additional data to include in the credential
   * @returns {Object} Verifiable credential object
   */
  async createConsentCredential(participantAddress, consentId, studyId, additionalData = {}) {
    if (!this.wallet) {
      throw new Error('Credential issuer not initialized');
    }

    // Ensure addresses are checksummed
    const normalizedParticipantAddress = ethers.utils.getAddress(participantAddress);
    
    // Generate credential ID as UUID
    const credentialId = `urn:uuid:${uuidv4()}`;
    
    // Current timestamp in ISO format
    const timestamp = new Date().toISOString();
    
    // Create credential object
    const credential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://schema.org',
        'https://bioproof.io/credentials/v1'
      ],
      id: credentialId,
      type: ['VerifiableCredential', 'BiometricConsentCredential'],
      issuer: this.issuerDid,
      issuanceDate: timestamp,
      expirationDate: additionalData.expirationDate || undefined,
      credentialSubject: {
        id: `did:ethr:${normalizedParticipantAddress}`,
        type: 'BiometricConsent',
        consentId: consentId.toString(),
        studyId: studyId.toString(),
        grantedAt: timestamp,
        ...additionalData
      }
    };
    
    // Create and add proof
    const proof = await this._createProof(credential);
    credential.proof = proof;
    
    return credential;
  }

  /**
   * Create a JWT-based verifiable credential
   * @param {string} participantAddress - Ethereum address of the participant
   * @param {number} consentId - ID of the consent record
   * @param {number} studyId - ID of the research study
   * @param {Object} additionalData - Additional data to include in the credential
   * @returns {string} JWT token containing the verifiable credential
   */
  async createJwtCredential(participantAddress, consentId, studyId, additionalData = {}) {
    if (!this.wallet || !process.env.JWT_SECRET) {
      throw new Error('JWT credential issuer not initialized');
    }
    
    // Credential data
    const credentialData = {
      sub: `did:ethr:${ethers.utils.getAddress(participantAddress)}`,
      iss: this.issuerDid,
      iat: Math.floor(Date.now() / 1000),
      nbf: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
      vc: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://bioproof.io/credentials/v1'
        ],
        type: ['VerifiableCredential', 'BiometricConsentCredential'],
        credentialSubject: {
          type: 'BiometricConsent',
          consentId: consentId.toString(),
          studyId: studyId.toString(),
          grantedAt: new Date().toISOString(),
          ...additionalData
        }
      }
    };
    
    // Add expiration if provided
    if (additionalData.expirationDate) {
      const expirationTimestamp = new Date(additionalData.expirationDate).getTime() / 1000;
      credentialData.exp = Math.floor(expirationTimestamp);
    }
    
    // Sign with JWT
    const token = jwt.sign(credentialData, process.env.JWT_SECRET, {
      algorithm: 'HS256'
    });
    
    return token;
  }

  /**
   * Verify a credential's proof
   * @param {Object} credential - Verifiable credential to verify
   * @returns {boolean} Whether the credential is valid
   */
  async verifyCredential(credential) {
    try {
      // Check if credential has a proof
      if (!credential.proof) {
        return false;
      }
      
      // For JWT-based credentials
      if (credential.proof.type === 'JwtProof2020') {
        return await this._verifyJwtProof(credential);
      }
      
      // For Ethereum signature-based credentials
      if (credential.proof.type === 'EcdsaSecp256k1Signature2019') {
        return await this._verifyEthereumSignature(credential);
      }
      
      // Unknown proof type
      return false;
    } catch (error) {
      console.error('Error verifying credential:', error);
      return false;
    }
  }

  /**
   * Verify a JWT credential
   * @param {string} token - JWT token to verify
   * @returns {Object|null} Decoded credential or null if invalid
   */
  verifyJwtCredential(token) {
    try {
      // Verify and decode JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if it contains a verifiable credential
      if (!decoded.vc) {
        return null;
      }
      
      return decoded;
    } catch (error) {
      console.error('Error verifying JWT credential:', error);
      return null;
    }
  }

  /**
   * Create a cryptographic proof for a credential
   * @private
   * @param {Object} credential - Credential to create proof for
   * @returns {Object} Proof object
   */
  async _createProof(credential) {
    // Create a canonical representation of the credential without the proof
    const credentialCopy = { ...credential };
    delete credentialCopy.proof;
    
    // Hash the credential content
    const credentialString = JSON.stringify(credentialCopy);
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(credentialString));
    
    // Sign the hash
    const signature = await this.wallet.signMessage(ethers.utils.arrayify(messageHash));
    
    // Create the proof
    return {
      type: 'EcdsaSecp256k1Signature2019',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${this.issuerDid}#keys-1`,
      jws: signature
    };
  }

  /**
   * Verify an Ethereum signature-based proof
   * @private
   * @param {Object} credential - Credential to verify
   * @returns {boolean} Whether the proof is valid
   */
  async _verifyEthereumSignature(credential) {
    try {
      // Extract the credential without the proof
      const credentialCopy = { ...credential };
      const proof = { ...credentialCopy.proof };
      delete credentialCopy.proof;
      
      // Hash the credential content
      const credentialString = JSON.stringify(credentialCopy);
      const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(credentialString));
      
      // Recover the signer address from signature
      const recoveredAddress = ethers.utils.verifyMessage(
        ethers.utils.arrayify(messageHash),
        proof.jws
      );
      
      // Extract issuer address from DID
      const issuerDid = credential.issuer;
      let issuerAddress;
      
      if (issuerDid.startsWith('did:ethr:')) {
        issuerAddress = issuerDid.split(':')[2];
      } else {
        // For other DID methods, this would need to be expanded
        return false;
      }
      
      // Compare the recovered address with the issuer address
      return recoveredAddress.toLowerCase() === issuerAddress.toLowerCase();
    } catch (error) {
      console.error('Error verifying Ethereum signature:', error);
      return false;
    }
  }

  /**
   * Verify a JWT-based proof
   * @private
   * @param {Object} credential - Credential with JWT proof
   * @returns {boolean} Whether the proof is valid
   */
  async _verifyJwtProof(credential) {
    try {
      // Extract JWT token from proof
      const jwtToken = credential.proof.jwt;
      
      // Verify JWT
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
      
      // Check if issuer matches
      return decoded.iss === credential.issuer;
    } catch (error) {
      console.error('Error verifying JWT proof:', error);
      return false;
    }
  }
}

module.exports = new CredentialHandler();