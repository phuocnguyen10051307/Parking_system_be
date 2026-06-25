import express from 'express'

import { parkingSessionController } from '../../controllers/parking-session.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const router = express.Router()

router.use(authMiddleware.protectedRoute)

router.get('/', parkingSessionController.getParkingSessions)
router.post('/check-in', parkingSessionController.checkInParkingSession)
router.post('/check-out', parkingSessionController.checkOutParkingSession)
router.get('/:id', parkingSessionController.getParkingSessionById)

export const parkingSessionRoute = router
