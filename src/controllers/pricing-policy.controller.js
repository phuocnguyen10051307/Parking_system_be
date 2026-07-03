import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { pricingPolicyService } from '../services/pricing-policy.service.js'

const getPricingPolicies = asyncHandler(async (req, res) => {
  const policies = await pricingPolicyService.getPricingPolicies()

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      policies,
    },
  })
})

const getActivePricingPolicy = asyncHandler(async (req, res) => {
  const policy = await pricingPolicyService.getActivePricingPolicy(req.query.vehicleType || 'CAR')

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      policy,
    },
  })
})

const createPricingPolicy = asyncHandler(async (req, res) => {
  const policy = await pricingPolicyService.createPricingPolicy(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Pricing policy created successfully',
    data: {
      policy,
    },
  })
})

const updatePricingPolicy = asyncHandler(async (req, res) => {
  const policy = await pricingPolicyService.updatePricingPolicy(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Pricing policy updated successfully',
    data: {
      policy,
    },
  })
})

export const pricingPolicyController = {
  getPricingPolicies,
  getActivePricingPolicy,
  createPricingPolicy,
  updatePricingPolicy,
}
