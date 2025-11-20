const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { protect } = require("../middleware/authMiddleware");
const { google } = require("googleapis");
const oauth2Client = require("../config/googleClient");

// GET /api/reservas - Obtener todas las reservas en un rango de fechas
router.get("/", protect, async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Se requieren fechas de inicio y fin." });
  }

  try {
    const [reservas] = await db.query(
      `SELECT 
        r.*, 
        s.nombre as sala_nombre, 
        s.color as sala_color,
        u.nombre as usuario_nombre,
        (SELECT GROUP_CONCAT(invitado_email) FROM reserva_invitados WHERE reserva_id = r.id) as invitados,
        (SELECT GROUP_CONCAT(e.nombre) FROM reserva_equipos re JOIN equipos e ON re.equipo_id = e.id WHERE re.reserva_id = r.id) as equipos
      FROM reservas r 
      JOIN salas s ON r.sala_id = s.id 
      JOIN usuarios u ON r.usuario_id = u.id 
      WHERE r.fecha_inicio < ? AND r.fecha_fin > ?`,
      [endDate, startDate]
    );

    // Convertir las cadenas de texto de invitados/equipos en arrays
    const resultado = reservas.map((r) => ({
      ...r,
      invitados: r.invitados ? r.invitados.split(",") : [],
      equipos: r.equipos ? r.equipos.split(",") : [],
    }));

    res.json(resultado);
  } catch (err) {
    console.error("Error al obtener reservas:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/reservas/hoy - Obtener todas las reservas para el día actual
router.get("/hoy", protect, async (req, res) => {
  try {
    const hoy = new Date();
    const inicioDelDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDelDia = new Date(hoy.setHours(23, 59, 59, 999));

    const [reservas] = await db.query(
      `SELECT
         r.titulo, r.fecha_inicio, r.fecha_fin,
         s.nombre as sala_nombre,
         s.color as sala_color,
         u.nombre as usuario_nombre,
         r.usuario_id,
         (SELECT GROUP_CONCAT(invitado_email) FROM reserva_invitados WHERE reserva_id = r.id) as invitados
       FROM reservas r
       JOIN salas s ON r.sala_id = s.id
       JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.status = 'confirmada' AND r.fecha_inicio < ? AND r.fecha_fin > ?
       ORDER BY r.fecha_inicio`,
      [finDelDia, inicioDelDia]
    );

    const resultado = reservas.map((r) => ({
      ...r,
      invitados: r.invitados ? r.invitados.split(",") : [],
    }));
    res.json(resultado);
  } catch (err) {
    console.error("Error al obtener las reservas de hoy:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/reservas/mis-activas - Obtener mis reservas activas (futuras)
router.get("/mis-activas", protect, async (req, res) => {
  const currentUser = req.user;
  try {
    const [reservas] = await db.query(
      `SELECT DISTINCT
         r.id, r.titulo, r.descripcion, r.fecha_inicio, r.fecha_fin, r.meet_link,
         s.nombre as sala_nombre,
         s.color as sala_color,
         u.nombre as usuario_nombre,
         r.usuario_id,
         (SELECT GROUP_CONCAT(invitado_email) FROM reserva_invitados WHERE reserva_id = r.id) as invitados,
         (SELECT GROUP_CONCAT(e.nombre) FROM reserva_equipos re JOIN equipos e ON re.equipo_id = e.id WHERE re.reserva_id = r.id) as equipos
       FROM reservas r
       JOIN salas s ON r.sala_id = s.id
       JOIN usuarios u ON r.usuario_id = u.id
       LEFT JOIN reserva_invitados ri ON r.id = ri.reserva_id
       WHERE
         r.status = 'confirmada' AND
         r.fecha_fin > CONVERT_TZ(NOW(), 'UTC', 'America/Mexico_City') AND
         (r.usuario_id = ? OR ri.invitado_email = ?)
       ORDER BY r.fecha_inicio`,
      [currentUser.id, currentUser.email]
    );

    const resultado = reservas.map((r) => ({
      ...r,
      invitados: r.invitados ? r.invitados.split(",") : [],
    }));
    res.json(resultado);
  } catch (err) {
    console.error("Error al obtener mis reservas activas:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /api/reservas - Crear una nueva reserva (Lógica Simplificada)
router.post("/", protect, async (req, res) => {
  const {
    sala_id,
    titulo,
    descripcion,
    fecha_inicio,
    fecha_fin,
    invitados,
    equipos,
  } = req.body;
  const solicitante = req.user;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    if (!fecha_inicio ||!fecha_fin || new Date(fecha_fin) <= new Date(fecha_inicio)
    ) {
      await connection.rollback();
      return res.status(400).json({ message: "El rango de fechas es inválido." });
    }

    const fechaInicioMySQL = new Date(fecha_inicio).toISOString().slice(0, 19).replace('T', ' ');
    const fechaFinMySQL = new Date(fecha_fin).toISOString().slice(0, 19).replace('T', ' ');

    // Verificar traslapes de horario
    const [traslapes] = await connection.query(
      'SELECT * FROM reservas WHERE sala_id = ? AND status = "confirmada" AND fecha_inicio < ? AND fecha_fin > ?',
      [sala_id, fechaFinMySQL, fechaInicioMySQL]
    );

    if (traslapes.length > 0) {
      await connection.rollback();
      return res.status(409).json({message: "Conflicto de horario. La sala ya está reservada en ese período.",});
    }

    // Si no hay conflicto, proceder con la creación
    const [users] = await connection.query(
      "SELECT refresh_token FROM usuarios WHERE id = ?",
      [solicitante.id]
    );
    if (!users.length || !users[0].refresh_token) {
      await connection.rollback();
      return res
        .status(401)
        .json({ message: "No se pudo autenticar con Google Calendar." });
    }
    oauth2Client.setCredentials({ refresh_token: users[0].refresh_token });

    const [salas] = await connection.query(
      "SELECT calendar_id FROM salas WHERE id = ?",
      [sala_id]
    );
    const roomEmail = salas.length > 0 ? salas[0].calendar_id : null;

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    //  Preparamos la lista de asistentes
    let eventAttendees = invitados ? invitados.map((email) => ({ email })) : [];

    // SI existe el email de la sala, lo agregamos a la lista de asistentes
    if (roomEmail) {
      eventAttendees.push({ email: roomEmail, resource: true });
    }
    const event = {
      summary: titulo,
      description: `Descripción: ${descripcion || "N/A"}`,
      start: { dateTime: new Date(fecha_inicio).toISOString(), timeZone: "America/Mexico_City",
      },
      end: { dateTime: new Date(fecha_fin).toISOString(), timeZone: "America/Mexico_City",
      },
      attendees: eventAttendees,
      conferenceData: {
        createRequest: {
          requestId: `reserva-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };
    const createdEvent = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    const newReserva = {
      usuario_id: solicitante.id,
      sala_id,
      evento_calendar_id: createdEvent.data.id,
      meet_link: createdEvent.data.hangoutLink,
      titulo,
      descripcion,
      fecha_inicio: fechaInicioMySQL,
      fecha_fin: fechaFinMySQL,
      status: "confirmada",
    };
    const [result] = await connection.query(
      "INSERT INTO reservas SET ?",
      newReserva
    );
    const newReservaId = result.insertId;

    // 7. Guardar invitados (asegurando que el creador esté incluido)
    const allInvitados = [
      ...new Set([...(invitados || []), solicitante.email]),
    ];
    if (allInvitados.length > 0) {
      const invitadoValues = allInvitados.map((email) => [newReservaId, email]);
      await connection.query(
        "INSERT INTO reserva_invitados (reserva_id, invitado_email) VALUES ?",
        [invitadoValues]
      );
    }

    // 8. Guardar equipo solicitado
    if (equipos && equipos.length > 0) {
      const equipoValues = equipos.map((equipoId) => [
        newReservaId,
        equipoId,
        solicitante.id,
      ]);
      await connection.query(
        "INSERT INTO reserva_equipos (reserva_id, equipo_id, usuario_id) VALUES ?",
        [equipoValues]
      );
    }

    await connection.commit();

    res.status(201).json({ id: newReservaId, ...newReserva });
  } catch (err) {
    await connection.rollback();
    console.error("Error al crear la reserva:", err);
    if (err.code === 403) {
      return res
        .status(403)
        .json({
          message:
            "Permisos insuficientes en Google Calendar. Verifica tu conexión.",
        });
    }
    res.status(500).json({ error: "Error al procesar la reserva." });
  } finally {
    connection.release();
  }
});

// PUT /api/reservas/:id - Actualizar una reserv
router.put("/:id", protect, async (req, res) => {
  const reservaId = req.params.id;
  const {
    sala_id,
    titulo,
    descripcion,
    fecha_inicio,
    fecha_fin,
    invitados,
    equipos,
  } = req.body;
  const usuarioActual = req.user;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    
    const fechaInicioMySQL = new Date(fecha_inicio).toISOString().slice(0, 19).replace('T', ' ');
    const fechaFinMySQL = new Date(fecha_fin).toISOString().slice(0, 19).replace('T', ' ');

    // 1. Obtener datos de la reserva y verificar propiedad
    const [reservas] = await connection.query(
      "SELECT r.*, u.refresh_token FROM reservas r JOIN usuarios u ON r.usuario_id = u.id WHERE r.id = ?",
      [reservaId]
    );
    if (reservas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Reserva no encontrada." });
    }
    const reserva = reservas[0];
    if (reserva.usuario_id !== usuarioActual.id) {
      await connection.rollback();
      return res
        .status(403)
        .json({ message: "No tienes permiso para editar esta reserva." });
    }

    // 2. Verificar conflictos de horario si la sala o fechas cambian (solo en la BD)
    if (
      sala_id !== reserva.sala_id ||
      fecha_inicio !== reserva.fecha_inicio ||
      fecha_fin !== reserva.fecha_fin
    ) {
      const [traslapes] = await connection.query(
        'SELECT id FROM reservas WHERE sala_id = ? AND status = "confirmada" AND id != ? AND fecha_inicio < ? AND fecha_fin > ?',
        [sala_id, reservaId, fechaFinMySQL, fechaInicioMySQL]
      );
      if (traslapes.length > 0) {
        await connection.rollback();
        return res
          .status(409)
          .json({
            message: "Conflicto de horario en la nueva sala o período.",
          });
      }
    }

    // 3. Lógica de Google Calendar: Actualizar el evento
    oauth2Client.setCredentials({ refresh_token: reserva.refresh_token });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const [salaInfo] = await connection.query(
      "SELECT calendar_id FROM salas WHERE id = ?",
      [sala_id]
    );
    const roomEmail = salaInfo.length > 0 ? salaInfo[0].calendar_id : null;

    let eventAttendees = invitados ? invitados.map((email) => ({ email })) : [];

    // Asegurarse de incluir el email de la sala original si existe
    if (roomEmail) {
      eventAttendees.push({ email: roomEmail, resource: true });
    }

    // Actualizar detalles del evento
    // Nota: Para Google Calendar SÍ usamos las fechas originales (ISO)
    const eventoParcial = {
      summary: titulo,
      description: `Descripción: ${descripcion || "N/A"}`,
      start: {
        dateTime: new Date(fecha_inicio).toISOString(),
        timeZone: "America/Mexico_City",
      },
      end: {
        dateTime: new Date(fecha_fin).toISOString(),
        timeZone: "America/Mexico_City",
      },
      attendees: eventAttendees,
    };

    await calendar.events.patch({
      calendarId: "primary",
      eventId: reserva.evento_calendar_id,
      resource: eventoParcial,
      sendUpdates: "all",
    });

    // 4. Actualizar la base de datos local
    await connection.query(
      "UPDATE reservas SET sala_id = ?, titulo = ?, descripcion = ?, fecha_inicio = ?, fecha_fin = ? WHERE id = ?",
      [sala_id, titulo, descripcion, fechaInicioMySQL, fechaFinMySQL, reservaId]
    );

    // 5. Actualizar invitados en la BD
    await connection.query(
      "DELETE FROM reserva_invitados WHERE reserva_id = ?",
      [reservaId]
    );
    if (invitados && invitados.length > 0) {
      const allInvitados = [...new Set([...invitados, usuarioActual.email])];
      const invitadoValues = allInvitados.map((email) => [reservaId, email]);
      await connection.query(
        "INSERT INTO reserva_invitados (reserva_id, invitado_email) VALUES ?",
        [invitadoValues]
      );
    }

    // 6. Actualizar equipos
    await connection.query("DELETE FROM reserva_equipos WHERE reserva_id = ?", [
      reservaId,
    ]);
    if (equipos && equipos.length > 0) {
      const equipoValues = equipos.map((equipoId) => [
        reservaId,
        equipoId,
        usuarioActual.id,
      ]);
      await connection.query(
        "INSERT INTO reserva_equipos (reserva_id, equipo_id, usuario_id) VALUES ?",
        [equipoValues]
      );
    }

    await connection.commit();
    res.status(200).json({ message: "Reserva actualizada correctamente." });
  } catch (err) {
    await connection.rollback();
    console.error("Error al actualizar la reserva:", err);
    const isGoogleNotFound = 
      err.code === 404 || 
      (err.errors && err.errors.length > 0 && err.errors[0].reason === "notFound");

    if (isGoogleNotFound) {
      return res.status(404).json({ message: "El evento de Google Calendar no fue encontrado." });
    }
    res.status(500).json({ message: "Error interno del servidor." });
  } finally {
    connection.release();
  }
});

// DELETE /api/reservas/:id - Cancelar una reserva
router.delete("/:id", protect, async (req, res) => {
  const reservaId = req.params.id;
  const usuarioActual = req.user;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener los detalles de la reserva, incluyendo el dueño y su refresh_token
    const [reservas] = await connection.query(
      "SELECT r.*, u.id as usuario_id, u.refresh_token FROM reservas r JOIN usuarios u ON r.usuario_id = u.id WHERE r.id = ?",
      [reservaId]
    );

    if (reservas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Reserva no encontrada." });
    }

    const reserva = reservas[0];

    // 2. Verificar permisos: solo el dueño de la reserva o un admin pueden cancelar
    if (
      reserva.usuario_id !== usuarioActual.id &&
      !usuarioActual.roles.includes("admin")
    ) {
      await connection.rollback();
      return res
        .status(403)
        .json({ message: "No tienes permiso para cancelar esta reserva." });
    }

    // 3. Cancelar el evento de Google Calendar
    if (reserva.evento_calendar_id) {
      oauth2Client.setCredentials({ refresh_token: reserva.refresh_token });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      try {
        await calendar.events.delete({
          calendarId: "primary",
          eventId: reserva.evento_calendar_id,
          sendUpdates: "all",
        });
      } catch (googleErr) {
        if (googleErr.code === 404 && googleErr.code !== 410) {
          throw googleErr;
        }
      }
    }

    // 4. Eliminar la reserva de la base de datos
    // ON DELETE CASCADE en las tablas reserva_invitados y reserva_equipos se encargará de limpiar los registros asociados.
    await connection.query("DELETE FROM reservas WHERE id = ?", [reservaId]);

    await connection.commit();

    res.status(200).json({ message: "Reserva cancelada correctamente." });
  } catch (err) {
    await connection.rollback();
    console.error(`Error al cancelar la reserva ${reservaId}:`, err);
    res.status(500).json({ error: "Error al procesar la cancelación." });
  } finally {
    connection.release();
  }
});

module.exports = router;
