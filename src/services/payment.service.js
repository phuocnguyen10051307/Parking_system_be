import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'
import { payosService } from './payos.service.js'

const PAYMENT_PROVIDER = 'PAYOS'

const toNumber = (value) => Number(value)

const normalizePayment = (payment) => {
  if (!payment) {
    return null
  }

  return {
    ...payment,
    amount: toNumber(payment.amount),
  }
}

const buildNumericOrderCode = () => {
  const timeSeed = Date.now().toString().slice(-10)
  const randomSeed = Math.floor(Math.random() * 90 + 10).toString()
  return `${timeSeed}${randomSeed}`
}

const getPaymentUrls = (type) => {
  const fallbackReturnUrl = env.PAYOS_RETURN_URL || env.APP_BASE_URL || 'http://localhost:5173'
  const fallbackCancelUrl = env.PAYOS_CANCEL_URL || fallbackReturnUrl

  if (type === 'MONTHLY_SUBSCRIPTION') {
    return {
      returnUrl: env.PAYOS_MONTHLY_RETURN_URL || fallbackReturnUrl,
      cancelUrl: env.PAYOS_MONTHLY_CANCEL_URL || fallbackCancelUrl,
    }
  }

  return {
    returnUrl: env.PAYOS_SESSION_RETURN_URL || fallbackReturnUrl,
    cancelUrl: env.PAYOS_SESSION_CANCEL_URL || fallbackCancelUrl,
  }
}

const createCheckoutPaymentLink = async ({ session, amount, paymentMethod }) => {
  if (!session?.id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Parking session is required')
  }

  const normalizedAmount = Math.round(Number(amount) || 0)

  if (normalizedAmount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot create online payment for zero-fee checkout')
  }

  const orderCode = buildNumericOrderCode()
  const { returnUrl, cancelUrl } = getPaymentUrls('PARKING_SESSION')
  const paymentLink = await payosService.createPaymentLink({
    orderCode,
    amount: normalizedAmount,
    description: `EXIT${orderCode.slice(-6)}`,
    returnUrl,
    cancelUrl,
    buyerName: session.user?.fullName || session.vehicle?.licensePlate || 'Parking Customer',
    items: [
      {
        name: `Parking checkout ${session.vehicle?.licensePlate || session.id}`,
        quantity: 1,
        price: normalizedAmount,
      },
    ],
  })

  const payment = await prisma.payment.upsert({
    where: { sessionId: session.id },
    update: {
      amount: normalizedAmount,
      method: paymentMethod,
      provider: PAYMENT_PROVIDER,
      orderCode,
      providerPaymentId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      status: 'PENDING',
      paidAt: null,
    },
    create: {
      sessionId: session.id,
      amount: normalizedAmount,
      method: paymentMethod,
      provider: PAYMENT_PROVIDER,
      orderCode,
      providerPaymentId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      status: 'PENDING',
    },
  })

  return {
    payment: normalizePayment(payment),
    checkoutUrl: paymentLink.checkoutUrl,
    qrCode: paymentLink.qrCode,
    paymentLinkId: paymentLink.paymentLinkId,
    orderCode,
  }
}

const createMonthlySubscriptionPaymentLink = async ({ subscription, amount, paymentMethod }) => {
  if (!subscription?.id) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Monthly subscription is required')
  }

  const normalizedAmount = Math.round(Number(amount) || 0)

  if (normalizedAmount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot create online payment for zero-fee subscription')
  }

  const orderCode = buildNumericOrderCode()
  const { returnUrl, cancelUrl } = getPaymentUrls('MONTHLY_SUBSCRIPTION')
  const paymentLink = await payosService.createPaymentLink({
    orderCode,
    amount: normalizedAmount,
    description: `MONTH${orderCode.slice(-5)}`,
    returnUrl,
    cancelUrl,
    buyerName: subscription.user?.fullName || subscription.vehicle?.licensePlate || 'Parking Customer',
    items: [
      {
        name: `Monthly pass ${subscription.vehicle?.licensePlate || subscription.id}`,
        quantity: 1,
        price: normalizedAmount,
      },
    ],
  })

  const payment = await prisma.payment.upsert({
    where: { monthlySubscriptionId: subscription.id },
    update: {
      amount: normalizedAmount,
      method: paymentMethod,
      provider: PAYMENT_PROVIDER,
      orderCode,
      providerPaymentId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      status: 'PENDING',
      paidAt: null,
    },
    create: {
      monthlySubscriptionId: subscription.id,
      amount: normalizedAmount,
      method: paymentMethod,
      provider: PAYMENT_PROVIDER,
      orderCode,
      providerPaymentId: paymentLink.paymentLinkId,
      checkoutUrl: paymentLink.checkoutUrl,
      status: 'PENDING',
    },
  })

  return {
    payment: normalizePayment(payment),
    checkoutUrl: paymentLink.checkoutUrl,
    qrCode: paymentLink.qrCode,
    paymentLinkId: paymentLink.paymentLinkId,
    orderCode,
  }
}

const handlePayOSWebhook = async (payload = {}) => {
  if (!payosService.verifyWebhookSignature(payload)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid PayOS webhook signature')
  }

  const orderCode = payload?.data?.orderCode ? String(payload.data.orderCode) : null

  if (!orderCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'PayOS webhook is missing orderCode')
  }

  const payment = await prisma.payment.findFirst({
    where: { orderCode },
    include: {
      session: true,
      monthlySubscription: true,
    },
  })

  if (!payment) {
    return {
      processed: false,
      orderCode,
      reason: 'payment_not_found',
    }
  }

  const paidAt = payload?.data?.transactionDateTime ? new Date(payload.data.transactionDateTime) : new Date()
  const isPaid = payload.code === '00' && payload.success === true && payload?.data?.code === '00'

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerPaymentId: payload?.data?.paymentLinkId || payment.providerPaymentId,
      status: isPaid ? 'PAID' : 'FAILED',
      paidAt: isPaid ? paidAt : null,
    },
  })

  if (isPaid && payment.monthlySubscriptionId) {
    await prisma.monthlySubscription.update({
      where: { id: payment.monthlySubscriptionId },
      data: {
        status: 'ACTIVE',
        paidAt,
      },
    })
  }

  return {
    processed: true,
    orderCode,
    payment: normalizePayment(updatedPayment),
    isPaid,
  }
}

export const paymentService = {
  createCheckoutPaymentLink,
  createMonthlySubscriptionPaymentLink,
  handlePayOSWebhook,
  normalizePayment,
}
