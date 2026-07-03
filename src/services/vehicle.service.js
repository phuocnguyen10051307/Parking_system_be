import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { compactLicensePlate, formatLicensePlate } from '../utils/license-plate.js'

const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']
const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

const isStaffRole = (role) => STAFF_ROLES.includes(role)

const vehicleSelect = {
  id: true,
  ownerId: true,
  licensePlate: true,
  vehicleType: true,
  brand: true,
  color: true,
  createdAt: true,
  owner: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
}

const validateVehicleType = (vehicleType) => {
  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid vehicle type. Allowed values: MOTORBIKE, CAR, BICYCLE, ELECTRIC_BIKE'
    )
  }
}

const normalizeLicensePlate = (licensePlate) => formatLicensePlate(licensePlate)

const normalizePlateForCompare = (licensePlate) => compactLicensePlate(licensePlate)

const normalizeVehicleResponse = (vehicle) => ({
  ...vehicle,
  licensePlate: normalizeLicensePlate(vehicle.licensePlate),
})

const findVehicleByPlateConflict = async (licensePlate, excludeVehicleId = null) => {
  const targetPlate = normalizePlateForCompare(licensePlate)

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      licensePlate: true,
    },
  })

  return (
    vehicles.find(
      (vehicle) =>
        vehicle.id !== excludeVehicleId && normalizePlateForCompare(vehicle.licensePlate) === targetPlate
    ) || null
  )
}

const getVehicles = async (currentUser, query) => {
  const where = {}

  if (query.vehicleType) {
    validateVehicleType(query.vehicleType)
    where.vehicleType = query.vehicleType
  }

  if (isStaffRole(currentUser.role)) {
    if (query.ownerId) {
      where.ownerId = query.ownerId
    }
  } else {
    where.ownerId = currentUser._id
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: vehicleSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (query.licensePlate) {
    const targetPlate = normalizePlateForCompare(query.licensePlate)
    return vehicles
      .filter((vehicle) => normalizePlateForCompare(vehicle.licensePlate) === targetPlate)
      .map(normalizeVehicleResponse)
  }

  return vehicles.map(normalizeVehicleResponse)
}

const getVehicleById = async (currentUser, vehicleId) => {
  const where = {
    id: vehicleId,
  }

  if (!isStaffRole(currentUser.role)) {
    where.ownerId = currentUser._id
  }

  const vehicle = await prisma.vehicle.findFirst({
    where,
    select: vehicleSelect,
  })

  if (!vehicle) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found')
  }

  return normalizeVehicleResponse(vehicle)
}

const createVehicle = async (currentUser, vehicleData) => {
  const { licensePlate, vehicleType, brand, color, ownerId } = vehicleData

  if (!licensePlate || !vehicleType) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'License plate and vehicle type are required')
  }

  validateVehicleType(vehicleType)

  const finalOwnerId = isStaffRole(currentUser.role) && ownerId ? ownerId : currentUser._id

  const owner = await prisma.user.findUnique({
    where: {
      id: finalOwnerId,
    },
  })

  if (!owner) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Owner not found')
  }

  const normalizedLicensePlate = normalizeLicensePlate(licensePlate)
  const existedVehicle = await findVehicleByPlateConflict(normalizedLicensePlate)

  if (existedVehicle) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'License plate already exists')
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ownerId: finalOwnerId,
      licensePlate: normalizedLicensePlate,
      vehicleType,
      brand,
      color,
    },
    select: vehicleSelect,
  })

  return normalizeVehicleResponse(vehicle)
}

const updateVehicle = async (currentUser, vehicleId, vehicleData) => {
  const { licensePlate, vehicleType, brand, color } = vehicleData

  await getVehicleById(currentUser, vehicleId)

  const data = {}

  if (licensePlate) {
    const normalizedLicensePlate = normalizeLicensePlate(licensePlate)
    const existedVehicle = await findVehicleByPlateConflict(normalizedLicensePlate, vehicleId)

    if (existedVehicle && existedVehicle.id !== vehicleId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'License plate already exists')
    }

    data.licensePlate = normalizedLicensePlate
  }

  if (vehicleType) {
    validateVehicleType(vehicleType)
    data.vehicleType = vehicleType
  }

  if (brand !== undefined) {
    data.brand = brand
  }

  if (color !== undefined) {
    data.color = color
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No data to update')
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: {
      id: vehicleId,
    },
    data,
    select: vehicleSelect,
  })

  return normalizeVehicleResponse(updatedVehicle)
}

const deleteVehicle = async (currentUser, vehicleId) => {
  await getVehicleById(currentUser, vehicleId)

  await prisma.vehicle.delete({
    where: {
      id: vehicleId,
    },
  })

  return true
}

export const vehicleService = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
}
