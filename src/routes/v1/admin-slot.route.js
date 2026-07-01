import express from 'express'

import { slotController } from '../../controllers/slot.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)
Router.use(authMiddleware.authorizeRoles('ADMIN', 'MANAGER'))

Router.route('/').get(slotController.getAdminSlots).post(slotController.createSlot)

Router.route('/:id').get(slotController.getAdminSlotById).put(slotController.updateSlot).delete(slotController.deleteSlot)

export const adminSlotRoute = Router
