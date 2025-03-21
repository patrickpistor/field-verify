import { MaterialCertification } from '../models/certifications';

export function getMockOcrData(certType: 'aluminum' | 'steel' | 'copper'): Partial<MaterialCertification> {
  switch (certType) {
    case 'aluminum':
      return {
        certificateId: 'CERT-6078942',
        batchNumber: '200250141',
        material: {
          type: 'Aluminum Bar',
          designation: 'ASTM-B221-14',
          grade: '6061-T6511',
          shape: '0.500 X 1.750 SC RECT BAR',
          manufacturer: 'KAISER ALUMINUM',
          manufacturerLocation: 'KALAMAZOO, MI 49048',
        },
        batch: {
          productionDate: '2019-08-01',
          quantity: 88,
          units: 'PCS',
        },
        propertiesTested: {
          publicProperties: {
            'tensile_strength': {
              value: 53.9,
              unit: 'KSI',
              threshold: {
                type: 'min',
                value: 42.0,
              },
              passed: true,
            },
            'yield_strength': {
              value: 50.6,
              unit: 'KSI',
              threshold: {
                type: 'min',
                value: 35.0,
              },
              passed: true,
            },
            'elongation': {
              value: 16.0,
              unit: '%',
              threshold: {
                type: 'min',
                value: 8.0,
              },
              passed: true,
            },
          },
          privateProperties: {
            'chemical_composition_Si': {
              value: 0.75,
              unit: '%',
              threshold: {
                type: 'range',
                value: [0.4, 0.8],
              },
              passed: true,
            },
            'chemical_composition_Fe': {
              value: 0.25,
              unit: '%',
              threshold: {
                type: 'max',
                value: 0.7,
              },
              passed: true,
            },
            'chemical_composition_Cu': {
              value: 0.27,
              unit: '%',
              threshold: {
                type: 'range',
                value: [0.15, 0.4],
              },
              passed: true,
            },
            'chemical_composition_Mn': {
              value: 0.13,
              unit: '%',
              threshold: {
                type: 'max',
                value: 0.15,
              },
              passed: true,
            },
          },
          propertyStandardsMapping: {
            'tensile_strength': ['ASTM-B221-14'],
            'yield_strength': ['ASTM-B221-14'],
            'elongation': ['ASTM-B221-14'],
            'chemical_composition': ['ASTM-B221-14'],
          },
        },
        compliance: [
          {
            standard: 'ASTM-B221-14',
            clause: 'Mechanical Properties',
            result: 'PASS',
          },
          {
            standard: 'ASTM-B221-14',
            clause: 'Chemical Composition',
            result: 'PASS',
          },
          {
            standard: 'ASME-SB221',
            clause: '2009 SECT II',
            result: 'PASS',
          },
        ],
        verifiedBy: {
          testReportNumber: '00387807',
          laboratory: 'Kaiser Aluminum QC Lab',
          testDate: '2019-08-01',
          certifiedBy: 'Aimee L. Macnowski, Quality & Technology Manager',
        },
      };

    case 'copper':
      return {
        certificateId: 'WMS-223688',
        batchNumber: '06-456608',
        material: {
          type: 'Copper Sheet',
          designation: 'C11000',
          grade: 'Soft',
          shape: '0.0028 x 12 x 12',
          manufacturer: 'Wieland Metal Services Foils, LLC',
          manufacturerLocation: 'Alliance, OH, 44601',
        },
        batch: {
          productionDate: '2019-12-05',
          quantity: 40,
          units: 'PCS',
        },
        propertiesTested: {
          publicProperties: {
            'elongation': {
              value: 35.0,
              unit: '%',
              threshold: {
                type: 'min',
                value: 35.0,
              },
              passed: true,
            },
            'tensile': {
              value: 35.0,
              unit: 'KSI',
              threshold: {
                type: 'min',
                value: 35.0,
              },
              passed: true,
            },
            'yield': {
              value: 14.0,
              unit: 'KSI',
              threshold: {
                type: 'min',
                value: 14.0,
              },
              passed: true,
            },
          },
          privateProperties: {
            'chemical_composition_Cu': {
              value: 99.967,
              unit: '%',
              threshold: {
                type: 'min',
                value: 99.9,
              },
              passed: true,
            },
          },
          propertyStandardsMapping: {},
        },
        compliance: [],
        verifiedBy: {
          testReportNumber: 'N/A',
          laboratory: 'Wieland Metal Services',
          testDate: '2019-12-05',
          certifiedBy: 'N/A',
        },
      };

    default:
      return {}; // Return empty data for unknown types
  }
}
