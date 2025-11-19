const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('../config/pasaporte');

// Redirigir a Google. Passport usará la configuración definida en pasaporte.js
router.get("/google", passport.authenticate("google",{
  scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/directory.readonly",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.send"
    ],
    accessType: "offline"
}));

// Callback de Google
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const payload = {
      user: {
        id: req.user.id,
        nombre: req.user.nombre,
        email: req.user.email,
        roles: req.user.roles,
        avatar_url: req.user.avatar_url
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '8h'
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

module.exports = router;

