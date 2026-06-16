import express from 'express'

import { buildingController } from '../../controllers/building.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router
  .route('/')
  .get(buildingController.getBuildings)
  .post(buildingController.createBuilding)

Router
  .route('/:id')
  .put(buildingController.updateBuilding)
  .delete(buildingController.deleteBuilding)

export const buildingRoute = Router