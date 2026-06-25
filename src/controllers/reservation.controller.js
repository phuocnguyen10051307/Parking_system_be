import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { reservationService } from '../services/reservation.service.js'

const getReservations = asyncHandler(async (req, res) => {
  const reservations = await reservationService.getReservations(req.user, req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: reservations,
  })
})

const getReservationById = asyncHandler(async (req, res) => {
  const reservation = await reservationService.getReservationById(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: reservation,
  })
})

const createReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Reservation created successfully',
    data: reservation,
  })
})

const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await reservationService.cancelReservation(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Reservation cancelled successfully',
    data: reservation,
  })
})

export const reservationController = {
  getReservations,
  getReservationById,
  createReservation,
  cancelReservation,
}
