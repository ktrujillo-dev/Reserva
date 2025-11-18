const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL || 'http://localhost:3000'}/api/auth/google/callback` // URI de redirección completa y consistente
);

module.exports = oauth2Client;
