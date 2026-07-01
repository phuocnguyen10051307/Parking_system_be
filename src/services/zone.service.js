import { prisma } from '../config/prisma.js'

const zoneInclude = {
  floor: {
    include: {
      building: true,
    },
  },
  _count: {
    select: {
      slots: true,
    },
  },
}

const ensureZoneNameAvailable = async (floorId, name, excludeId) => {
  const floor = await prisma.floor.findUnique({
    where: { id: floorId },
  })

  if (!floor) {
    const error = new Error('Floor not found')
    error.statusCode = 404
    throw error
  }

  const duplicatedZone = await prisma.zone.findFirst({
    where: {
      floorId,
      name,
      id: excludeId ? { not: excludeId } : undefined,
    },
  })

  if (duplicatedZone) {
    const error = new Error('Zone name already exists on this floor')
    error.statusCode = 400
    throw error
  }
}

const getZones = async () => {
  return await prisma.zone.findMany({
    orderBy: [
      {
        floor: {
          building: {
            name: 'asc',
          },
        },
      },
      {
        floor: {
          floorNumber: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
    include: zoneInclude,
  })
}

const createZone = async (data) => {
  await ensureZoneNameAvailable(data.floorId, data.name)

  return await prisma.zone.create({
    data: {
      floorId: data.floorId,
      name: data.name,
    },
    include: zoneInclude,
  })
}

const updateZone = async (id, data) => {
  await ensureZoneNameAvailable(data.floorId, data.name, id)

  return await prisma.zone.update({
    where: { id },
    data: {
      floorId: data.floorId,
      name: data.name,
    },
    include: zoneInclude,
  })
}

const deleteZone = async (id) => {
  const slotCount = await prisma.parkingSlot.count({
    where: {
      zoneId: id,
    },
  })

  if (slotCount > 0) {
    const error = new Error('Cannot delete zone because it has parking slots')
    error.statusCode = 400
    throw error
  }

  return await prisma.zone.delete({
    where: { id },
  })
}

export const zoneService = {
  getZones,
  createZone,
  updateZone,
  deleteZone,
}
