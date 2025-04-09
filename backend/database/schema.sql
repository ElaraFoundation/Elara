-- BioProof Database Schema

-- Users table to store additional user information 
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    is_researcher BOOLEAN DEFAULT FALSE,
    organization VARCHAR(255),
    profile_ipfs_hash VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    did VARCHAR(255) UNIQUE,
    description TEXT,
    website VARCHAR(255),
    logo_ipfs_hash VARCHAR(128),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization members
CREATE TABLE organization_members (
    organization_id INTEGER REFERENCES organizations(id),
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(100) NOT NULL, -- admin, member, etc.
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, user_id)
);

-- Studies table (to cache blockchain data and add additional metadata)
CREATE TABLE studies (
    id SERIAL PRIMARY KEY,
    blockchain_study_id INTEGER UNIQUE NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ipfs_metadata_hash VARCHAR(128) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    creation_date TIMESTAMP NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organization_id INTEGER REFERENCES organizations(id),
    study_type VARCHAR(100),
    duration_days INTEGER,
    keywords TEXT[]
);

-- Consent records (to cache blockchain data and add additional metadata)
CREATE TABLE consents (
    id SERIAL PRIMARY KEY,
    blockchain_consent_id INTEGER UNIQUE NOT NULL,
    participant_address VARCHAR(42) NOT NULL,
    study_id INTEGER REFERENCES studies(id),
    status VARCHAR(50) NOT NULL,
    ipfs_consent_doc_hash VARCHAR(128) NOT NULL,
    ipfs_credential_hash VARCHAR(128),
    requested_at TIMESTAMP NOT NULL,
    responded_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_expired BOOLEAN DEFAULT FALSE
);

-- Specific permissions for consents
CREATE TABLE consent_permissions (
    id SERIAL PRIMARY KEY,
    consent_id INTEGER REFERENCES consents(id),
    permission_key VARCHAR(255) NOT NULL,
    granted BOOLEAN NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (consent_id, permission_key)
);

-- Biometric data types
CREATE TABLE biometric_data_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    sensitivity_level INTEGER DEFAULT 1
);

-- Study biometric data types
CREATE TABLE study_biometric_data (
    study_id INTEGER REFERENCES studies(id),
    biometric_data_type_id INTEGER REFERENCES biometric_data_types(id),
    description TEXT,
    collection_method TEXT,
    PRIMARY KEY (study_id, biometric_data_type_id)
);

-- Consent events log
CREATE TABLE consent_events (
    id SERIAL PRIMARY KEY,
    consent_id INTEGER REFERENCES consents(id),
    event_type VARCHAR(100) NOT NULL,
    performed_by VARCHAR(42) NOT NULL,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSON
);

-- Verification records
CREATE TABLE verification_records (
    id SERIAL PRIMARY KEY,
    consent_id INTEGER REFERENCES consents(id),
    verifier_address VARCHAR(42) NOT NULL,
    verification_type VARCHAR(100) NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN NOT NULL,
    verification_proof VARCHAR(255),
    details JSON
);

-- Data access records
CREATE TABLE data_access_records (
    id SERIAL PRIMARY KEY,
    consent_id INTEGER REFERENCES consents(id),
    accessor_address VARCHAR(42) NOT NULL,
    access_type VARCHAR(100) NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_purpose TEXT,
    data_used TEXT[]
);

-- User notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(100),
    related_entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Authentication sessions
CREATE TABLE auth_sessions (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    nonce VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_consents_participant ON consents(participant_address);
CREATE INDEX idx_consents_study ON consents(study_id);
CREATE INDEX idx_consent_events_consent ON consent_events(consent_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Create audit trigger functions
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;