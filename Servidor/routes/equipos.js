const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Rutas Públicas (para usuarios autenticados) ---

// GET /api/equipos - Obtener toda la lista de equipos disponibles
router.get('/', protect, async (req, res) => {
    try {
        const [equipos] = await db.query('SELECT * FROM equipos WHERE disponible = 1 ORDER BY nombre');
        res.json(equipos);
    } catch (err) {
        console.error("Error al obtener equipos:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// --- Rutas de Administración (solo para admins) ---

// POST /api/equipos - Crear un nuevo equipo
router.post('/', protect, authorize('administrador'), async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre del equipo es requerido.' });
    }
    try {
        const [result] = await db.query('INSERT INTO equipos SET ?', { nombre, descripcion });
        res.status(201).json({ id: result.insertId, nombre, descripcion, disponible: true });
    } catch (err) {
        console.error("Error al crear equipo:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// PUT /api/equipos/:id - Actualizar un equipo existente
router.put('/:id', protect, authorize('administrador'), async (req, res) => {
    const { nombre, descripcion, disponible } = req.body;
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre del equipo es requerido.' });
    }
    try {
        const [result] = await db.query('UPDATE equipos SET ? WHERE id = ?', [{ nombre, descripcion, disponible }, req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }
        res.json({ id: req.params.id, ...req.body });
    } catch (err) {
        console.error(`Error al actualizar equipo ${req.params.id}:`, err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// DELETE /api/equipos/:id - Eliminar un equipo
router.delete('/:id', protect, authorize('administrador'), async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM equipos WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }
        res.status(200).json({ message: 'Equipo eliminado exitosamente' });
    } catch (err) {
        console.error(`Error al eliminar equipo ${req.params.id}:`, err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /api/equipos/historial - Obtener historial de uso de todos los equipos
router.get('/historial', protect, async (req, res) => {
    try {
        const [historial] = await db.query(`
            SELECT 
                e.nombre as equipo_nombre,
                u.nombre as usuario_nombre,
                r.titulo as reserva_titulo,
                s.nombre as sala_nombre,
                re.fecha_asignacion
            FROM reserva_equipos re
            JOIN equipos e ON re.equipo_id = e.id
            JOIN usuarios u ON re.usuario_id = u.id
            JOIN reservas r ON re.reserva_id = r.id
            JOIN salas s ON r.sala_id = s.id
            ORDER BY re.fecha_asignacion DESC
        `);
        res.json(historial);
    } catch (err) {
        console.error("Error al obtener el historial de equipos:", err);
        res.status(500).json({ message: "Error interno del servidor" });
    }
});

module.exports = router;
