import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'STAFF']

const isStaffRole = (role) => STAFF_ROLES.includes(role)

const feedbackSelect = {
  id: true,
  userId: true,
  title: true,
  content: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
    },
  },
}

export const buildFeedbackCreateData = (payload, currentUserId) => ({
  userId: currentUserId,
  title: payload.title,
  content: payload.content,
  status: 'OPEN',
})

export const canUpdateFeedback = (currentUser, feedback, role) => {
  const actorId = currentUser?.userId || currentUser?._id
  const feedbackOwnerId = feedback?.userId

  if (isStaffRole(role)) {
    return true
  }

  return Boolean(actorId && feedbackOwnerId && actorId === feedbackOwnerId)
}

const getFeedbacks = async (currentUser, query = {}) => {
  const where = {}

  if (!isStaffRole(currentUser.role)) {
    where.userId = currentUser._id
  }

  if (query.status) {
    where.status = query.status
  }

  return prisma.feedback.findMany({
    where,
    select: feedbackSelect,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

const getFeedbackById = async (currentUser, feedbackId) => {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: feedbackSelect,
  })

  if (!feedback) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Feedback not found')
  }

  if (!isStaffRole(currentUser.role) && feedback.userId !== currentUser._id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this feedback')
  }

  return feedback
}

const createFeedback = async (currentUser, payload) => {
  const { title, content } = payload

  if (!title || !content) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'title and content are required')
  }

  const feedbackData = buildFeedbackCreateData(payload, currentUser._id)

  return prisma.feedback.create({
    data: feedbackData,
    select: feedbackSelect,
  })
}

const updateFeedback = async (currentUser, feedbackId, payload) => {
  const feedback = await getFeedbackById(currentUser, feedbackId)

  if (!canUpdateFeedback(currentUser, feedback, currentUser.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to update this feedback')
  }

  const data = {}

  if (payload.title !== undefined) {
    data.title = payload.title
  }

  if (payload.content !== undefined) {
    data.content = payload.content
  }

  if (payload.status !== undefined) {
    data.status = payload.status
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No data to update')
  }

  return prisma.feedback.update({
    where: { id: feedbackId },
    data,
    select: feedbackSelect,
  })
}

export const feedbackService = {
  getFeedbacks,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  buildFeedbackCreateData,
  canUpdateFeedback,
}
