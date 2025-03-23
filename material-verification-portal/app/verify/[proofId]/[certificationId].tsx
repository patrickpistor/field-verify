'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

interface PropertyResult {
  property: string;
  value: number | null;
  compliant: boolean;
  is_private: boolean;
}

interface VerificationResult {
  material_id: string;
  material_type: string;
  standard: string;
  timestamp: string;
  verification_id: string;
  overall_compliance: string;
  properties: Record<string, PropertyResult>;
  compliance_summary?: {
    total_properties: number;
    public_properties: number;
    private_properties: number;
    passing_properties: number;
    failing_properties: number;
  };
  zkp_info?: {
    implemented: boolean;
    proof_type: string;
    circuit: string;
    verified: boolean;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const proofId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        setIsLoading(true);
        const res = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verify-proof`, {
          proof_id: proofId
        });
        setVerification(res.data);
      } catch (err) {
        setError('Failed to verify proof');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (proofId) {
      fetchVerification();
    }
  }, [proofId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-pulse text-xl">Verifying proof...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Verification Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">Proof Not Found</h2>
          <p>The specified proof ID could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-3xl">
        <div className={`p-6 border-2 rounded-lg ${
          verification.overall_compliance === "PASS" 
            ? "border-green-500 bg-green-50" 
            : "border-red-500 bg-red-50"
        }`}>
          <h1 className="text-3xl font-bold mb-2">
            Verification {verification.overall_compliance === "PASS" ? "Passed" : "Failed"}
          </h1>
          <p className="text-gray-600 mb-6">
            Verification ID: {verification.verification_id}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-medium text-gray-600">Material ID</h3>
              <p className="font-semibold">{verification.material_id}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-600">Material Type</h3>
              <p className="font-semibold">{verification.material_type}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-600">Standard</h3>
              <p className="font-semibold">{verification.standard}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-600">Verified On</h3>
              <p className="font-semibold">
                {new Date(verification.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Properties</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(verification.properties).map(([key, prop]) => (
                    <tr key={key} className={prop.is_private ? "bg-gray-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {prop.property} {prop.is_private && <span className="text-xs text-gray-500">(Private)</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {prop.is_private ? (
                          <span className="italic text-gray-500">Redacted</span>
                        ) : (
                          prop.value
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          prop.compliant 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }`}>
                          {prop.compliant ? "Compliant" : "Non-Compliant"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {verification.zkp_info && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <h2 className="text-md font-bold mb-2">Zero-Knowledge Proof Verification</h2>
              <p className="text-sm mb-1">
                <span className="font-semibold">Type:</span> {verification.zkp_info.proof_type}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Verification:</span>{" "}
                {verification.zkp_info.verified ? "Valid ✓" : "Invalid ✗"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}