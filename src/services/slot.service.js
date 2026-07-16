import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']
const SLOT_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED']
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED']

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

const validateIsActive = (isActive) => {
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'isActive must be a boolean')
  }
}

const parseIsActiveQuery = (isActive) => {
  if (isActive === undefined) {
    return undefined
  }

  if (isActive === 'true') {
    return true
  }

  if (isActive === 'false') {
    return false
  }

  throw new ApiError(StatusCodes.BAD_REQUEST, 'isActive query must be true or false')
}

const parseReservationWindow = (startTime, endTime) => {
  if (!startTime && !endTime) {
    return null
  }

  if (!startTime || !endTime) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startTime and endTime must be provided together')
  }

  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startTime and endTime must be valid dates')
  }

  if (start >= end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'endTime must be later than startTime')
  }

  return { start, end }
}

const getZoneForSlot = async (zoneId) => {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    include: {
      floor: true,
    },
  })

  if (!zone) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Zone not found')
  }

  return zone
}

const ensureSlotCodeAvailable = async (slotCode, excludeId) => {
  const duplicatedSlot = await prisma.parkingSlot.findUnique({
    where: { slotCode },
  })

  if (duplicatedSlot && duplicatedSlot.id !== excludeId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Slot code already exists')
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
  const { vehicleType, startTime, endTime } = query

  validateVehicleType(vehicleType)

  const reservationWindow = parseReservationWindow(startTime, endTime)
  const where = {
    isActive: true,
    status: 'AVAILABLE',
    ...(vehicleType && { vehicleType }),
    ...(reservationWindow && {
      reservations: {
        none: {
          status: {
            in: ACTIVE_RESERVATION_STATUSES,
          },
          startTime: { lt: reservationWindow.end },
          endTime: { gt: reservationWindow.start },
        },
      },
    }),
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

const getAdminSlots = async (query) => {
  const { vehicleType, status, zoneId } = query
  const isActive = parseIsActiveQuery(query.isActive)

  validateVehicleType(vehicleType)
  validateSlotStatus(status)

  const where = {
    ...(zoneId && { zoneId }),
    ...(vehicleType && { vehicleType }),
    ...(status && { status }),
    ...(isActive !== undefined && { isActive }),
  }

  const slots = await prisma.parkingSlot.findMany({
    where,
    select: slotSelect,
    orderBy: [
      {
        zone: {
          floor: {
            building: {
              name: 'asc',
            },
          },
        },
      },
      {
        zone: {
          floor: {
            floorNumber: 'asc',
          },
        },
      },
      {
        zone: {
          name: 'asc',
        },
      },
      {
        slotCode: 'asc',
      },
    ],
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

const getAdminSlotById = async (slotId) => {
  const slot = await prisma.parkingSlot.findUnique({
    where: {
      id: slotId,
    },
    select: slotSelect,
  })

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Slot not found')
  }

  return slot
}

const createSlot = async (payload) => {
  const normalizedSlotCode = payload.slotCode.trim()

  validateSlotStatus(payload.status)
  validateIsActive(payload.isActive)
  await ensureSlotCodeAvailable(normalizedSlotCode)

  const zone = await getZoneForSlot(payload.zoneId)

  return prisma.parkingSlot.create({
    data: {
      zoneId: payload.zoneId,
      slotCode: normalizedSlotCode,
      vehicleType: zone.floor.vehicleType,
      status: payload.status,
      isActive: payload.isActive,
    },
    select: slotSelect,
  })
}

const updateSlot = async (slotId, payload) => {
  const normalizedSlotCode = payload.slotCode.trim()

  validateSlotStatus(payload.status)
  validateIsActive(payload.isActive)
  await ensureSlotCodeAvailable(normalizedSlotCode, slotId)

  const zone = await getZoneForSlot(payload.zoneId)

  return prisma.parkingSlot.update({
    where: { id: slotId },
    data: {
      zoneId: payload.zoneId,
      slotCode: normalizedSlotCode,
      vehicleType: zone.floor.vehicleType,
      status: payload.status,
      isActive: payload.isActive,
    },
    select: slotSelect,
  })
}

const deleteSlot = async (slotId) => {
  const [sessionCount, reservationCount] = await Promise.all([
    prisma.parkingSession.count({
      where: {
        slotId,
      },
    }),
    prisma.reservation.count({
      where: {
        slotId,
      },
    }),
  ])

  if (sessionCount > 0 || reservationCount > 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cannot delete slot because it has parking sessions or reservations'
    )
  }

  return prisma.parkingSlot.delete({
    where: { id: slotId },
  })
}

export const slotService = {
  createSlot,
  deleteSlot,
  getAdminSlotById,
  getAdminSlots,
  getSlots,
  getAvailableSlots,
  getSlotById,
  updateSlot,
}
