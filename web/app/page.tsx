'use client';

import { useState, useEffect } from 'react';
// idk how to fix this doesn't actually break anything
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import sampleData from './sample.json';

// Define TypeScript interfaces for our data structure
interface PropertyTest {
  value: number;
  unit: string;
  threshold: {
    min: number;
    max: number;
  };
  passed: boolean;
}

interface MaterialCertification {
  certificate_id: string;
  batch_number: string;
  material: {
    type: string;
    designation: string;
    grade: string;
    shape: string;
    manufacturer: string;
    manufacturer_location: string;
  };
  batch: {
    production_date: string;
    quantity: number;
    units: string;
  };
  properties_tested: {
    public_properties: Record<string, PropertyTest>;
    private_properties?: Record<string, PropertyTest>;
    property_standards_mapping?: Record<string, string[]>;
  };
  compliance: Array<{
    standard: string;
    clause: string;
    result: string;
  }>;
  verified_by: {
    test_report_number: string;
    laboratory: string;
    test_date: string;
    certified_by: string;
  };
}

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState<MaterialCertification | null>(null);
  const [isValidJson, setIsValidJson] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { handleSubmit } = useForm();
  const [jsonString, setJsonString] = useState<string>(JSON.stringify(sampleData, null, 2));

  // Validate the JSON whenever it changes
  useEffect(() => {
    try {
      const parsedData = JSON.parse(jsonString) as MaterialCertification;
      setIsValidJson(true);
      
      // Validate required fields
      const errors: string[] = [];
      
      if (!parsedData.certificate_id) {
        errors.push("Missing certificate_id");
      }
      
      if (!parsedData.properties_tested || 
          !parsedData.properties_tested.public_properties || 
          Object.keys(parsedData.properties_tested.public_properties).length === 0) {
        errors.push("At least one public property must be tested");
      }
      
      setValidationErrors(errors);
    } catch (err: unknown) {
      console.error(err);
      setIsValidJson(false);
      setValidationErrors(["Invalid JSON format"]);
    }
  }, [jsonString]);

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Parse the JSON string to an object
      const parsedData = JSON.parse(jsonString) as MaterialCertification;
      setJsonData(parsedData);
      
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-proof`, {
        certification: parsedData
      });

      setProofId(res.data.proof_id);
    } catch (err: unknown) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON: ' + err.message);
      } else {
        setError('Failed to generate proof');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || !isValidJson || validationErrors.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Material Verification Portal</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Material Certification</h2>
          <p className="mb-4">Enter or upload your material certification data below:</p>
          
          <div className="border rounded-lg overflow-hidden" style={{ height: "800px" }}>
            <Editor
              height="800px"
              defaultLanguage="json"
              defaultValue={jsonString}
              onChange={(value) => setJsonString(value || '')}
              options={{
                minimap: { enabled: false },
                formatOnPaste: true,
                formatOnType: true
              }}
            />
          </div>
        </div>
        
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded mb-4">
            <p className="font-semibold">Validation Issues:</p>
            <ul className="list-disc pl-5">
              {validationErrors.map((err, index) => (
                <li key={index}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitDisabled}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
          title={isSubmitDisabled ? "Please fix validation errors before submitting" : ""}
        >
          {isSubmitting ? 'Generating...' : 'Generate Proof'}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {proofId && jsonData && (
          <div className="mt-6 p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Proof Generated!</h2>
            <p className="mb-4">Scan this QR code or share the link for verification:</p>
            
            <div className="flex flex-col items-center">
              <QRCodeSVG 
                value={`${process.env.NEXT_PUBLIC_API_URL}/verify/${proofId}/${jsonData.certificate_id}`}
                size={200}
                marginSize={4}
              />
              
              <p className="mt-4 text-sm">
                Verification URL: <a href={`/verify/${proofId}/${jsonData.certificate_id}`} className="text-blue-600 underline">
                  {process.env.NEXT_PUBLIC_API_URL}/verify/{proofId}/{jsonData.certificate_id}
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
