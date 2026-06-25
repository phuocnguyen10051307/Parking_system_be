import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { parkingSessionService } from '../services/parking-session.service.js'

const getParkingSessions = asyncHandler(async (req, res) => {
  const sessions = await parkingSessionService.getParkingSessions(req.user, req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: sessions,
  })
})

const getParkingSessionById = asyncHandler(async (req, res) => {
  const session = await parkingSessionService.getParkingSessionById(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: session,
  })
})

const checkInParkingSession = asyncHandler(async (req, res) => {
  const session = await parkingSessionService.checkInParkingSession(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Parking session checked in successfully',
    data: session,
  })
})

const checkOutParkingSession = asyncHandler(async (req, res) => {
  const session = await parkingSessionService.checkOutParkingSession(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Parking session checked out successfully',
    data: session,
  })
})

export const parkingSessionController = {
  getParkingSessions,
  getParkingSessionById,
  checkInParkingSession,
  checkOutParkingSession,
}
