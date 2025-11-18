const mysql = require("mysql2/promise");

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "127.0.0.1", // o el host del contenedor
      port: 3307,        // el puerto que mapeaste
      user: "root",
      password: "root",
      database: "reserva_salas"
    });

    console.log("✅ Conexión exitosa a MySQL");
    await connection.end();
  } catch (err) {
    console.error("❌ Error al conectar a MySQL:", err);
  }
}

testConnection();
