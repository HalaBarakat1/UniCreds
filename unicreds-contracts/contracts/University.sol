// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract University is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct UniversityProfile {
        string name;
        string location;
        bool isActive;
        uint256 registrationDate;
        string suspensionReason;
    }

    struct Certificate {
        address student;
        bytes32 commitmentHash;
        string ipfsCID;
        bool isValid;
        uint256 issueDate;
        address issuer;
    }

    mapping(address => UniversityProfile) public universityRegistry;
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => string) public revocationReasons;
    uint256 public certificateCounter;

    event CertificateIssued(bytes32 indexed certHash, address indexed student, string ipfsCID);
    event CertificateRevoked(bytes32 indexed certHash, string reason);
    event UniversityRegistered(address indexed universityAddress, string name);
    event UniversityStatusToggled(address indexed universityAddress, bool newStatus, string reason);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function registerUniversity(
        address _universityAddress,
        string memory _name,
        string memory _location
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_universityAddress != address(0), "Invalid address");
        require(universityRegistry[_universityAddress].registrationDate == 0, "Already registered");

        universityRegistry[_universityAddress] = UniversityProfile({
            name: _name,
            location: _location,
            isActive: true,
            registrationDate: block.timestamp,
            suspensionReason: ""
        });

        grantRole(ISSUER_ROLE, _universityAddress);

        emit UniversityRegistered(_universityAddress, _name);
    }

    function toggleUniversityStatus(address _universityAddress, string memory _reason)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(universityRegistry[_universityAddress].registrationDate != 0, "University not registered");

        UniversityProfile storage profile = universityRegistry[_universityAddress];
        bool newStatus = !profile.isActive;

        if (newStatus) {
            profile.isActive = true;
            profile.suspensionReason = "";
            grantRole(ISSUER_ROLE, _universityAddress);
            emit UniversityStatusToggled(_universityAddress, true, "");
            return;
        }

        require(bytes(_reason).length > 0, "Suspension reason required");

        profile.isActive = false;
        profile.suspensionReason = _reason;
        revokeRole(ISSUER_ROLE, _universityAddress);

        emit UniversityStatusToggled(_universityAddress, false, _reason);
    }

    function generateCertificateHash(
        address _issuer,
        address _student,
        string memory _studentId,
        string memory _major,
        string memory _gpa,
        string memory _ipfsCID,
        uint256 _certificateCounter
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                _issuer,
                _student,
                _studentId,
                _major,
                _gpa,
                _ipfsCID,
                _certificateCounter
            )
        );
    }

    function issueCertificate(
        bytes32 _certHash,
        address _student,
        string memory _studentId,
        string memory _major,
        string memory _gpa,
        string memory _ipfsCID
    ) public onlyRole(ISSUER_ROLE) {
        require(universityRegistry[msg.sender].isActive == true, "Issuer is suspended in registry");

        bytes32 expectedHash = generateCertificateHash(
            msg.sender,
            _student,
            _studentId,
            _major,
            _gpa,
            _ipfsCID,
            certificateCounter
        );

        require(_certHash == expectedHash, "Invalid certificate hash");
        require(certificates[_certHash].issueDate == 0, "Certificate hash already exists");

        certificates[_certHash] = Certificate({
            student: _student,
            commitmentHash: _certHash,
            ipfsCID: _ipfsCID,
            isValid: true,
            issueDate: block.timestamp,
            issuer: msg.sender
        });

        certificateCounter += 1;

        emit CertificateIssued(_certHash, _student, _ipfsCID);
    }

    function revokeCertificate(bytes32 _certHash, string memory _reason)
        public
        onlyRole(ISSUER_ROLE)
    {
        require(certificates[_certHash].issuer == msg.sender, "Not original issuer");
        require(certificates[_certHash].issueDate != 0, "Certificate does not exist");
        require(certificates[_certHash].isValid == true, "Certificate is already revoked");

        certificates[_certHash].isValid = false;
        revocationReasons[_certHash] = _reason;

        emit CertificateRevoked(_certHash, _reason);
    }

    function verifyCertificate(bytes32 _certHash) public view returns (bool, address, uint256, address, string memory) {
        Certificate memory cert = certificates[_certHash];

        if (cert.issueDate == 0) {
            return (false, address(0), 0, address(0), "");
        }

        return (cert.isValid, cert.student, cert.issueDate, cert.issuer, cert.ipfsCID);
    }

    function getUniversityProfile(address _universityAddress)
        public
        view
        returns (string memory, string memory, bool, uint256, string memory)
    {
        UniversityProfile memory profile = universityRegistry[_universityAddress];
        return (
            profile.name,
            profile.location,
            profile.isActive,
            profile.registrationDate,
            profile.suspensionReason
        );
    }
}
