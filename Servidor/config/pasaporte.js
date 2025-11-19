const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const dotenv = require("dotenv");
const pool = require("../config/db.js");

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Recibido de Google - Refresh Token:", refreshToken);
      const connection = await pool.getConnection();
      try {
        const googleId = profile.id;
        const nombre = profile.displayName;
        const email = (profile.emails && profile.emails[0]?.value) || null;
        const foto = (profile.photos && profile.photos[0]?.value) || null;

        const [rows] = await connection.query("SELECT * FROM usuarios WHERE google_id = ?", [googleId]);
        
        let user;
        if (rows.length > 0) {
          user = rows[0];
          console.log(`👤 Usuario encontrado: ${user.nombre}`);
          if (refreshToken) {
            console.log(`Actualizando refresh_token para ${user.nombre}`);
            await connection.query("UPDATE usuarios SET refresh_token = ? WHERE id = ?", [refreshToken, user.id]);
            user.refresh_token = refreshToken;
          }
        } else {
          console.log(`🆕 Creando nuevo usuario: ${nombre}`);
          await connection.beginTransaction();
          const [result] = await connection.query(
            "INSERT INTO usuarios (google_id, nombre, email, avatar_url, refresh_token) VALUES (?, ?, ?, ?, ?)",
            [googleId, nombre, email, foto, refreshToken]
          );
          const newUserId = result.insertId;
          await connection.query("INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)", [newUserId, 1]);
          await connection.commit();
          user = { id: newUserId, google_id: googleId, nombre, email, avatar_url: foto, refresh_token: refreshToken };
        }

        let [roles] = await connection.query(`SELECT r.nombre FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`, [user.id]);
        if (roles.length === 0) {
          console.log(`Asignando rol por defecto a ${user.nombre}.`);
          await connection.query("INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)", [user.id, 1]);
          [roles] = await connection.query(`SELECT r.nombre FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`, [user.id]);
        }
        user.roles = roles.map(r => r.nombre);

        return done(null, user);
      } catch (err) {
        if (connection) await connection.rollback();
        return done(err, null);
      } finally {
        if (connection) connection.release();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [id]);
        if (rows.length > 0) {
            const user = rows[0];
            const [roles] = await pool.query(`SELECT r.nombre FROM roles r JOIN usuario_roles ur ON r.id = ur.rol_id WHERE ur.usuario_id = ?`,[user.id]);
            user.roles = roles.map(r => r.nombre);
            done(null, user);
        } else {
            done(new Error("Usuario no encontrado"), null);
        }
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;


