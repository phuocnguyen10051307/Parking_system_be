import { StatusCodes } from 'http-status-codes'

import { floorService } from '../services/floor.service.js'

const allowedVehicleTypes = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']

const validateFloorBody = (body) => {
  const { buildingId, floorNumber, vehicleType } = body

  if (!buildingId || floorNumber === undefined || !vehicleType) {
    return 'buildingId, floorNumber and vehicleType are required'
  }

  if (!Number.isInteger(Number(floorNumber))) {
    return 'floorNumber must be an integer'
  }

  if (!allowedVehicleTypes.includes(vehicleType)) {
    return 'vehicleType is invalid'
  }

  return null
}

const getFloors = async (req, res) => {
  try {
    const floors = await floorService.getFloors()

    return res.status(StatusCodes.OK).json({
      data: floors,
    })
  } catch (error) {
    console.error('Get floors error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const createFloor = async (req, res) => {
  try {
    const validationError = validateFloorBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const floor = await floorService.createFloor(req.body)

    return res.status(StatusCodes.CREATED).json({
      message: 'Floor created successfully',
      data: floor,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    console.error('Create floor error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const updateFloor = async (req, res) => {
  try {
    const { id } = req.params
    const validationError = validateFloorBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const floor = await floorService.updateFloor(id, req.body)

    return res.status(StatusCodes.OK).json({
      message: 'Floor updated successfully',
      data: floor,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Floor not found',
      })
    }

    console.error('Update floor error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const deleteFloor = async (req, res) => {
  try {
    const { id } = req.params

    await floorService.deleteFloor(id)

    return res.status(StatusCodes.OK).json({
      message: 'Floor deleted successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Floor not found',
      })
    }

    console.error('Delete floor error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

export const floorController = {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
}
