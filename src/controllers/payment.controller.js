import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { paymentService } from '../services/payment.service.js'

const handlePayOSWebhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handlePayOSWebhook(req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  })
})

export const paymentController = {
  handlePayOSWebhook,
}
