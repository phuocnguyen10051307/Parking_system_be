import bcrypt from 'bcrypt'

import { prisma } from '../src/config/prisma.js'

const DEFAULT_PASSWORD = 'Password123'

const createOrGetBuilding = async () => {
  const existing = await prisma.parkingBuilding.findFirst({
    where: {
      name: 'FPT Parking',
      address: 'FPT University HCMC',
    },
  })

  if (existing) {
    return existing
  }

  return prisma.parkingBuilding.create({
    data: {
      name: 'FPT Parking',
      address: 'FPT University HCMC',
      totalFloors: 2,
    },
  })
}

const createOrGetFloor = async (buildingId) => {
  const existing = await prisma.floor.findFirst({
    where: {
      buildingId,
      floorNumber: 1,
      vehicleType: 'MOTORBIKE',
    },
  })

  if (existing) {
    return existing
  }

  return prisma.floor.create({
    data: {
      buildingId,
      floorNumber: 1,
      vehicleType: 'MOTORBIKE',
    },
  })
}

const createOrGetZone = async (floorId) => {
  const existing = await prisma.zone.findFirst({
    where: {
      floorId,
      name: 'Zone A',
    },
  })

  if (existing) {
    return existing
  }

  return prisma.zone.create({
    data: {
      floorId,
      name: 'Zone A',
    },
  })
}

const createOrGetSlot = async (zoneId, slotCode) => {
  const existing = await prisma.parkingSlot.findUnique({
    where: {
      slotCode,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.parkingSlot.create({
    data: {
      zoneId,
      slotCode,
      vehicleType: 'MOTORBIKE',
      status: 'AVAILABLE',
      isActive: true,
    },
  })
}

const createOrGetUser = async (input) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, ...(input.phone ? [{ phone: input.phone }] : [])],
    },
  })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName,
        phone: input.phone ?? existing.phone,
        email: input.email,
        role: input.role,
        isActive: true,
      },
    })
  }

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
      role: input.role,
      isActive: true,
    },
  })
}

const createOrGetVehicle = async (ownerId, licensePlate) => {
  const existing = await prisma.vehicle.findUnique({
    where: {
      licensePlate,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.vehicle.create({
    data: {
      ownerId,
      licensePlate,
      vehicleType: 'MOTORBIKE',
      brand: 'Honda',
      color: 'Black',
    },
  })
}

const createOrGetReservation = async (userId, vehicleId, slotId, status, startTime, endTime) => {
  const existing = await prisma.reservation.findFirst({
    where: {
      userId,
      vehicleId,
      slotId,
      status,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.reservation.create({
    data: {
      userId,
      vehicleId,
      slotId,
      startTime,
      endTime,
      status,
    },
  })
}

const createOrGetFeedback = async (userId, title, content, status) => {
  const existing = await prisma.feedback.findFirst({
    where: {
      userId,
      title,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.feedback.create({
    data: {
      userId,
      title,
      content,
      status,
    },
  })
}

const createOrGetParkingSession = async (userId, vehicleId, slotId, status, entryTime, exitTime, entryGate, exitGate, note) => {
  const existing = await prisma.parkingSession.findFirst({
    where: {
      userId,
      vehicleId,
      slotId,
      status,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.parkingSession.create({
    data: {
      vehicleId,
      userId,
      slotId,
      entryTime,
      exitTime,
      entryGate,
      exitGate,
      status,
      totalFee: note ? 15000 : null,
      note,
    },
  })
}

const seedTestData = async () => {
  const building = await createOrGetBuilding()
  const floor = await createOrGetFloor(building.id)
  const zone = await createOrGetZone(floor.id)
  const slotOne = await createOrGetSlot(zone.id, 'M-A1-001')
  const slotTwo = await createOrGetSlot(zone.id, 'M-A1-002')

  const regularUser = await createOrGetUser({
    fullName: 'Demo User',
    email: 'demo.user@example.com',
    phone: '0900000001',
    role: 'USER',
  })

  const staffUser = await createOrGetUser({
    fullName: 'Staff Tester',
    email: 'staff.tester@example.com',
    phone: '0900000002',
    role: 'STAFF',
  })

  const regularVehicle = await createOrGetVehicle(regularUser.id, '59A1-12345')
  const staffVehicle = await createOrGetVehicle(staffUser.id, '59A1-67890')

  const reservationOne = await createOrGetReservation(
    regularUser.id,
    regularVehicle.id,
    slotOne.id,
    'PENDING',
    new Date(Date.now() - 2 * 60 * 60 * 1000),
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  )
  const reservationTwo = await createOrGetReservation(
    staffUser.id,
    staffVehicle.id,
    slotTwo.id,
    'CONFIRMED',
    new Date(Date.now() + 60 * 60 * 1000),
    new Date(Date.now() + 4 * 60 * 60 * 1000),
  )
  const feedbackOne = await createOrGetFeedback(regularUser.id, 'Morning slot access issue', 'The allocated slot was difficult to find during the morning rush.', 'OPEN')
  const feedbackTwo = await createOrGetFeedback(staffUser.id, 'Exit gate delay', 'The exit gate was slow during check-out and caused a queue.', 'RESOLVED')

  const sessionOne = await createOrGetParkingSession(regularUser.id, regularVehicle.id, slotOne.id, 'ACTIVE', new Date(Date.now() - 30 * 60 * 1000), null, 'G1', null, 'Active session for manual testing')
  const sessionTwo = await createOrGetParkingSession(staffUser.id, staffVehicle.id, slotTwo.id, 'COMPLETED', new Date(Date.now() - 3 * 60 * 60 * 1000), new Date(Date.now() - 2 * 60 * 60 * 1000), 'G1', 'G2', 'Completed session for testing')

  console.log('Seeded demo data successfully')
  console.log({
    building: building.id,
    slots: [slotOne.slotCode, slotTwo.slotCode],
    regularUser: { id: regularUser.id, email: regularUser.email, role: regularUser.role },
    staffUser: { id: staffUser.id, email: staffUser.email, role: staffUser.role },
    reservations: [
      { id: reservationOne.id, status: reservationOne.status, slotCode: slotOne.slotCode },
      { id: reservationTwo.id, status: reservationTwo.status, slotCode: slotTwo.slotCode },
    ],
    feedbacks: [
      { id: feedbackOne.id, title: feedbackOne.title, status: feedbackOne.status },
      { id: feedbackTwo.id, title: feedbackTwo.title, status: feedbackTwo.status },
    ],
    parkingSessions: [
      { id: sessionOne.id, status: sessionOne.status, entryGate: sessionOne.entryGate },
      { id: sessionTwo.id, status: sessionTwo.status, exitGate: sessionTwo.exitGate },
    ],
    loginEmail: regularUser.email,
    loginPassword: DEFAULT_PASSWORD,
  })
}

seedTestData()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Seed test data failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
