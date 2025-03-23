// app/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import Editor from '@monaco-editor/react';

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { handleSubmit } = useForm();
  const [jsonString, setJsonString] = useState<string>(JSON.stringify({
    // Default template that matches your backend expectations
    "materialId": "ALU-12345",
    "materialType": "aluminum",
    "standard": "ASTM-B221-14",
    "privatePropNames": ["chemical_composition_Si", "chemical_composition_Fe"],
    "materialProps": {
      "tensile_strength": 53.9,
      "yield_strength": 50.6,
      "elongation": 16.0,
      "chemical_composition_Si": 0.75,
      "chemical_composition_Fe": 0.25
    }
  }, null, 2));

  const onSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Parse the JSON string to an object
      const jsonData = JSON.parse(jsonString);
      
      const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-proof`, {
        certification: jsonData
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Material Verification Portal</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Material Certification</h2>
          <p className="mb-4">Enter or upload your material certification data below:</p>
          
          <div className="border rounded-lg overflow-hidden" style={{ height: "400px" }}>
            <Editor
              height="400px"
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
        
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Generating...' : 'Generate Proof'}
        </button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {proofId && (
          <div className="mt-6 p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Proof Generated!</h2>
            <p className="mb-4">Scan this QR code or share the link for verification:</p>
            
            <div className="flex flex-col items-center">
              <QRCodeSVG 
                value={`${process.env.NEXT_PUBLIC_API_URL}/verify/${proofId}`}
                size={200}
                includeMargin
              />
              
              <p className="mt-4 text-sm">
                Verification URL: <a href={`/verify/${proofId}`} className="text-blue-600 underline">
                  {process.env.NEXT_PUBLIC_API_URL}/verify/{proofId}
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}