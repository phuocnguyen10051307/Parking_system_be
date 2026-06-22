import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { slotService } from '../services/slot.service.js'

const getSlots = asyncHandler(async (req, res) => {
  const slots = await slotService.getSlots(req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: slots,
  })
})

const getAvailableSlots = asyncHandler(async (req, res) => {
  const slots = await slotService.getAvailableSlots(req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: slots,
  })
})

const getSlotById = asyncHandler(async (req, res) => {
  const slot = await slotService.getSlotById(req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: slot,
  })
})

export const slotController = {
  getSlots,
  getAvailableSlots,
  getSlotById,
}