import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const AVAILABLE_ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'USER']

const ROLE_DEFINITIONS = [
  {
    key: 'ADMIN',
    label: 'Administrator',
    description: 'Full access to users, roles, settings, and operations.',
    permissions: ['users.read', 'users.update', 'roles.manage', 'settings.manage', 'operations.all'],
  },
  {
    key: 'MANAGER',
    label: 'Manager',
    description: 'Operational management for parking resources and reports.',
    permissions: ['operations.read', 'operations.manage', 'reports.read'],
  },
  {
    key: 'STAFF',
    label: 'Staff',
    description: 'Frontline parking operations like vehicle entry, exit, and monitoring.',
    permissions: ['parking.entry', 'parking.exit', 'sessions.read'],
  },
  {
    key: 'USER',
    label: 'Customer',
    description: 'Self-service access for profile, reservations, vehicles, and feedback.',
    permissions: ['profile.self', 'vehicles.self', 'reservations.self', 'feedback.self'],
  },
]

const formatAdminUser = (user) => ({
  id: user.id,
  displayName: user.fullName,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  stats: {
    vehicles: user._count?.vehicles ?? 0,
    reservations: user._count?.reservations ?? 0,
    parkingSessions: user._count?.parkingSessions ?? 0,
  },
})

const buildUserFilters = (query) => {
  const where = {}

  if (query.search?.trim()) {
    const keyword = query.search.trim()
    where.OR = [
      { fullName: { contains: keyword, mode: 'insensitive' } },
      { email: { contains: keyword, mode: 'insensitive' } },
      { phone: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  if (query.role && AVAILABLE_ROLES.includes(query.role)) {
    where.role = query.role
  }

  if (query.isActive === 'true') {
    where.isActive = true
  }

  if (query.isActive === 'false') {
    where.isActive = false
  }

  return where
}

const getUsers = async (query) => {
  const users = await prisma.user.findMany({
    where: buildUserFilters(query),
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      _count: {
        select: {
          vehicles: true,
          reservations: true,
          parkingSessions: true,
        },
      },
    },
  })

  return users.map(formatAdminUser)
}

const updateUser = async (userId, payload, actorId) => {
  const data = {}

  if (typeof payload.fullName === 'string' && payload.fullName.trim()) {
    data.fullName = payload.fullName.trim()
  }

  if (payload.phone !== undefined) {
    const normalizedPhone = payload.phone?.trim() || null

    if (normalizedPhone) {
      const existedPhone = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
      })

      if (existedPhone && existedPhone.id !== userId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Phone number already exists')
      }
    }

    data.phone = normalizedPhone
  }

  if (payload.isActive !== undefined) {
    if (actorId === userId && payload.isActive === false) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot deactivate your own account')
    }

    data.isActive = Boolean(payload.isActive)
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid fields to update')
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    include: {
      _count: {
        select: {
          vehicles: true,
          reservations: true,
          parkingSessions: true,
        },
      },
    },
  })

  return formatAdminUser(updatedUser)
}

const updateUserRole = async (userId, role, actorId) => {
  if (!AVAILABLE_ROLES.includes(role)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role value')
  }

  if (actorId === userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot change your own role')
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      role,
    },
    include: {
      _count: {
        select: {
          vehicles: true,
          reservations: true,
          parkingSessions: true,
        },
      },
    },
  })

  return formatAdminUser(updatedUser)
}

const getRoles = async () => {
  const grouped = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      _all: true,
    },
  })

  const counts = grouped.reduce((accumulator, item) => {
    accumulator[item.role] = item._count._all
    return accumulator
  }, {})

  return ROLE_DEFINITIONS.map((role) => ({
    ...role,
    userCount: counts[role.key] ?? 0,
  }))
}

export const adminUserService = {
  getRoles,
  getUsers,
  updateUser,
  updateUserRole,
}
