import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { parkingMapService } from '../services/parking-map.service.js'

const getPublicParkingMap = asyncHandler(async (req, res) => {
  const buildings = await parkingMapService.getPublicParkingMap(req.user)

  res.status(StatusCodes.OK).json({
    success: true,
    data: buildings,
  })
})

export const parkingMapController = {
  getPublicParkingMap,
}
