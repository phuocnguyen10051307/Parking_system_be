import express from 'express'

import { vehicleController } from '../../controllers/vehicle.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router
  .route('/')
  .get(vehicleController.getVehicles)
  .post(vehicleController.createVehicle)

Router
  .route('/:id')
  .get(vehicleController.getVehicleById)
  .put(vehicleController.updateVehicle)
  .delete(vehicleController.deleteVehicle)

export const vehicleRoute = Router