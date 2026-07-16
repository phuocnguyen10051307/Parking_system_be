import express from 'express'

import { zoneController } from '../../controllers/zone.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)
Router.use(authMiddleware.authorizeRoles('ADMIN', 'MANAGER'))

Router.route('/').get(zoneController.getZones).post(zoneController.createZone)

Router.route('/:id').put(zoneController.updateZone).delete(zoneController.deleteZone)

export const zoneRoute = Router
