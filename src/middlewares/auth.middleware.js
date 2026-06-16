import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { pickUser } from '../utils/formatters.js'

// Authentication - verify who the current user is
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Access token is missing',
      })
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)

    const userId = decoded._id || decoded.id || decoded.userId

    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Invalid access token payload',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'User not found',
      })
    }

    if (!user.isActive) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'User is not available',
      })
    }

  const mapped = {
  _id: user.id,
  phone: user.phone,
  displayName: user.fullName,
  email: user.email,
  role: user.role || 'USER',
  avatarUrl: user.avatarUrl,
  avatarId: null,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
}

    req.user = pickUser(mapped)

    next()
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      console.error(error)
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Invalid access token',
      })
    }

    console.error('Protected route error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Internal server error',
    })
  }
}

// Authorization - verify what the current user is allowed to do
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'User is not authenticated',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: 'You do not have permission to access this resource',
      })
    }

    next()
  }
}

export const authMiddleware = {
  protectedRoute,
  authorizeRoles,
}
