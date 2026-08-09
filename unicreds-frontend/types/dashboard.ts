export interface VerifyFieldLabels {
  issuerAuthority: string;
  credentialType: string;
  studentAddress: string;
  hash: string;
  issueDate: string;
}

export interface VerifySample {
  issuer: string;
  issuerAddress: string;
  credentialType: string;
  studentAddress: string;
  hash: string;
  date: string;
}

export interface VerifyDictionary {
  title: string;
  subtitle: string;
  placeholder: string;
  button: string;
  verifying: string;
  resultLabel: string;
  valid: string;
  fields: VerifyFieldLabels;
  viewOriginal: string;
  sample: VerifySample;
}

export interface UniversityRow {
  id: string;
  hash: string;
  status: string;
  revokeReason?: string;
}

export interface UniversityDictionary {
  badge: string;
  title: string;
  connectedContract: string;
  contractAddress: string;
  formTitle: string;
  labels: {
    studentAddress: string;
    studentId: string;
    major: string;
    gpa: string;
    document: string;
  };
  upload: string;
  submit: string;
  submitting: string;
  submitted: string;
  tableTitle: string;
  totalLabel: string;
  searchPlaceholder: string;
  searchEmpty: string;
  columns: {
    studentId: string;
    hash: string;
    status: string;
    action: string;
  };
  statusValid: string;
  statusRevoked: string;
  revoke: string;
  revokeTitle: string;
  revokeDescription: string;
  revocationReason: string;
  revocationPlaceholder: string;
  confirmRevoke: string;
  cancel: string;
  rows: UniversityRow[];
}

export interface AdminDictionary {
  badge: string;
  title: string;
  connectedContract: string;
  registerTitle: string;
  registerDescription: string;
  labels: {
    universityAddress: string;
    name: string;
    location: string;
  };
  register: string;
  registering: string;
  registered: string;
  searchTitle: string;
  searchDescription: string;
  searchPlaceholder: string;
  search: string;
  searching: string;
  notFound: string;
  fields: {
    name: string;
    location: string;
    status: string;
    registeredAt: string;
    address: string;
    suspensionReason: string;
  };
  statusActive: string;
  statusSuspended: string;
  activate: string;
  suspend: string;
  suspendTitle: string;
  suspendDescription: string;
  suspendReasonLabel: string;
  suspendReasonPlaceholder: string;
  confirmSuspend: string;
  processing: string;
}

export interface StudentCredential {
  verified: boolean;
  title: string;
  issuer: string;
  major: string;
  gpa: string;
  issueDate: string;
  studentAddress: string;
  hash: string;
}

export interface StudentDictionary {
  walletTitle: string;
  copyAddress: string;
  sectionTitle: string;
  verifiedLabel: string;
  credentials: StudentCredential[];
  labels: {
    major: string;
    gpa: string;
    issueDate: string;
  };
  viewProof: string;
  share: string;
  emptyTitle: string;
  emptyDescription: string;
}

export interface DashboardNav {
  verify: string;
  university: string;
  student: string;
  admin: string;
  network: string;
}

export interface DashboardDictionary {
  nav: DashboardNav;
  header: { wallet: string };
  verify: VerifyDictionary;
  university: UniversityDictionary;
  student: StudentDictionary;
  admin: AdminDictionary;
}
