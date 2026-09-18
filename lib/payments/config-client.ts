'use server';

import { readPaymentEnv, isProviderConfigured } from './config';

export type SquareClientConfig = {
  applicationId: string;
  locationId: string;
  mode: 'sandbox' | 'live';
};

export async function getSquareClientConfig(): Promise<SquareClientConfig | null> {
  if (!isProviderConfigured('square')) {
    return null;
  }

  // The app ID is different from the access token - it's public and safe for the client
  // We need to read it from a separate env var or derive it
  // For now, we'll use the access token to verify the config exists and return the location ID
  const locationId = readPaymentEnv('SQUARE_LOCATION_ID');
  const mode = readPaymentEnv('SQUARE_MODE') === 'live' ? 'live' : 'sandbox';
  
  // The application ID needs to be set as a separate env var for the client
  // For now, we'll use a placeholder and note that SQUARE_APP_ID needs to be set
  const applicationId = readPaymentEnv('SQUARE_APP_ID');
  
  if (!locationId || !applicationId) {
    return null;
  }

  return {
    applicationId,
    locationId,
    mode,
  };
}
