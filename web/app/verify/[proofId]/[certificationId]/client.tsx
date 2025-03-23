'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function VerificationClient({
  proofId,
  certificationId,
}: {
  proofId: string;
  certificationId: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const localIP = '192.168.1.86';

  const getBackendUrl = () => {
    if (localIP) {
      // Extract port from your NEXT_PUBLIC_BACKEND_URL or use a default
      const backendPort = new URL(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').port || '3000';
      return `http://${localIP}:${backendPort}`;
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  };

  useEffect(() => {
    async function verifyProof() {
      try {
        console.log(`Verifying proof: ${proofId} for certificate: ${certificationId}`);
        
        const response = await axios.post(
          `${getBackendUrl()}/api/verify-proof`, 
          {
            proof_id: proofId,
            certification_id: certificationId
          }
        );
        
        setVerificationData(response.data);
      } catch (err) {
        console.error('Verification error:', err);
        if (axios.isAxiosError(err)) {
          setError(`API Error: ${err.message} (${err.response?.status || 'No status'})`);
        } else {
          setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        setIsLoading(false);
      }
    }

    verifyProof();
  }, [proofId, certificationId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Verifying material certification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-black text-white">
        <h1 className="text-3xl font-bold mb-6">Material Verification</h1>
        <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Verification Failed: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-black text-white">
      <h1 className="text-3xl font-bold mb-6">Material Verification</h1>
      
      <div className="bg-green-900 border border-green-600 text-white px-4 py-3 rounded mb-6">
        <p className="font-semibold">Verification Successful!</p>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Verification Details</h2>
        <p><strong>Proof ID:</strong> {proofId}</p>
        <p><strong>Certificate ID:</strong> {certificationId}</p>
      </div>
      
      {verificationData && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Material Certification Data</h2>
          <div className="bg-gray-800 p-4 rounded overflow-auto">
            <pre className="whitespace-pre-wrap text-blue-300">
              {JSON.stringify(verificationData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
