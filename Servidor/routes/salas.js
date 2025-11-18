const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

// --- Rutas Públicas (para usuarios autenticados) ---

// GET todas las salas
router.get('/', protect, async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM salas WHERE activa = 1');
        res.json(results);
    } catch (err) {
        console.error("Error al obtener salas:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET una sala por ID
router.get('/:id', protect, async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM salas WHERE id = ? AND activa = 1', [req.params.id]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error(`Error al obtener la sala ${req.params.id}:`, err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});


// --- Rutas de Administración (solo para admins) ---

// POST crear una nueva sala
router.post('/', protect, authorize('administrador'), async (req, res) => {
    const { nombre, capacidad, descripcion, calendar_id } = req.body;
    if (!nombre || !capacidad) {
        return res.status(400).json({ message: 'El nombre y la capacidad son requeridos.' });
    }

    try {
        const newRoom = { nombre, capacidad, descripcion, calendar_id, activa: true };
        const [result] = await db.query('INSERT INTO salas SET ?', newRoom);
        res.status(201).json({ id: result.insertId, ...newRoom });
    } catch (err) {
        console.error("Error al crear la sala:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// PUT actualizar una sala existente
router.put('/:id', protect, authorize('administrador'), async (req, res) => {
    const { nombre, capacidad, descripcion, calendar_id, color } = req.body;
    if (!nombre || !capacidad) {
        return res.status(400).json({ message: 'El nombre y la capacidad son requeridos.' });
    }

    try {
        const fieldsToUpdate = { nombre, capacidad, descripcion, calendar_id, color };
        const [result] = await db.query('UPDATE salas SET ? WHERE id = ?', [fieldsToUpdate, req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        res.json({ id: req.params.id, ...fieldsToUpdate });
    } catch (err) {
        console.error(`Error al actualizar la sala ${req.params.id}:`, err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// DELETE una sala (desactivación lógica)
router.delete('/:id', protect, authorize('administrador'), async (req, res) => {
    try {
        // En lugar de borrar, la marcamos como inactiva. Es una mejor práctica.
        const [result] = await db.query('UPDATE salas SET activa = 0 WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sala no encontrada' });
        }
        res.status(200).json({ message: 'Sala desactivada exitosamente' });
    } catch (err) {
        console.error(`Error al desactivar la sala ${req.params.id}:`, err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;

