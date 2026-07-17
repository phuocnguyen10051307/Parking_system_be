import express from 'express'

import { paymentController } from '../../controllers/payment.controller.js'

const router = express.Router()

router.post('/payos/webhook', paymentController.handlePayOSWebhook)

export const paymentRoute = router
