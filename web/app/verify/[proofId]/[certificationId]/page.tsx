import { use } from 'react';
import VerificationClient from './client';

export default function VerificationPage({
  params,
}: {
  params: Promise<{ proofId: string; certificationId: string }>;
}) {
  const resolvedParams = use(params);
  const proofId = resolvedParams.proofId;
  const certificationId = resolvedParams.certificationId;
  
  return (
    <VerificationClient 
      proofId={proofId} 
      certificationId={certificationId} 
    />
  );
}