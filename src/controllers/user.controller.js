import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { userService } from '../services/user.service.js'

const getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user._id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      user,
    },
  })
})

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Cập nhật thông tin thành công',
    data: {
      user,
    },
  })
})

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user._id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Đổi mật khẩu thành công',
  })
})

export const userController = {
  getProfile,
  updateProfile,
  changePassword,
}