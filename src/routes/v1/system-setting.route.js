import express from 'express'

import { systemSettingController } from '../../controllers/system-setting.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)
Router.use(authMiddleware.authorizeRoles('ADMIN'))

Router.route('/').get(systemSettingController.getSettings).put(systemSettingController.updateSettings)

export const systemSettingRoute = Router
