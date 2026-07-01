import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { slotService } from '../services/slot.service.js'

const validateSlotBody = (body) => {
  const { zoneId, slotCode, status, isActive } = body

  if (!zoneId || !slotCode?.trim() || !status || typeof isActive !== 'boolean') {
    return 'zoneId, slotCode, status and isActive are required'
  }

  return null
}

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

const getAdminSlots = asyncHandler(async (req, res) => {
  const slots = await slotService.getAdminSlots(req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: slots,
  })
})

const getAdminSlotById = asyncHandler(async (req, res) => {
  const slot = await slotService.getAdminSlotById(req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: slot,
  })
})

const createSlot = async (req, res) => {
  try {
    const validationError = validateSlotBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const slot = await slotService.createSlot({
      ...req.body,
      slotCode: req.body.slotCode.trim(),
    })

    return res.status(StatusCodes.CREATED).json({
      message: 'Slot created successfully',
      data: slot,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    console.error('Create slot error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const updateSlot = async (req, res) => {
  try {
    const validationError = validateSlotBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const slot = await slotService.updateSlot(req.params.id, {
      ...req.body,
      slotCode: req.body.slotCode.trim(),
    })

    return res.status(StatusCodes.OK).json({
      message: 'Slot updated successfully',
      data: slot,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Slot not found',
      })
    }

    console.error('Update slot error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const deleteSlot = async (req, res) => {
  try {
    await slotService.deleteSlot(req.params.id)

    return res.status(StatusCodes.OK).json({
      message: 'Slot deleted successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Slot not found',
      })
    }

    console.error('Delete slot error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

export const slotController = {
  createSlot,
  deleteSlot,
  getAdminSlotById,
  getAdminSlots,
  getAvailableSlots,
  getSlotById,
  getSlots,
  updateSlot,
}
