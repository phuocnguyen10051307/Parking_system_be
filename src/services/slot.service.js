import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']
const SLOT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED']

const slotSelect = {
  id: true,
  zoneId: true,
  slotCode: true,
  vehicleType: true,
  status: true,
  isActive: true,
  createdAt: true,
  zone: {
    select: {
      id: true,
      name: true,
      floor: {
        select: {
          id: true,
          floorNumber: true,
          vehicleType: true,
          building: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      },
    },
  },
}

const validateVehicleType = (vehicleType) => {
  if (vehicleType && !VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid vehicle type. Allowed values: MOTORBIKE, CAR, BICYCLE, ELECTRIC_BIKE'
    )
  }
}

const validateSlotStatus = (status) => {
  if (status && !SLOT_STATUSES.includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid slot status. Allowed values: AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, BLOCKED'
    )
  }
}

const getSlots = async (query) => {
  const { vehicleType, status } = query

  validateVehicleType(vehicleType)
  validateSlotStatus(status)

  const where = {
    isActive: true,
    ...(vehicleType && { vehicleType }),
    ...(status && { status }),
  }

  const slots = await prisma.parkingSlot.findMany({
    where,
    select: slotSelect,
    orderBy: {
      slotCode: 'asc',
    },
  })

  return slots
}

const getAvailableSlots = async (query) => {
  const { vehicleType } = query

  validateVehicleType(vehicleType)

  const where = {
    isActive: true,
    status: 'AVAILABLE',
    ...(vehicleType && { vehicleType }),
  }

  const slots = await prisma.parkingSlot.findMany({
    where,
    select: slotSelect,
    orderBy: {
      slotCode: 'asc',
    },
  })

  return slots
}

const getSlotById = async (slotId) => {
  const slot = await prisma.parkingSlot.findFirst({
    where: {
      id: slotId,
      isActive: true,
    },
    select: slotSelect,
  })

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found')
  }

  return slot
}

export const slotService = {
  getSlots,
  getAvailableSlots,
  getSlotById,
}