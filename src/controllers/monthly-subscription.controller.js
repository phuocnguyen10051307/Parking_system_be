import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { monthlySubscriptionService } from '../services/monthly-subscription.service.js'

const getMonthlySubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await monthlySubscriptionService.getMonthlySubscriptions(req.user, req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: subscriptions,
  })
})

const getMonthlySubscriptionById = asyncHandler(async (req, res) => {
  const subscription = await monthlySubscriptionService.getMonthlySubscriptionById(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: subscription,
  })
})

const createMonthlySubscription = asyncHandler(async (req, res) => {
  const subscription = await monthlySubscriptionService.createMonthlySubscription(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Monthly subscription created successfully',
    data: subscription,
  })
})

const renewMonthlySubscription = asyncHandler(async (req, res) => {
  const subscription = await monthlySubscriptionService.renewMonthlySubscription(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Monthly subscription renewed successfully',
    data: subscription,
  })
})

const cancelMonthlySubscription = asyncHandler(async (req, res) => {
  const subscription = await monthlySubscriptionService.cancelMonthlySubscription(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Monthly subscription cancelled successfully',
    data: subscription,
  })
})

export const monthlySubscriptionController = {
  getMonthlySubscriptions,
  getMonthlySubscriptionById,
  createMonthlySubscription,
  renewMonthlySubscription,
  cancelMonthlySubscription,
}
