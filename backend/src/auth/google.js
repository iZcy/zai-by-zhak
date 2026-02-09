// Google OAuth configuration
// This file exports Google OAuth configuration constants

export const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://zai.izcy.tech/api/auth/google/callback',
  scopes: ['profile', 'email'],
  authURL: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenURL: 'https://oauth2.googleapis.com/token'
};

export const getGoogleAuthURL = (redirectURI) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CONFIG.clientId,
    redirect_uri: redirectURI || GOOGLE_CONFIG.callbackURL,
    response_type: 'code',
    scope: GOOGLE_CONFIG.scopes.join(' ')
  });

  return `${GOOGLE_CONFIG.authURL}?${params.toString()}`;
};

export default { GOOGLE_CONFIG, getGoogleAuthURL };
