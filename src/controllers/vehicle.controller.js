import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { vehicleService } from '../services/vehicle.service.js'

const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.getVehicles(req.user, req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: vehicles,
  })
})

const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: vehicle,
  })
})

const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Tạo phương tiện thành công',
    data: vehicle,
  })
})

const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Cập nhật phương tiện thành công',
    data: vehicle,
  })
})

const deleteVehicle = asyncHandler(async (req, res) => {
  await vehicleService.deleteVehicle(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Xóa phương tiện thành công',
  })
})

export const vehicleController = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}