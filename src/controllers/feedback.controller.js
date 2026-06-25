import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { feedbackService } from '../services/feedback.service.js'

const getFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await feedbackService.getFeedbacks(req.user, req.query)

  res.status(StatusCodes.OK).json({
    success: true,
    data: feedbacks,
  })
})

const getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.getFeedbackById(req.user, req.params.id)

  res.status(StatusCodes.OK).json({
    success: true,
    data: feedback,
  })
})

const createFeedback = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.createFeedback(req.user, req.body)

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Feedback created successfully',
    data: feedback,
  })
})

const updateFeedback = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.updateFeedback(req.user, req.params.id, req.body)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Feedback updated successfully',
    data: feedback,
  })
})

export const feedbackController = {
  getFeedbacks,
  getFeedbackById,
  createFeedback,
  updateFeedback,
}
