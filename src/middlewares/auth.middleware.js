import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { pickUser } from '../utils/formatters.js'

// authorization - verify who the current user is
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Access token is missing' })
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
    const user = await prisma.users.findUnique({ where: { user_id: decoded._id } })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    if (!user.is_active) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User is not available' })
    }

    const mapped = {
      _id: user.user_id,
      phone: user.phone,
      displayName: user.full_name,
      role: user.role || 'CUSTOMER',
      avatarUrl: user.avatar_url,
      avatarId: user.avatar_id,
      isActive: user.is_active,
    }

    req.user = pickUser(mapped)
    next()
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      console.error(error)
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid access token' })
    }

    console.error('Protected route error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' })
  }
}

export const authMiddleware = {
  protectedRoute,
}
