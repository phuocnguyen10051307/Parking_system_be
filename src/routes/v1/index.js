import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from './auth.route.js'
import { buildingRoute } from './building.route.js'
import { floorRoute } from './floor.route.js'
import { userRoute } from './user.route.js'
import { vehicleRoute } from './vehicle.route.js'
import { slotRoute } from './slot.route.js'
import { adminSlotRoute } from './admin-slot.route.js'
import { reservationRoute } from './reservation.route.js'
import { feedbackRoute } from './feedback.route.js'
import { parkingSessionRoute } from './parking-session.route.js'
import { parkingRoute } from './parking.route.js'
import { zoneRoute } from './zone.route.js'
import { adminUserRoute } from './admin-user.route.js'
import { roleRoute } from './role.route.js'
import { systemSettingRoute } from './system-setting.route.js'
import { pricingPolicyRoute } from './pricing-policy.route.js'
import { monthlySubscriptionRoute } from './monthly-subscription.route.js'
import { parkingMapRoute } from './parking-map.route.js'
import { paymentRoute } from './payment.route.js'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

Router.use('/auth', authRoute)
Router.use('/payments', paymentRoute)
Router.use('/admin/buildings', buildingRoute)
Router.use('/admin/floors', floorRoute)
Router.use('/admin/zones', zoneRoute)
Router.use('/admin/slots', adminSlotRoute)
Router.use('/admin/users', adminUserRoute)
Router.use('/admin/roles', roleRoute)
Router.use('/admin/settings', systemSettingRoute)
Router.use('/pricing-policies', pricingPolicyRoute)
Router.use('/monthly-subscriptions', monthlySubscriptionRoute)
Router.use('/users', userRoute)
Router.use('/vehicles', vehicleRoute)
Router.use('/slots', slotRoute)
Router.use('/reservations', reservationRoute)
Router.use('/feedbacks', feedbackRoute)
Router.use('/parking-sessions', parkingSessionRoute)
Router.use('/parking-map', parkingMapRoute)
Router.use('/parking', parkingRoute)

export const APIs_V1 = Router
