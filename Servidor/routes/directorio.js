const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { google } = require('googleapis');
const db = require('../config/db');

// Configuración del cliente OAuth2 de Google
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

router.get('/search', protect, async (req, res) => {
  const query = req.query.q || '';
  if (query.length < 3) {
    return res.json([]); // No buscar si la consulta es muy corta
  }

  try {
    // 1. Obtener el refresh_token del usuario que está buscando
    const [users] = await db.query('SELECT refresh_token FROM usuarios WHERE id = ?', [req.user.id]);
    if (!users.length || !users[0].refresh_token) {
      return res.status(401).json({ message: 'No se pudo autenticar con Google. Por favor, vuelve a iniciar sesión.' });
    }
    oauth2Client.setCredentials({ refresh_token: users[0].refresh_token });

    // 2. Usar la People API para buscar en el directorio
    const service = google.people({ version: 'v1', auth: oauth2Client });
    const response = await service.people.searchDirectoryPeople({
      query: query,
      readMask: 'names,emailAddresses',
      sources: [
        'DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT', 
        'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'
      ],
    });

    const people = response.data.people || [];
    const suggestions = people
      .map(person => {
        const nombre = person.names && person.names.length > 0 ? person.names[0].displayName : '';
        const email = person.emailAddresses && person.emailAddresses.length > 0 ? person.emailAddresses[0].value : '';
        const avatar_url = person.photos && person.photos.length > 0 ? person.photos[0].url : null;
        return { nombre, email, avatar_url };
      })
      .filter(p => p.email); // Filtrar por si alguno no tiene email

    res.json(suggestions);
  } catch (error) {
    console.error('Error al buscar en el directorio de Google:', error);
    res.status(500).json({ error: "Error al buscar en el directorio" });
  }
});

// POST /api/directorio/by-emails - Obtener contactos por sus emails (lógica mejorada)
router.post('/by-emails', protect, async (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array de emails.' });
  }

  try {
    const placeholders = emails.map(() => '?').join(',');
    const [contactosLocales] = await db.query(
      `SELECT nombre, email, avatar_url FROM usuarios WHERE email IN (${placeholders})`,
      emails
    );

    const emailsEncontrados = contactosLocales.map(c => c.email);
    const emailsNoEncontrados = emails.filter(email => !emailsEncontrados.includes(email));

    let contactosDeGoogle = [];
    if (emailsNoEncontrados.length > 0) {
      // Usar la People API para buscar los emails restantes
      const [users] = await db.query('SELECT refresh_token FROM usuarios WHERE id = ?', [req.user.id]);
      if (users.length > 0 && users[0].refresh_token) {
        oauth2Client.setCredentials({ refresh_token: users[0].refresh_token });
        const service = google.people({ version: 'v1', auth: oauth2Client });

        const searchPromises = emailsNoEncontrados.map(email => 
          service.people.searchDirectoryPeople({
            query: email,
            readMask: 'names,emailAddresses,photos',
            sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'],
          }).then(response => {
            const person = response.data.people && response.data.people[0];
            if (person) {
              return {
                nombre: person.names?.[0]?.displayName || email,
                email: person.emailAddresses?.[0]?.value || email,
                avatar_url: person.photos?.[0]?.url || null,
              };
            }
            // Si no se encuentra en Google, devolver un objeto básico para mostrar el email
            return { nombre: email, email: email, avatar_url: null };
          })
        );
        
        const resultadosGoogle = await Promise.all(searchPromises);
        contactosDeGoogle = resultadosGoogle.filter(c => c !== null);
      }
    }

    // Combinar ambos resultados y eliminar duplicados si los hubiera
    const todosLosContactosMap = new Map();
    [...contactosLocales, ...contactosDeGoogle].forEach(c => todosLosContactosMap.set(c.email, c));
    const todosLosContactos = Array.from(todosLosContactosMap.values());
    
    res.json(todosLosContactos);

  } catch (err) {
    console.error("Error al obtener contactos por email:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
