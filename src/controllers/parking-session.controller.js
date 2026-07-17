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

const checkInParkingByPlate = asyncHandler(async (req, res) => {
  const session = await parkingSessionService.checkInParkingByPlate(req.user, req.body, req.file)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Parking session checked in successfully',
    data: session,
  })
})

const estimateParkingSessionFee = asyncHandler(async (req, res) => {
  const parkingSessionId = req.params.id || req.body.id
  const summary = await parkingSessionService.estimateParkingSessionFee(req.user, parkingSessionId)

  res.status(StatusCodes.OK).json({
    success: true,
    data: summary,
  })
})

const createCheckoutPaymentLink = asyncHandler(async (req, res) => {
  const parkingSessionId = req.params.id || req.body.id
  const result = await parkingSessionService.createCheckoutPaymentLink(req.user, parkingSessionId, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Checkout payment link created successfully',
    data: result,
  })
})

const checkOutParkingSession = asyncHandler(async (req, res) => {
  const parkingSessionId = req.params.id || req.body.id
  const session = await parkingSessionService.checkOutParkingSession(req.user, parkingSessionId, req.body, req.file)

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
  checkInParkingByPlate,
  estimateParkingSessionFee,
  createCheckoutPaymentLink,
  checkOutParkingSession,
}
