import express from 'express'

import { floorController } from '../../controllers/floor.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)
Router.use(authMiddleware.authorizeRoles('ADMIN', 'MANAGER'))

Router.route('/').get(floorController.getFloors).post(floorController.createFloor)

Router.route('/:id').put(floorController.updateFloor).delete(floorController.deleteFloor)

export const floorRoute = Router
