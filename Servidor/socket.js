const { Server } = require("socket.io");

let io;

function init(server) {
  io = new Server(server, {
    transports: ['websocket', 'polling'], // Añadir transports para mayor compatibilidad
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:4200",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Un cliente se ha conectado:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectado:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado.");
  }
  return io;
}

module.exports = { init, getIO };
