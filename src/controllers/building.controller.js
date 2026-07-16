import { StatusCodes } from 'http-status-codes'

import { buildingService } from '../services/building.service.js'

const validateBuildingBody = (body) => {
  const { name, address, totalFloors } = body

  if (!name || !address || totalFloors === undefined) {
    return 'name, address and totalFloors are required'
  }

  if (Number.isNaN(Number(totalFloors)) || Number(totalFloors) <= 0) {
    return 'totalFloors must be a positive number'
  }

  return null
}

const getBuildings = async (req, res) => {
  try {
    const buildings = await buildingService.getBuildings()

    return res.status(StatusCodes.OK).json({
      data: buildings,
    })
  } catch (error) {
    console.error('Get buildings error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const createBuilding = async (req, res) => {
  try {
    const validationError = validateBuildingBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const building = await buildingService.createBuilding(req.body)

    return res.status(StatusCodes.CREATED).json({
      message: 'Building created successfully',
      data: building,
    })
  } catch (error) {
    console.error('Create building error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params
    const validationError = validateBuildingBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const building = await buildingService.updateBuilding(id, req.body)

    return res.status(StatusCodes.OK).json({
      message: 'Building updated successfully',
      data: building,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Building not found',
      })
    }

    console.error('Update building error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params

    await buildingService.deleteBuilding(id)

    return res.status(StatusCodes.OK).json({
      message: 'Building deleted successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Building not found',
      })
    }

    console.error('Delete building error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

export const buildingController = {
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
}
