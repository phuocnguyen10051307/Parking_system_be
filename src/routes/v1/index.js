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
const Router = express.Router()

/** Check APIs V1 status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/** Auth APIs */
Router.use('/auth', authRoute)
/** Building APIs */
Router.use('/admin/buildings', buildingRoute)
/** Floor APIs */
Router.use('/admin/floors', floorRoute)
/** Zone APIs */
Router.use('/admin/zones', zoneRoute)
/** Admin slot APIs */
Router.use('/admin/slots', adminSlotRoute)
/** Admin user APIs */
Router.use('/admin/users', adminUserRoute)
/** Admin role APIs */
Router.use('/admin/roles', roleRoute)
/** Admin system setting APIs */
Router.use('/admin/settings', systemSettingRoute)
/** Pricing policy APIs */
Router.use('/pricing-policies', pricingPolicyRoute)
/** Monthly subscription APIs */
Router.use('/monthly-subscriptions', monthlySubscriptionRoute)
/** User APIs */
Router.use('/users', userRoute)
/** Vehicle APIs */
Router.use('/vehicles', vehicleRoute)
/** Slot APIs */
Router.use('/slots', slotRoute)
/** Reservation APIs */
Router.use('/reservations', reservationRoute)
/** Feedback APIs */
Router.use('/feedbacks', feedbackRoute)
/** Parking Session APIs */
Router.use('/parking-sessions', parkingSessionRoute)
/** Staff parking operations */
Router.use('/parking', parkingRoute)

export const APIs_V1 = Router

