import express from 'express'

import { parkingSessionController } from '../../controllers/parking-session.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { upload } from '../../middlewares/upload.js'

const router = express.Router()

router.use(authMiddleware.protectedRoute)

router.get('/', parkingSessionController.getParkingSessions)
router.post('/check-in', parkingSessionController.checkInParkingSession)
router.post('/:id/estimate-fee', parkingSessionController.estimateParkingSessionFee)
router.post('/:id/create-payment-link', parkingSessionController.createCheckoutPaymentLink)
router.post('/check-out', upload.single('image'), parkingSessionController.checkOutParkingSession)
router.post('/:id/check-out', upload.single('image'), parkingSessionController.checkOutParkingSession)
router.get('/:id', parkingSessionController.getParkingSessionById)

export const parkingSessionRoute = router
