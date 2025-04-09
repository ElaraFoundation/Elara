const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { create } = require('ipfs-http-client');
const { ethers } = require('ethers');
const { DidDocument, VerifiableCredential, Ed25519Signature2020 } = require('@digitalbazaar/vc');
const BioProofContractABI = require('./contracts/BioProofConsent.json');
const morgan = require('morgan');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Connect to IPFS (using Infura in this example)
const ipfs = create({
  host: process.env.IPFS_HOST || 'ipfs.infura.io',
  port: process.env.IPFS_PORT || 5001,
  protocol: process.env.IPFS_PROTOCOL || 'https',
  headers: {
    authorization: `Basic ${Buffer.from(
      process.env.IPFS_PROJECT_ID + ':' + process.env.IPFS_PROJECT_SECRET
    ).toString('base64')}`
  }
});

// Connect to Ethereum provider
const provider = new ethers.providers.JsonRpcProvider(process.env.ETH_PROVIDER_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const bioProofContract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  BioProofContractABI.abi,
  wallet
);

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { walletAddress, signature, nonce } = req.body;
    
    // Verify the signature
    const message = `Login to BioProof with nonce: ${nonce}`;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { walletAddress, isResearcher: req.body.isResearcher || false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/nonce', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  res.json({ nonce });
});

// IPFS routes
app.post('/api/ipfs/upload', authenticateJWT, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }
    
    // Add to IPFS
    const result = await ipfs.add(JSON.stringify(content));
    
    res.json({
      cid: result.cid.toString(),
      size: result.size
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ error: 'Failed to upload to IPFS' });
  }
});

app.get('/api/ipfs/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    
    // Get data from IPFS
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    const content = Buffer.concat(chunks).toString();
    
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('IPFS retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve from IPFS' });
  }
});

// Study routes
app.post('/api/studies', authenticateJWT, async (req, res) => {
  try {
    const { title, description, metadata } = req.body;
    
    if (!req.user.isResearcher) {
      return res.status(403).json({ error: 'Only researchers can create studies' });
    }
    
    // Upload study metadata to IPFS
    const metadataResult = await ipfs.add(JSON.stringify({
      ...metadata,
      createdBy: req.user.walletAddress,
      createdAt: new Date().toISOString()
    }));
    
    const metadataCid = metadataResult.cid.toString();
    
    // Create study on blockchain
    const tx = await bioProofContract.createStudy(
      metadataCid,
      title,
      description
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'StudyCreated');
    const studyId = event.args.studyId.toNumber();
    
    res.json({
      studyId,
      metadataCid,
      title,
      description
    });
  } catch (error) {
    console.error('Study creation error:', error);
    res.status(500).json({ error: 'Failed to create study' });
  }
});

app.get('/api/studies/:studyId', async (req, res) => {
  try {
    const { studyId } = req.params;
    
    // Get study from blockchain
    const study = await bioProofContract.studies(studyId);
    
    // Get metadata from IPFS
    const chunks = [];
    for await (const chunk of ipfs.cat(study.ipfsMetadataHash)) {
      chunks.push(chunk);
    }
    
    const metadata = JSON.parse(Buffer.concat(chunks).toString());
    
    res.json({
      studyId,
      owner: study.owner,
      title: study.title,
      description: study.description,
      creationDate: new Date(study.creationDate.toNumber() * 1000).toISOString(),
      active: study.active,
      metadata
    });
  } catch (error) {
    console.error('Study retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve study' });
  }
});

app.get('/api/studies', async (req, res) => {
  try {
    const studyCounter = await bioProofContract.studyCounter();
    const studies = [];
    
    for (let i = 0; i < studyCounter; i++) {
      const study = await bioProofContract.studies(i);
      studies.push({
        studyId: i,
        owner: study.owner,
        title: study.title,
        description: study.description,
        active: study.active,
        creationDate: new Date(study.creationDate.toNumber() * 1000).toISOString()
      });
    }
    
    res.json(studies);
  } catch (error) {
    console.error('Studies retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve studies' });
  }
});

// Consent routes
app.post('/api/consents/request', authenticateJWT, async (req, res) => {
  try {
    const { studyId, participant, consentDocument, expirationDate } = req.body;
    
    // Check if requester is study owner
    const study = await bioProofContract.studies(studyId);
    
    if (study.owner.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only study owner can request consent' });
    }
    
    // Upload consent document to IPFS
    const docResult = await ipfs.add(JSON.stringify({
      ...consentDocument,
      studyId,
      participant,
      requestedAt: new Date().toISOString(),
      requestedBy: req.user.walletAddress
    }));
    
    const docCid = docResult.cid.toString();
    
    // Convert expiration date to unix timestamp if provided
    let expirationTimestamp = 0;
    if (expirationDate) {
      expirationTimestamp = Math.floor(new Date(expirationDate).getTime() / 1000);
    }
    
    // Request consent on blockchain
    const tx = await bioProofContract.requestConsent(
      studyId,
      participant,
      docCid,
      expirationTimestamp
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'ConsentRequested');
    const consentId = event.args.consentId.toNumber();
    
    res.json({
      consentId,
      studyId,
      participant,
      docCid,
      expirationDate: expirationDate || null
    });
  } catch (error) {
    console.error('Consent request error:', error);
    res.status(500).json({ error: 'Failed to request consent' });
  }
});

app.post('/api/consents/:consentId/grant', authenticateJWT, async (req, res) => {
  try {
    const { consentId } = req.params;
    
    // Get consent from blockchain
    const consent = await bioProofContract.consents(consentId);
    
    if (consent.participant.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only participant can grant consent' });
    }
    
    // Create verifiable credential
    const vc = await createVerifiableCredential(
      req.user.walletAddress,
      consentId,
      consent.studyId.toNumber()
    );
    
    // Upload credential to IPFS
    const credResult = await ipfs.add(JSON.stringify(vc));
    const credCid = credResult.cid.toString();
    
    // Grant consent on blockchain
    const tx = await bioProofContract.grantConsent(consentId, credCid);
    await tx.wait();
    
    res.json({
      consentId,
      studyId: consent.studyId.toNumber(),
      status: 'granted',
      credentialCid: credCid
    });
  } catch (error) {
    console.error('Consent grant error:', error);
    res.status(500).json({ error: 'Failed to grant consent' });
  }
});

app.post('/api/consents/:consentId/revoke', authenticateJWT, async (req, res) => {
  try {
    const { consentId } = req.params;
    
    // Get consent from blockchain
    const consent = await bioProofContract.consents(consentId);
    
    if (consent.participant.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only participant can revoke consent' });
    }
    
    // Revoke consent on blockchain
    const tx = await bioProofContract.revokeConsent(consentId);
    await tx.wait();
    
    res.json({
      consentId,
      studyId: consent.studyId.toNumber(),
      status: 'revoked'
    });
  } catch (error) {
    console.error('Consent revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
});

app.post('/api/consents/:consentId/permissions', authenticateJWT, async (req, res) => {
  try {
    const { consentId } = req.params;
    const { permissionKey, granted } = req.body;
    
    // Get consent from blockchain
    const consent = await bioProofContract.consents(consentId);
    
    if (consent.participant.toLowerCase() !== req.user.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Only participant can update permissions' });
    }
    
    // Update permission on blockchain
    const tx = await bioProofContract.updateSpecificPermission(
      consentId,
      permissionKey,
      granted
    );
    
    await tx.wait();
    
    res.json({
      consentId,
      permissionKey,
      granted
    });
  } catch (error) {
    console.error('Permission update error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

app.get('/api/consents/participant/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get participant studies
    const studyIds = await bioProofContract.getParticipantStudies(address);
    
    const consents = [];
    for (const studyId of studyIds) {
      const status = await bioProofContract.getConsentStatus(studyId, address);
      const study = await bioProofContract.studies(studyId);
      
      consents.push({
        studyId: studyId.toNumber(),
        studyTitle: study.title,
        status: ['None', 'Pending', 'Granted', 'Revoked', 'Expired'][status],
        owner: study.owner
      });
    }
    
    res.json(consents);
  } catch (error) {
    console.error('Participant consents retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve participant consents' });
  }
});

app.get('/api/consents/study/:studyId', async (req, res) => {
  try {
    const { studyId } = req.params;
    
    // Get study participants
    const participants = await bioProofContract.getStudyParticipants(studyId);
    
    const consents = [];
    for (const participant of participants) {
      const status = await bioProofContract.getConsentStatus(studyId, participant);
      
      consents.push({
        participant,
        status: ['None', 'Pending', 'Granted', 'Revoked', 'Expired'][status]
      });
    }
    
    res.json(consents);
  } catch (error) {
    console.error('Study consents retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve study consents' });
  }
});

// Utility function to create a verifiable credential
async function createVerifiableCredential(participantAddress, consentId, studyId) {
  // Create a simple verifiable credential
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.w3.org/2018/credentials/examples/v1'
    ],
    id: `urn:uuid:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', 'BiometricConsentCredential'],
    issuer: process.env.ISSUER_DID || `did:ethr:${wallet.address}`,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: `did:ethr:${participantAddress}`,
      consentId: consentId.toString(),
      studyId: studyId.toString(),
      grantedAt: new Date().toISOString()
    }
  };
  
  // Sign the credential with organization's private key
  // Note: In a real implementation, you'd use proper DID methods and sign properly
  const signature = wallet.signMessage(
    JSON.stringify(credential.credentialSubject)
  );
  
  return {
    ...credential,
    proof: {
      type: 'EcdsaSecp256k1Signature2019',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${credential.issuer}#keys-1`,
      jws: signature
    }
  };
}

// Static file serving (for frontend)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`BioProof server running on port ${PORT}`);
});

module.exports = app;