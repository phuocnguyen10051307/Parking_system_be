import express from 'express'

import { feedbackController } from '../../controllers/feedback.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware.protectedRoute)

router.route('/').get(feedbackController.getFeedbacks).post(feedbackController.createFeedback)
router.route('/:id').get(feedbackController.getFeedbackById).put(feedbackController.updateFeedback)

export const feedbackRoute = router
