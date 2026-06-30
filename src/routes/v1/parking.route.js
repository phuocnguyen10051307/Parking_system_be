import express from 'express'

import { parkingSessionController } from '../../controllers/parking-session.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { upload } from '../../middlewares/upload.js'

const router = express.Router()

router.use(authMiddleware.protectedRoute)
router.use(authMiddleware.authorizeRoles('ADMIN', 'MANAGER', 'STAFF'))

router.post('/check-in', upload.single('image'), parkingSessionController.checkInParkingByPlate)

export const parkingRoute = router
