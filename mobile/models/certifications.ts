export interface PropertyValue {
  value: number | string | boolean;
  unit?: string;
  threshold?: {
    type: 'min' | 'max' | 'exact' | 'range';
    value: number | string | [number, number];
  };
  passed: boolean;
}

export interface MaterialCertification {
  // Core identification
  certificateId: string;
  batchNumber: string; // Heat number, lot number, etc.

  // Material basics (public)
  material: {
    type: string; // "Structural Steel", "Type X Gypsum", etc.
    designation: string; // "ASTM A992", "ASTM C1396", etc.
    grade: string; // "Grade 50", etc.
    shape?: string; // For structural elements
    manufacturer: string;
    manufacturerLocation: string;
  };

  // Batch details
  batch: {
    productionDate: string;
    expirationDate?: string;
    quantity: number;
    units: string;
  };

  // Properties tested (selective disclosure)
  propertiesTested: {
    // Public results
    publicProperties: Record<string, PropertyValue>;

    // Private properties
    privateProperties: Record<string, PropertyValue>;

    // Maps properties to standards they satisfy
    propertyStandardsMapping: Record<string, string[]>;
  };

  // Compliance assertions (public)
  compliance: Array<{
    standard: string; // "ASTM A992", "IBC 2021", etc.
    clause: string; // "Chemical", "Section 2203.1"
    result: 'PASS' | 'FAIL';
  }>;

  // Verification metadata
  verifiedBy: {
    testReportNumber: string; // "MTR-12345"
    laboratory: string;
    testDate: string;
    certifiedBy: string;
  };

  // Digital verification
  digitalVerification: {
    proofCid?: string; // IPFS CID for the ZKP
    ceramicStreamId?: string; // Ceramic reference
    publicFields: string[]; // List of fields that are public
    privateFields: string[]; // List of fields protected by ZKP
  };

  // Audit trail
  verificationHistory?: Array<{
    timestamp: number;
    location?: string;
    verifierId: string;
    deviceId?: string;
    result: 'VERIFIED' | 'REJECTED';
  }>;
}
