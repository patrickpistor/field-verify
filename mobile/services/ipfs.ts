// src/services/ipfs.ts
import { create } from '@web3-storage/w3up-client';
import { CarReader } from '@ipld/car';
import * as Block from 'multiformats/block';
import { encode, decode } from '@ipld/dag-json';

// Store client as a module-level variable
let client = null;

export async function setupStorachaForCustomer(delegationProof: string): Promise<void> {
  try {
    // Create a fresh client
    client = await create();

    // Import the delegation that gives permission to use the space
    // This will allow customers to upload without creating accounts
    await client.capability.import(delegationProof);

    // Set space as the current space
    const spaces = await client.spaces();
    if (spaces.length === 0) {
      throw new Error('No spaces available with delegation');
    }

    // Use the first available space (should be your FieldVerify space)
    await client.setCurrentSpace(spaces[0].did());

    console.log('Customer access to Storacha set up successfully');
  } catch (error) {
    console.error('Failed to set up Storacha:', error);
    throw error;
  }
}

export async function uploadCertification(
  certification: any,
  proof: string
): Promise<string> {
  if (!client) {
    throw new Error('Storacha not initialized - call setupStorachaForCustomer first');
  }

  try {
    // Prepare data
    const data = { certification, proof, timestamp: Date.now() };
    const jsonString = JSON.stringify(data);

    // Create file object for upload
    const fileName = `cert_${Date.now()}.json`;
    const file = new File([jsonString], fileName, { type: 'application/json', lastModified: Date.now() });

    // Upload to Storacha
    const cid = await client.uploadFile(file);

    return cid.toString();
  } catch (error) {
    console.error('Error uploading to Storacha:', error);
    throw error;
  }
}

// Retrieve function doesn't require authentication
export async function retrieveCertification(cid: string): Promise<any> {
  try {
    const gatewayUrl = getGatewayUrl(cid);
    const response = await fetch(gatewayUrl);

    if (!response.ok) {
      throw new Error(`Failed to retrieve: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error retrieving from Storacha:', error);
    throw error;
  }
}

export function getGatewayUrl(cid: string): string {
  return `https://${cid}.ipfs.w3s.link`;
}
