import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { adminUserService } from '../services/admin-user.service.js'

const getUsers = asyncHandler(async (req, res) => {
  const users = await adminUserService.getUsers(req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      users,
    },
  })
})

const updateUser = asyncHandler(async (req, res) => {
  const user = await adminUserService.updateUser(req.params.id, req.body, req.user._id)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'User updated successfully',
    data: {
      user,
    },
  })
})

const getRoles = asyncHandler(async (req, res) => {
  const roles = await adminUserService.getRoles()

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      roles,
    },
  })
})

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body

  const user = await adminUserService.updateUserRole(req.params.id, role, req.user._id)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'User role updated successfully',
    data: {
      user,
    },
  })
})

export const adminUserController = {
  getRoles,
  getUsers,
  updateUser,
  updateUserRole,
}
