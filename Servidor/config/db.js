const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  connectTimeout: 20000, // 10 segundos
});

// Verificación de la conexión al iniciar la aplicación
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a la base de datos establecida con éxito.');
    connection.release(); // Devolver la conexión al pool
  })
  .catch(err => {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  });

// Exportamos el pool directamente
module.exports = pool;