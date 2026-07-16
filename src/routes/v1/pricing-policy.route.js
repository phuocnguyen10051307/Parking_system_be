import express from 'express'

import { pricingPolicyController } from '../../controllers/pricing-policy.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router.get('/active', pricingPolicyController.getActivePricingPolicy)

Router.use(authMiddleware.authorizeRoles('ADMIN', 'MANAGER'))

Router.route('/').get(pricingPolicyController.getPricingPolicies).post(pricingPolicyController.createPricingPolicy)
Router.put('/:id', pricingPolicyController.updatePricingPolicy)

export const pricingPolicyRoute = Router
