import { StatusCodes } from 'http-status-codes'
import streamifier from 'streamifier'

import { cloudinary } from '../config/cloudinary.js'
import { prisma } from '../config/prisma.js'
import { pricingPolicyService } from './pricing-policy.service.js'
import ApiError from '../utils/ApiError.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']
const VEHICLE_TYPES = ['MOTORBIKE', 'CAR', 'BICYCLE', 'ELECTRIC_BIKE']
const PAYMENT_METHODS = ['CASH', 'BANKING', 'E_WALLET']
const HOURLY_RATES = {
  MOTORBIKE: 0.5,
  BICYCLE: 0.25,
  ELECTRIC_BIKE: 1.5,
}
const GRACE_PERIOD_MINUTES = 15
const CAR_DAYTIME_BLOCK_FEE = 15000
const CAR_EVENING_BLOCK_FEE = 20000
const CAR_OVERNIGHT_FEE = 100000
const TWO_HOURS_IN_MINUTES = 120

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000)

const getSegmentMinutes = (rangeStart, rangeEnd, segmentStart, segmentEnd) => {
  const start = Math.max(rangeStart.getTime(), segmentStart.getTime())
  const end = Math.min(rangeEnd.getTime(), segmentEnd.getTime())

  return end > start ? Math.ceil((end - start) / 60000) : 0
}

const calculateCarParkingFee = (entryTime, exitTime) => {
  let total = 0
  const currentDay = new Date(entryTime)
  currentDay.setHours(0, 0, 0, 0)

  while (currentDay < exitTime) {
    const nextDay = addMinutes(currentDay, 24 * 60)

    const overnightStart = currentDay
    const overnightEnd = new Date(currentDay)
    overnightEnd.setHours(6, 0, 0, 0)

    const daytimeStart = new Date(currentDay)
    daytimeStart.setHours(6, 0, 0, 0)
    const daytimeEnd = new Date(currentDay)
    daytimeEnd.setHours(17, 30, 0, 0)

    const eveningStart = new Date(currentDay)
    eveningStart.setHours(18, 0, 0, 0)
    const eveningEnd = nextDay

    const overnightMinutes = getSegmentMinutes(entryTime, exitTime, overnightStart, overnightEnd)
    const daytimeMinutes = getSegmentMinutes(entryTime, exitTime, daytimeStart, daytimeEnd)
    const eveningMinutes = getSegmentMinutes(entryTime, exitTime, eveningStart, eveningEnd)

    if (overnightMinutes > 0) {
      total += CAR_OVERNIGHT_FEE
    }

    if (daytimeMinutes > 0) {
      total += Math.ceil(daytimeMinutes / TWO_HOURS_IN_MINUTES) * CAR_DAYTIME_BLOCK_FEE
    }

    if (eveningMinutes > 0) {
      total += Math.ceil(eveningMinutes / TWO_HOURS_IN_MINUTES) * CAR_EVENING_BLOCK_FEE
    }

    currentDay.setDate(currentDay.getDate() + 1)
  }

  return total
}

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
  payment: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  },
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

const normalizePayment = (payment) => {
  if (!payment) {
    return null
  }

  return {
    ...payment,
    amount: Number(payment.amount),
  }
}

const normalizeParkingSession = (session) => {
  if (!session) {
    return session
  }

  return {
    ...session,
    totalFee: session.totalFee == null ? null : Number(session.totalFee),
    payment: normalizePayment(session.payment),
  }
}

const validateVehicleType = (vehicleType) => {
  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid vehicle type. Allowed values: MOTORBIKE, CAR, BICYCLE, ELECTRIC_BIKE'
    )
  }
}

const validatePaymentMethod = (paymentMethod = 'CASH') => {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid payment method. Allowed values: CASH, BANKING, E_WALLET')
  }

  return paymentMethod
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
  const normalizedEntryTime = new Date(entryTime)
  const normalizedExitTime = new Date(exitTime)
  const parkedMinutes = Math.max(0, Math.ceil((normalizedExitTime.getTime() - normalizedEntryTime.getTime()) / 60000))

  if (vehicleType === 'CAR') {
    return calculateCarParkingFee(normalizedEntryTime, normalizedExitTime)
  }

  if (parkedMinutes <= GRACE_PERIOD_MINUTES) {
    return 0
  }

  const billableHours = Math.max(1, Math.ceil(parkedMinutes / 60))
  const hourlyRate = HOURLY_RATES[vehicleType] ?? HOURLY_RATES.ELECTRIC_BIKE

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

export const buildParkingSessionCheckOutData = (payload, uploadedImage, totalFee = null) => {
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

  const sessions = await prisma.parkingSession.findMany({
    where,
    select: parkingSessionSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })

  return sessions.map(normalizeParkingSession)
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

  return normalizeParkingSession(session)
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

const calculateParkingFeeForSession = async (session, exitTime) => {
  try {
    const pricingPolicy = await pricingPolicyService.getActivePricingPolicy(session.vehicle?.vehicleType || 'CAR')
    return pricingPolicyService.calculateParkingFeeFromPolicy(pricingPolicy, session.entryTime, exitTime)
  } catch {
    return calculateParkingFee(session.entryTime, exitTime, session.vehicle?.vehicleType)
  }
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

    return normalizeParkingSession(session)
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

    return normalizeParkingSession(session)
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

  const paymentMethod = validatePaymentMethod(payload.paymentMethod || 'CASH')
  const uploadedImage = await uploadExitImage(file)
  const exitTime = new Date()
  const totalFee = await calculateParkingFeeForSession(session, exitTime)
  const updateData = {
    ...buildParkingSessionCheckOutData(payload, uploadedImage, totalFee),
    exitTime,
  }

  return prisma.$transaction(async (tx) => {
    const updatedSession = await tx.parkingSession.update({
      where: { id: parkingSessionId },
      data: updateData,
      select: parkingSessionSelect,
    })

    await tx.payment.upsert({
      where: { sessionId: parkingSessionId },
      update: {
        amount: totalFee,
        method: paymentMethod,
        status: 'PAID',
        paidAt: exitTime,
      },
      create: {
        sessionId: parkingSessionId,
        amount: totalFee,
        method: paymentMethod,
        status: 'PAID',
        paidAt: exitTime,
      },
    })

    await tx.parkingSlot.update({
      where: { id: session.slotId },
      data: { status: 'AVAILABLE' },
    })

    const completedSession = await tx.parkingSession.findUnique({
      where: { id: parkingSessionId },
      select: parkingSessionSelect,
    })

    return normalizeParkingSession(completedSession)
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
