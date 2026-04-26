import { OAuth2Client } from 'google-auth-library';
import { logger } from '../logger.js';

// The Client ID from your Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID Token
 * This is the recommended way to authenticate Agents/Services 
 * that have a Google Identity.
 */
export async function verifyGoogleToken(token) {
    if (!token) return null;
    
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        // Return a standard user object compatible with our RBAC
        return {
            id: payload['sub'],
            email: payload['email'],
            name: payload['name'],
            // By default, Google-verified identities are guests 
            // unless we map them specifically
            roles: ['guest', 'verified_agent'] 
        };
    } catch (error) {
        logger.warn({ error: error.message }, "Google Token verification failed");
        return null;
    }
}
