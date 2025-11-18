const nodemailer = require('nodemailer');
const oauth2Client = require('../config/googleClient'); // <-- USAR EL CLIENTE CENTRALIZADO

const sendEmail = async ({ from, to, subject, html, refreshToken }) => {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    
    const { token: accessToken } = await oauth2Client.getAccessToken();
    if (!accessToken) {
      throw new Error('El refresh token es inválido o expiró. El usuario necesita volver a autenticarse.');
    }
    console.log("Access token generado exitosamente.");


    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: from,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: refreshToken,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: `"Sistema de Reservas" <${from}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Correo de notificación enviado:', result);
    return result;
  } catch (error) {
    console.error('Error detallado al enviar el correo de notificación:', error);
    throw error;
  }
};

module.exports = { sendEmail };
