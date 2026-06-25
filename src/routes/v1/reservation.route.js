import express from 'express'

import { reservationController } from '../../controllers/reservation.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

Router.use(authMiddleware.protectedRoute)

Router.route('/').get(reservationController.getReservations).post(reservationController.createReservation)

Router.route('/:id').get(reservationController.getReservationById)

Router.route('/:id/cancel').put(reservationController.cancelReservation)

export const reservationRoute = Router
