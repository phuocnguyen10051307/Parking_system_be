import express from 'express'

import { adminUserController } from '../../controllers/admin-user.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)
Router.use(authMiddleware.authorizeRoles('ADMIN'))

Router.get('/', adminUserController.getUsers)
Router.put('/:id', adminUserController.updateUser)
Router.put('/:id/role', adminUserController.updateUserRole)

export const adminUserRoute = Router
