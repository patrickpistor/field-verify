'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import aluminumBarData from './aluminum-bar.json';
import copperSheetData from './copper-sheet.json';
import steelRodData from './steel-rod.json';


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
  const [currentTemplate, setCurrentTemplate] = useState('aluminum');
  const [editorKey, setEditorKey] = useState(0);
  const localIP = '192.168.1.86';
  
  const { handleSubmit } = useForm();
  const [jsonString, setJsonString] = useState<string>(JSON.stringify(aluminumBarData, null, 2));

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

  const getBackendUrl = () => {
    if (localIP) {
      // Extract port from your NEXT_PUBLIC_BACKEND_URL or use a default
      const backendPort = new URL(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').port || '3000';
      return `http://${localIP}:${backendPort}`;
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  };

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Parse the JSON string to an object
      const parsedData = JSON.parse(jsonString) as MaterialCertification;
      setJsonData(parsedData);
      
      const res = await axios.post(`${getBackendUrl()}/api/generate-proof`, {
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

  const switchTemplate = (template) => {
    if (template === 'aluminum') {
      setJsonString(JSON.stringify(aluminumBarData, null, 2));
      setCurrentTemplate('aluminum');
    } else if (template === 'copper') {
      setJsonString(JSON.stringify(copperSheetData, null, 2));
      setCurrentTemplate('copper');
    } else if (template === 'steel') {
      setJsonString(JSON.stringify(steelRodData, null, 2));
      setCurrentTemplate('steel');
    }
    // Force editor to remount
    setEditorKey(prevKey => prevKey + 1);
  };

  const getVerificationUrl = () => {
    const baseUrl = localIP 
      ? `http://${localIP}:${window.location.port || '3000'}`
      : process.env.NEXT_PUBLIC_API_URL;
      
    return `${baseUrl}/verify/${proofId}/${jsonData.certificate_id}`;
  };

  const printQRCode = async () => {
    if (!proofId || !jsonData) return;
    
    try {
      // Create a high-resolution version of the QR code for printing
      const qrCodeUrl = getVerificationUrl();
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      // Set up the print content with proper sizing for 4" label
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print QR Code</title>
            <style>
              @page {
                size: 4in 4in;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                width: 4in;
                height: 4in;
                background-color: white;
              }
              .qr-container {
                width: 3.8in;
                height: 3.8in;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
              }
              .qr-code {
                width: 3.5in;
                height: 3.5in;
              }
              .qr-label {
                font-family: Arial, sans-serif;
                font-size: 10pt;
                margin-top: 0.1in;
                text-align: center;
                word-break: break-all;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="qr-code">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(qrCodeUrl)}" width="100%" height="100%" />
              </div>
              <div class="qr-label">
                ${jsonData.certificate_id}
              </div>
            </div>
            <script>
              // Print automatically when loaded
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
    } catch (error) {
      console.error('Printing failed:', error);
      alert(`Printing failed: ${error.message}`);
    }
  };
  
  const isSubmitDisabled = isSubmitting || !isValidJson || validationErrors.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Material Verification Portal</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Material Certification</h2>          
          <div className="mb-4 flex space-x-4">
            <button
              onClick={() => switchTemplate('aluminum')}
              className={`px-4 py-2 rounded ${
                currentTemplate === 'aluminum' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Aluminum Bar
            </button>
            <button
              onClick={() => switchTemplate('copper')}
              className={`px-4 py-2 rounded ${
                currentTemplate === 'copper' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Copper Sheet
            </button>
            <button
              onClick={() => switchTemplate('steel')}
              className={`px-4 py-2 rounded ${
                currentTemplate === 'steel' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Stainless Steel Rod
            </button>
          </div>
  
          <div className="border rounded-lg overflow-hidden" style={{ height: "800px" }}>
            <Editor
              key={editorKey}
              height="800px"
              language="json"
              value={jsonString}
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
                value={getVerificationUrl()}
                size={200}
                marginSize={4}
              />
              
              <div className="mt-4 flex gap-4">
                <button
                  onClick={printQRCode}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Print QR Code (4")
                </button>
              </div>
              
              <p className="mt-4 text-sm">
                Verification URL: <a href={getVerificationUrl()} className="text-blue-600 underline">
                  {getVerificationUrl()}
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
