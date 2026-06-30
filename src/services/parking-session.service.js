import { StatusCodes } from 'http-status-codes'
import streamifier from 'streamifier'

import { cloudinary } from '../config/cloudinary.js'
import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']
const HOURLY_RATES = {
  MOTORBIKE: 0.5,
  CAR: 2,
  BICYCLE: 0.25,
  ELECTRIC_BIKE: 1.5,
}
const GRACE_PERIOD_MINUTES = 15

const isStaffRole = (role) => STAFF_ROLES.includes(role)

const parkingSessionSelect = {
  id: true,
  vehicleId: true,
  userId: true,
  slotId: true,
  entryTime: true,
  exitTime: true,
  entryGate: true,
  entryImageUrl: true,
  entryImagePublicId: true,
  exitGate: true,
  exitImageUrl: true,
  exitImagePublicId: true,
  status: true,
  totalFee: true,
  note: true,
  createdAt: true,
  vehicle: {
    select: {
      id: true,
      licensePlate: true,
      vehicleType: true,
      brand: true,
      color: true,
    },
  },
  slot: {
    select: {
      id: true,
      slotCode: true,
      vehicleType: true,
      status: true,
      zone: {
        select: {
          id: true,
          name: true,
          floor: {
            select: {
              id: true,
              floorNumber: true,
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
    },
  },
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
}

const normalizeLicensePlate = (plate = '') =>
  plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

const validateVehicleType = (vehicleType) => {
  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid vehicle type. Allowed values: MOTORBIKE, CAR, BICYCLE, ELECTRIC_BIKE'
    )
  }
}

const uploadVehicleImage = (file, folder) => {
  if (!file) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Vehicle image is required')
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(StatusCodes.BAD_GATEWAY, error?.message || 'Failed to upload image to Cloudinary'))
          return
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        })
      }
    )

    streamifier.createReadStream(file.buffer).pipe(uploadStream)
  })
}

const uploadEntryImage = (file) => uploadVehicleImage(file, 'parking/check-ins')
const uploadExitImage = (file) => uploadVehicleImage(file, 'parking/check-outs')

export const calculateParkingFee = (entryTime, exitTime, vehicleType = 'CAR') => {
  const parkedMinutes = Math.max(0, Math.ceil((exitTime.getTime() - new Date(entryTime).getTime()) / 60000))

  if (parkedMinutes <= GRACE_PERIOD_MINUTES) {
    return 0
  }

  const billableHours = Math.max(1, Math.ceil(parkedMinutes / 60))
  const hourlyRate = HOURLY_RATES[vehicleType] ?? HOURLY_RATES.CAR

  return Number((billableHours * hourlyRate).toFixed(2))
}

export const buildParkingSessionCheckInData = (payload, currentUserId) => ({
  vehicleId: payload.vehicleId,
  userId: currentUserId,
  slotId: payload.slotId,
  entryTime: new Date(),
  entryGate: payload.entryGate,
  status: 'ACTIVE',
})

export const buildParkingSessionCheckOutData = (payload, uploadedImage, totalFee) => {
  const exitTime = new Date()

  return {
    exitTime,
    exitGate: payload.exitGate,
    exitImageUrl: uploadedImage.secureUrl,
    exitImagePublicId: uploadedImage.publicId,
    totalFee,
    status: 'COMPLETED',
  }
}

export const canViewParkingSession = (currentUser, session, role) => {
  const actorId = currentUser?._id || currentUser?.userId
  const ownerId = session?.userId

  if (isStaffRole(role)) {
    return true
  }

  return Boolean(actorId && ownerId && actorId === ownerId)
}

const getParkingSessions = async (currentUser, query = {}) => {
  const where = {}

  if (!isStaffRole(currentUser.role)) {
    where.userId = currentUser._id
  }

  if (query.status) {
    where.status = query.status
  }

  return prisma.parkingSession.findMany({
    where,
    select: parkingSessionSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

const getParkingSessionById = async (currentUser, parkingSessionId) => {
  const session = await prisma.parkingSession.findUnique({
    where: { id: parkingSessionId },
    select: parkingSessionSelect,
  })

  if (!session) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parking session not found')
  }

  if (!canViewParkingSession(currentUser, session, currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this parking session')
  }

  return session
}

const checkSlotAvailable = async (slotId) => {
  const slot = await prisma.parkingSlot.findUnique({
    where: { id: slotId },
  })

  if (!slot) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Parking slot not found')
  }

  if (slot.status !== 'AVAILABLE') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is not available')
  }

  return slot
}

const findVehicleByNormalizedPlate = async (client, plate) => {
  const vehicles = await client.vehicle.findMany()

  return vehicles.find((item) => normalizeLicensePlate(item.licensePlate) === plate) || null
}

export const assertVehicleCanCheckIn = async (client, vehicleId) => {
  if (!vehicleId) {
    return
  }

  const activeSession = await client.parkingSession.findFirst({
    where: {
      vehicleId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  })

  if (activeSession) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This vehicle is already checked in')
  }
}

const checkInParkingSession = async (currentUser, payload) => {
  const { vehicleId, slotId } = payload

  if (!vehicleId || !slotId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'vehicleId and slotId are required')
  }

  const vehicleWhere = { id: vehicleId }

  if (!isStaffRole(currentUser.role)) {
    vehicleWhere.ownerId = currentUser._id
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: vehicleWhere,
  })

  if (!vehicle) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found')
  }

  await assertVehicleCanCheckIn(prisma, vehicle.id)
  await checkSlotAvailable(slotId)

  const sessionData = buildParkingSessionCheckInData(payload, currentUser._id)

  return prisma.$transaction(async (tx) => {
    const session = await tx.parkingSession.create({
      data: sessionData,
      select: parkingSessionSelect,
    })

    await tx.parkingSlot.update({
      where: { id: slotId },
      data: { status: 'OCCUPIED' },
    })

    return session
  })
}

const checkInParkingByPlate = async (currentUser, payload, file) => {
  if (!isStaffRole(currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only staff can check in vehicles by plate')
  }

  const plate = normalizeLicensePlate(payload.plate)
  const { slotId, entryGate = 'B1' } = payload
  const vehicleType = 'CAR'

  if (!plate) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Plate is required')
  }

  if (!slotId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking slot is required')
  }

  validateVehicleType(vehicleType)

  const existingVehicle = await findVehicleByNormalizedPlate(prisma, plate)
  await assertVehicleCanCheckIn(prisma, existingVehicle?.id)
  await checkSlotAvailable(slotId)

  const uploadedImage = await uploadEntryImage(file)

  return prisma.$transaction(async (tx) => {
    let vehicle = await findVehicleByNormalizedPlate(tx, plate)
    await assertVehicleCanCheckIn(tx, vehicle?.id)

    if (!vehicle) {
      vehicle = await tx.vehicle.create({
        data: {
          ownerId: currentUser._id,
          licensePlate: plate,
          vehicleType,
        },
      })
    }

    const session = await tx.parkingSession.create({
      data: {
        vehicleId: vehicle.id,
        userId: currentUser._id,
        slotId,
        entryTime: new Date(),
        entryGate,
        entryImageUrl: uploadedImage.secureUrl,
        entryImagePublicId: uploadedImage.publicId,
        status: 'ACTIVE',
      },
      select: parkingSessionSelect,
    })

    await tx.parkingSlot.update({
      where: { id: slotId },
      data: { status: 'OCCUPIED' },
    })

    return session
  })
}

const checkOutParkingSession = async (currentUser, parkingSessionId, payload, file) => {
  if (!parkingSessionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking session id is required')
  }

  const session = await getParkingSessionById(currentUser, parkingSessionId)

  if (session.status === 'COMPLETED') {
    return session
  }

  const uploadedImage = await uploadExitImage(file)
  const totalFee = calculateParkingFee(session.entryTime, new Date(), session.vehicle?.vehicleType)
  const updateData = buildParkingSessionCheckOutData(payload, uploadedImage, totalFee)

  return prisma.$transaction(async (tx) => {
    const updatedSession = await tx.parkingSession.update({
      where: { id: parkingSessionId },
      data: updateData,
      select: parkingSessionSelect,
    })

    await tx.parkingSlot.update({
      where: { id: session.slotId },
      data: { status: 'AVAILABLE' },
    })

    return updatedSession
  })
}

export const parkingSessionService = {
  getParkingSessions,
  getParkingSessionById,
  checkInParkingSession,
  checkInParkingByPlate,
  checkOutParkingSession,
  buildParkingSessionCheckInData,
  buildParkingSessionCheckOutData,
  calculateParkingFee,
  canViewParkingSession,
}




