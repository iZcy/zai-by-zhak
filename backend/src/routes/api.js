import express from 'express'
import * as apiController from '../controllers/apiController.js'

const router = express.Router()

// GET /api - Main endpoint with database status
router.get('/', apiController.getWelcome)

// GET /api/stats - Get item statistics
router.get('/stats', apiController.getStats)

// GET /api/items - Get all items with pagination
router.get('/items', apiController.getItems)

// GET /api/items/:id - Get single item
router.get('/items/:id', apiController.getItem)

// POST /api/items - Create new item
router.post('/items', apiController.createItem)

// PUT /api/items/:id - Update item
router.put('/items/:id', apiController.updateItem)

// PATCH /api/items/:id/archive - Archive item
router.patch('/items/:id/archive', apiController.archiveItem)

// DELETE /api/items/:id - Delete item
router.delete('/items/:id', apiController.deleteItem)

export default router
