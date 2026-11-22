/* The agent portal is a separate app on its own subdomain (and its own Vercel
 * project), so every link to it is a real external link, not a React route. */
export const PORTAL_URL = 'https://portal.hotelbridge.co';
export const PORTAL_REGISTER_URL = `${PORTAL_URL}/register`;
export const PORTAL_LOGIN_URL = `${PORTAL_URL}/login`;
