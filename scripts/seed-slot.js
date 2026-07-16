import { prisma } from '../src/config/prisma.js'

const parkingLayouts = [
  {
    building: {
      name: 'FPT Parking',
      address: 'FPT University HCMC',
      totalFloors: 2,
    },
    floors: [
      {
        floorNumber: 1,
        vehicleType: 'MOTORBIKE',
        zones: [
          {
            name: 'Zone A',
            slots: ['M-A1-001', 'M-A1-002', 'M-A1-003'],
          },
          {
            name: 'Zone B',
            slots: ['M-B1-001', 'M-B1-002'],
          },
        ],
      },
      {
        floorNumber: 2,
        vehicleType: 'CAR',
        zones: [
          {
            name: 'Zone C',
            slots: ['C-C2-001', 'C-C2-002'],
          },
        ],
      },
    ],
  },
]

const getOrCreateBuilding = async (buildingData) => {
  const existedBuilding = await prisma.parkingBuilding.findFirst({
    where: {
      name: buildingData.name,
      address: buildingData.address,
    },
  })

  if (existedBuilding) {
    return prisma.parkingBuilding.update({
      where: {
        id: existedBuilding.id,
      },
      data: {
        totalFloors: buildingData.totalFloors,
      },
    })
  }

  return prisma.parkingBuilding.create({
    data: buildingData,
  })
}

const getOrCreateFloor = async (buildingId, floorData) => {
  const existedFloor = await prisma.floor.findFirst({
    where: {
      buildingId,
      floorNumber: floorData.floorNumber,
      vehicleType: floorData.vehicleType,
    },
  })

  if (existedFloor) {
    return existedFloor
  }

  return prisma.floor.create({
    data: {
      buildingId,
      floorNumber: floorData.floorNumber,
      vehicleType: floorData.vehicleType,
    },
  })
}

const getOrCreateZone = async (floorId, zoneData) => {
  const existedZone = await prisma.zone.findFirst({
    where: {
      floorId,
      name: zoneData.name,
    },
  })

  if (existedZone) {
    return existedZone
  }

  return prisma.zone.create({
    data: {
      floorId,
      name: zoneData.name,
    },
  })
}

const seedSlots = async () => {
  for (const layout of parkingLayouts) {
    const building = await getOrCreateBuilding(layout.building)

    for (const floorData of layout.floors) {
      const floor = await getOrCreateFloor(building.id, floorData)

      for (const zoneData of floorData.zones) {
        const zone = await getOrCreateZone(floor.id, zoneData)

        for (const slotCode of zoneData.slots) {
          await prisma.parkingSlot.upsert({
            where: {
              slotCode,
            },
            update: {
              zoneId: zone.id,
              vehicleType: floorData.vehicleType,
              status: 'AVAILABLE',
              isActive: true,
            },
            create: {
              zoneId: zone.id,
              slotCode,
              vehicleType: floorData.vehicleType,
              status: 'AVAILABLE',
              isActive: true,
            },
          })
        }
      }
    }
  }
}

seedSlots()
  .then(async () => {
    console.log('Seed slots successfully')
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('Seed slots failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })