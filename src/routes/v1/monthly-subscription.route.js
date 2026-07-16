import express from 'express'

import { monthlySubscriptionController } from '../../controllers/monthly-subscription.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router.route('/').get(monthlySubscriptionController.getMonthlySubscriptions).post(monthlySubscriptionController.createMonthlySubscription)
Router.route('/my').get(monthlySubscriptionController.getMyMonthlySubscriptions)
Router.route('/:id').get(monthlySubscriptionController.getMonthlySubscriptionById)
Router.route('/:id/renew').put(monthlySubscriptionController.renewMonthlySubscription)
Router.route('/:id/cancel').put(monthlySubscriptionController.cancelMonthlySubscription)

export const monthlySubscriptionRoute = Router
