import crypto from 'crypto'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn'

const ensurePayOSConfigured = () => {
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'PayOS is not configured. Missing PAYOS_CLIENT_ID, PAYOS_API_KEY, or PAYOS_CHECKSUM_KEY.'
    )
  }
}

const stringifySignatureValue = (value) => {
  if (value == null) {
    return ''
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return String(value)
}

const buildSignaturePayload = (payload = {}) =>
  Object.keys(payload)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key}=${stringifySignatureValue(payload[key])}`)
    .join('&')

const createSignature = (payload) =>
  crypto.createHmac('sha256', env.PAYOS_CHECKSUM_KEY).update(buildSignaturePayload(payload)).digest('hex')

const requestPayOS = async (path, options = {}) => {
  ensurePayOSConfigured()

  const response = await fetch(`${PAYOS_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': env.PAYOS_CLIENT_ID,
      'x-api-key': env.PAYOS_API_KEY,
      ...(options.headers || {}),
    },
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || !result) {
    throw new ApiError(StatusCodes.BAD_GATEWAY, 'PayOS request failed')
  }

  if (result.code !== '00') {
    throw new ApiError(StatusCodes.BAD_GATEWAY, result.desc || 'PayOS request failed')
  }

  return result.data
}

const createPaymentLink = async ({ orderCode, amount, description, cancelUrl, returnUrl, buyerName, items = [] }) => {
  const payload = {
    orderCode: Number(orderCode),
    amount: Number(amount),
    description,
    cancelUrl,
    returnUrl,
  }

  if (buyerName) {
    payload.buyerName = buyerName
  }

  if (items.length > 0) {
    payload.items = items
  }

  payload.signature = createSignature({
    amount: payload.amount,
    cancelUrl: payload.cancelUrl,
    description: payload.description,
    orderCode: payload.orderCode,
    returnUrl: payload.returnUrl,
  })

  return requestPayOS('/v2/payment-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

const getPaymentLink = async (paymentRequestId) => requestPayOS(`/v2/payment-requests/${paymentRequestId}`)

const verifyWebhookSignature = (payload = {}) => {
  if (!payload.signature || !payload.data) {
    return false
  }

  const expectedSignature = createSignature(payload.data)
  const providedBuffer = Buffer.from(payload.signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

export const payosService = {
  createPaymentLink,
  getPaymentLink,
  verifyWebhookSignature,
}
