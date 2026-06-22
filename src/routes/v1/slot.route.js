import express from 'express'

import { slotController } from '../../controllers/slot.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router.route('/').get(slotController.getSlots)

Router.route('/available').get(slotController.getAvailableSlots)

Router.route('/:id').get(slotController.getSlotById)

export const slotRoute = Router