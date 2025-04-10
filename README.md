# BioProof: Decentralized Biometric Consent Verification

<p align="center">
  <img src="img/banner.png" alt="BioProof Banner" width="100%" />
</p>

BioProof is a blockchain-based platform for managing informed consent for biometric data in research studies. It creates immutable records of informed consent, ensuring ethical compliance and giving participants ownership of their data-sharing decisions.

Contract Address: 

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [Smart Contracts](#smart-contracts)
- [Backend API](#backend-api)
- [Frontend](#frontend)
- [Database](#database)
- [IPFS Integration](#ipfs-integration)
- [Verifiable Credentials](#verifiable-credentials)
- [Contributing](#contributing)
- [License](#license)

## Overview

BioProof addresses the critical need for transparent, secure, and user-controlled consent management in biometric research. By leveraging blockchain technology, IPFS, and verifiable credentials, BioProof creates a trustless system where:

1. Participants have full visibility and control over their consent
2. Researchers can demonstrate ethical compliance with an immutable audit trail
3. Regulatory bodies can verify consent validity without compromising privacy
4. Consent can be granularly managed and revoked at any time

## Key Features

- **Immutable Consent Records**: All consent actions are recorded on the blockchain
- **Granular Permission Control**: Participants can grant or revoke specific permissions
- **Verifiable Credentials**: Cryptographically verifiable proof of consent
- **Decentralized Storage**: Consent documents and metadata stored on IPFS
- **Transparency**: Complete audit trail of all consent-related actions
- **Self-Sovereign Identity**: Participants control their identity and data
- **Compliance-Focused**: Designed with privacy regulations in mind

## Technology Stack

- **Blockchain**: Solana
- **Smart Contracts**: Solidity
- **Backend**: Node.js, Express
- **Frontend**: React
- **Database**: PostgreSQL (for indexing and caching)
- **Decentralized Storage**: IPFS
- **Authentication**: JWT, Solana Signature
- **Verifiable Credentials**: JSON-LD, JWT

## Project Structure

```
bioproof/
├── contracts/              # Smart contracts
├── backend/                # Node.js backend
│   ├── server.js           # Main server file
│   ├── routes/             # API routes
│   ├── controllers/        # Route controllers
│   ├── models/             # Database models
│   ├── database/           # Database config and migrations
│   └── utils/              # Utility functions
├── frontend/               # React frontend
│   ├── public/             # Static files
│   └── src/                # React source code
│       ├── components/     # React components
│       ├── pages/          # Page components
│       ├── contexts/       # React contexts
│       ├── utils/          # Utility functions
│       └── assets/         # Images, styles, etc.
└── scripts/                # Deployment and utility scripts
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- PostgreSQL
- Solana node access (via Alchemy, or local node)
- IPFS node access (via Infura, Pinata, or local node)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/bioproof.git
   cd bioproof
   ```

2. Install dependencies:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install

   # Install contract dependencies
   cd ../contracts
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```
   # Server
   PORT=3000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=bioproof
   DB_USER=postgres
   DB_PASSWORD=yourpassword

   # JWT
   JWT_SECRET=your-secret-key

   # IPFS
   IPFS_HOST=ipfs.infura.io
   IPFS_PORT=5001
   IPFS_PROTOCOL=https
   IPFS_PROJECT_ID=your-solana-ipfs-project-id
   IPFS_PROJECT_SECRET=your-solana-ipfs-project-secret

   # Credentials
   ISSUER_PRIVATE_KEY=your-issuer-private-key
   ```

4. Create a `.env` file in the frontend directory:
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   REACT_APP_CONTRACT_ADDRESS=your-deployed-contract-address
   REACT_APP_DEFAULT_NETWORK=mainnet
   REACT_APP_IPFS_GATEWAY=https://ipfs.io/ipfs/
   ```

### Configuration

1. Set up the database:
   ```
   cd backend
   npm run db:create
   npm run db:migrate
   ```

2. Deploy the smart contract:
   Update the CONTRACT_ADDRESS in both .env files with the deployed address.

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Access the application at `http://localhost:3000`

## Smart Contracts

The core of BioProof is the `BioProofConsent.sol` smart contract, which handles:

- Study creation and management
- Consent requests and responses
- Permission management
- Consent verification

For detailed information on contract functions and events, see the [Smart Contract Documentation](/contracts/docs/BioProofConsent.md).

## Backend API

The backend provides a RESTful API for interacting with the blockchain and IPFS:

- **Auth**: Login with Solana signature, JWT issuance
- **Studies**: CRUD operations for research studies
- **Consents**: Request, grant, revoke, and query consent status
- **IPFS**: Upload and retrieve data from IPFS
- **Credentials**: Create and verify verifiable credentials

API documentation is available at `/api/docs` when running the server.

## Frontend

The React frontend provides a user-friendly interface for:

- **Researchers**: 
  - Create and manage studies
  - Request participant consent
  - Monitor consent status
  - Access consented biometric data

- **Participants**:
  - View study details
  - Grant or revoke consent
  - Manage specific permissions
  - View consent history and credentials

## Database

While the blockchain serves as the source of truth for consent status, a PostgreSQL database is used for:

- Indexing blockchain events for faster queries
- Storing additional metadata
- Managing user profiles and preferences
- Caching to reduce blockchain calls

## IPFS Integration

IPFS is used to store:

- Detailed study metadata
- Consent documents
- Verifiable credentials
- Additional documentation

All IPFS content is referenced from the blockchain, creating a trustless but efficient system.

## Verifiable Credentials

BioProof uses verifiable credentials to provide cryptographic proof of consent:

- Issued when a participant grants consent
- Contains details of the consent agreement
- Cryptographically signed by the platform
- Verifiable by third parties without contacting the platform
- Stored on IPFS with reference on the blockchain

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
