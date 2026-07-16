import { StatusCodes } from 'http-status-codes'

import { zoneService } from '../services/zone.service.js'

const validateZoneBody = (body) => {
  const { floorId, name } = body

  if (!floorId || !name?.trim()) {
    return 'floorId and name are required'
  }

  return null
}

const getZones = async (req, res) => {
  try {
    const zones = await zoneService.getZones()

    return res.status(StatusCodes.OK).json({
      data: zones,
    })
  } catch (error) {
    console.error('Get zones error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const createZone = async (req, res) => {
  try {
    const validationError = validateZoneBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const zone = await zoneService.createZone({
      ...req.body,
      name: req.body.name.trim(),
    })

    return res.status(StatusCodes.CREATED).json({
      message: 'Zone created successfully',
      data: zone,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    console.error('Create zone error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const updateZone = async (req, res) => {
  try {
    const { id } = req.params
    const validationError = validateZoneBody(req.body)

    if (validationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: validationError,
      })
    }

    const zone = await zoneService.updateZone(id, {
      ...req.body,
      name: req.body.name.trim(),
    })

    return res.status(StatusCodes.OK).json({
      message: 'Zone updated successfully',
      data: zone,
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Zone not found',
      })
    }

    console.error('Update zone error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

const deleteZone = async (req, res) => {
  try {
    const { id } = req.params

    await zoneService.deleteZone(id)

    return res.status(StatusCodes.OK).json({
      message: 'Zone deleted successfully',
    })
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      })
    }

    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Zone not found',
      })
    }

    console.error('Delete zone error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

export const zoneController = {
  getZones,
  createZone,
  updateZone,
  deleteZone,
}
