import express from 'express'

import { parkingMapController } from '../../controllers/parking-map.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router.get('/public-view', parkingMapController.getPublicParkingMap)

export const parkingMapRoute = Router
