// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title BioProofConsent
 * @dev Smart contract for managing biometric data consent in research studies
 */
contract BioProofConsent {
    struct Study {
        address owner;
        string ipfsMetadataHash;
        string title;
        string description;
        uint256 creationDate;
        bool active;
    }
    
    struct Consent {
        address participant;
        uint256 studyId;
        string ipfsConsentDocHash;
        string ipfsCredentialHash;
        ConsentStatus status;
        uint256 timestamp;
        uint256 expirationDate;
        mapping(string => bool) specificPermissions;
        string[] permissionKeys;
    }

    enum ConsentStatus { None, Pending, Granted, Revoked, Expired }
    
    uint256 private studyCounter;
    mapping(uint256 => Study) public studies;
    mapping(address => uint256[]) private participantStudies;
    mapping(uint256 => address[]) private studyParticipants;
    mapping(uint256 => mapping(address => uint256)) private consentIndex;
    mapping(uint256 => Consent) public consents;
    uint256 private consentCounter;
    
    event StudyCreated(uint256 indexed studyId, address indexed owner, string title);
    event StudyUpdated(uint256 indexed studyId, string ipfsMetadataHash);
    event StudyStatusChanged(uint256 indexed studyId, bool active);
    event ConsentRequested(uint256 indexed consentId, address indexed participant, uint256 indexed studyId);
    event ConsentGranted(uint256 indexed consentId, address indexed participant, uint256 indexed studyId);
    event ConsentRevoked(uint256 indexed consentId, address indexed participant, uint256 indexed studyId);
    event PermissionUpdated(uint256 indexed consentId, string permissionKey, bool granted);
    
    modifier onlyStudyOwner(uint256 _studyId) {
        require(studies[_studyId].owner == msg.sender, "Not the study owner");
        _;
    }
    
    modifier onlyParticipant(uint256 _consentId) {
        require(consents[_consentId].participant == msg.sender, "Not the consent owner");
        _;
    }
    
    modifier studyExists(uint256 _studyId) {
        require(_studyId < studyCounter, "Study does not exist");
        _;
    }
    
    modifier studyActive(uint256 _studyId) {
        require(studies[_studyId].active, "Study is not active");
        _;
    }
    
    /**
     * @dev Create a new research study
     * @param _ipfsMetadataHash IPFS hash of study metadata
     * @param _title Study title
     * @param _description Study description
     * @return studyId of the newly created study
     */
    function createStudy(
        string memory _ipfsMetadataHash, 
        string memory _title, 
        string memory _description
    ) external returns (uint256) {
        uint256 studyId = studyCounter++;
        
        Study storage newStudy = studies[studyId];
        newStudy.owner = msg.sender;
        newStudy.ipfsMetadataHash = _ipfsMetadataHash;
        newStudy.title = _title;
        newStudy.description = _description;
        newStudy.creationDate = block.timestamp;
        newStudy.active = true;
        
        emit StudyCreated(studyId, msg.sender, _title);
        
        return studyId;
    }
    
    /**
     * @dev Update study metadata
     * @param _studyId ID of the study to update
     * @param _ipfsMetadataHash New IPFS hash for updated metadata
     */
    function updateStudyMetadata(
        uint256 _studyId, 
        string memory _ipfsMetadataHash
    ) external studyExists(_studyId) onlyStudyOwner(_studyId) {
        studies[_studyId].ipfsMetadataHash = _ipfsMetadataHash;
        
        emit StudyUpdated(_studyId, _ipfsMetadataHash);
    }
    
    /**
     * @dev Change study active status
     * @param _studyId ID of the study
     * @param _active New active status
     */
    function setStudyActive(
        uint256 _studyId, 
        bool _active
    ) external studyExists(_studyId) onlyStudyOwner(_studyId) {
        studies[_studyId].active = _active;
        
        emit StudyStatusChanged(_studyId, _active);
    }
    
    /**
     * @dev Request consent from a participant
     * @param _studyId ID of the study
     * @param _participant Address of the participant
     * @param _ipfsConsentDocHash IPFS hash of the consent document
     * @param _expirationDate Optional expiration date for the consent (0 for no expiration)
     * @return consentId of the newly created consent request
     */
    function requestConsent(
        uint256 _studyId,
        address _participant,
        string memory _ipfsConsentDocHash,
        uint256 _expirationDate
    ) external studyExists(_studyId) studyActive(_studyId) onlyStudyOwner(_studyId) returns (uint256) {
        uint256 consentId = consentCounter++;
        
        Consent storage newConsent = consents[consentId];
        newConsent.participant = _participant;
        newConsent.studyId = _studyId;
        newConsent.ipfsConsentDocHash = _ipfsConsentDocHash;
        newConsent.status = ConsentStatus.Pending;
        newConsent.timestamp = block.timestamp;
        newConsent.expirationDate = _expirationDate;
        
        // Update mappings for easy lookup
        consentIndex[_studyId][_participant] = consentId;
        studyParticipants[_studyId].push(_participant);
        participantStudies[_participant].push(_studyId);
        
        emit ConsentRequested(consentId, _participant, _studyId);
        
        return consentId;
    }
    
    /**
     * @dev Grant consent to a study
     * @param _consentId ID of the consent
     * @param _ipfsCredentialHash IPFS hash of the verifiable credential
     */
    function grantConsent(
        uint256 _consentId,
        string memory _ipfsCredentialHash
    ) external onlyParticipant(_consentId) {
        Consent storage consent = consents[_consentId];
        require(consent.status == ConsentStatus.Pending, "Consent must be in pending state");
        
        if (consent.expirationDate > 0) {
            require(block.timestamp < consent.expirationDate, "Consent request has expired");
        }
        
        consent.status = ConsentStatus.Granted;
        consent.timestamp = block.timestamp;
        consent.ipfsCredentialHash = _ipfsCredentialHash;
        
        emit ConsentGranted(_consentId, consent.participant, consent.studyId);
    }
    
    /**
     * @dev Revoke previously granted consent
     * @param _consentId ID of the consent to revoke
     */
    function revokeConsent(uint256 _consentId) external onlyParticipant(_consentId) {
        Consent storage consent = consents[_consentId];
        require(consent.status == ConsentStatus.Granted, "Consent must be in granted state");
        
        consent.status = ConsentStatus.Revoked;
        consent.timestamp = block.timestamp;
        
        emit ConsentRevoked(_consentId, consent.participant, consent.studyId);
    }
    
    /**
     * @dev Add a specific permission to a consent
     * @param _consentId ID of the consent
     * @param _permissionKey Key identifying the permission
     * @param _granted Whether the permission is granted or not
     */
    function updateSpecificPermission(
        uint256 _consentId,
        string memory _permissionKey,
        bool _granted
    ) external onlyParticipant(_consentId) {
        Consent storage consent = consents[_consentId];
        require(consent.status == ConsentStatus.Granted, "Consent must be in granted state");
        
        bool permissionExists = false;
        for (uint i = 0; i < consent.permissionKeys.length; i++) {
            if (keccak256(bytes(consent.permissionKeys[i])) == keccak256(bytes(_permissionKey))) {
                permissionExists = true;
                break;
            }
        }
        
        if (!permissionExists) {
            consent.permissionKeys.push(_permissionKey);
        }
        
        consent.specificPermissions[_permissionKey] = _granted;
        
        emit PermissionUpdated(_consentId, _permissionKey, _granted);
    }
    
    /**
     * @dev Check if a specific permission is granted
     * @param _consentId ID of the consent
     * @param _permissionKey Key identifying the permission
     * @return Whether the permission is granted
     */
    function checkPermission(
        uint256 _consentId,
        string memory _permissionKey
    ) external view returns (bool) {
        Consent storage consent = consents[_consentId];
        require(consent.status == ConsentStatus.Granted, "Consent not granted");
        
        if (consent.expirationDate > 0 && block.timestamp > consent.expirationDate) {
            return false;
        }
        
        return consent.specificPermissions[_permissionKey];
    }
    
    /**
     * @dev Get consent status for a participant in a study
     * @param _studyId ID of the study
     * @param _participant Address of the participant
     * @return status Current consent status
     */
    function getConsentStatus(
        uint256 _studyId,
        address _participant
    ) external view studyExists(_studyId) returns (ConsentStatus) {
        uint256 consentId = consentIndex[_studyId][_participant];
        
        if (consentId == 0) {
            return ConsentStatus.None;
        }
        
        Consent storage consent = consents[consentId];
        
        if (consent.expirationDate > 0 && block.timestamp > consent.expirationDate && 
            consent.status == ConsentStatus.Granted) {
            return ConsentStatus.Expired;
        }
        
        return consent.status;
    }
    
    /**
     * @dev Get all studies a participant is involved in
     * @param _participant Address of the participant
     * @return Array of study IDs
     */
    function getParticipantStudies(address _participant) external view returns (uint256[] memory) {
        return participantStudies[_participant];
    }
    
    /**
     * @dev Get all participants in a study
     * @param _studyId ID of the study
     * @return Array of participant addresses
     */
    function getStudyParticipants(uint256 _studyId) external view studyExists(_studyId) returns (address[] memory) {
        return studyParticipants[_studyId];
    }
}