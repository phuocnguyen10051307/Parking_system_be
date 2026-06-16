import express from 'express'

import { userController } from '../../controllers/user.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router
  .route('/profile')
  .get(userController.getProfile)
  .put(userController.updateProfile)

Router.put('/change-password', userController.changePassword)

export const userRoute = Router