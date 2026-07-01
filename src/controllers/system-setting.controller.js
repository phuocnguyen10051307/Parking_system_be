import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { systemSettingService } from '../services/system-setting.service.js'

const VALID_SETTING_TYPES = ['string', 'number', 'boolean']

const getSettings = asyncHandler(async (req, res) => {
  const settings = await systemSettingService.getSettings()

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      settings,
    },
  })
})

const updateSettings = asyncHandler(async (req, res) => {
  const settings = Array.isArray(req.body?.settings) ? req.body.settings : null

  if (!settings || settings.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'settings must be a non-empty array',
    })
  }

  const invalidSetting = settings.find(
    (setting) =>
      !setting?.key ||
      typeof setting.value !== 'string' ||
      (setting.type && !VALID_SETTING_TYPES.includes(setting.type))
  )

  if (invalidSetting) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Each setting requires a key and string value',
    })
  }

  const updatedSettings = await systemSettingService.updateSettings(settings)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      settings: updatedSettings,
    },
  })
})

export const systemSettingController = {
  getSettings,
  updateSettings,
}
