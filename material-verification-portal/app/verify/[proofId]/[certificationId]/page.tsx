import VerificationClient from './client';

export default async function VerificationPage({
  params,
}: {
  params: { proofId: string; certificationId: string };
}) {
  // In a Server Component, we can safely await the params
  const proofId = params.proofId;
  const certificationId = params.certificationId;
  
  // Pass the params to the Client Component
  return <VerificationClient proofId={proofId} certificationId={certificationId} />;
}