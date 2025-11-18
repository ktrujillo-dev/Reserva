const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "127.0.0.1", // o el host del contenedor
  port: 3307,        // el puerto que mapeaste
  user: "root",
  password: "root",
  database: "reserva_salas",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  connectTimeout: 10000, // 10 segundos
});

module.exports = pool.promise();