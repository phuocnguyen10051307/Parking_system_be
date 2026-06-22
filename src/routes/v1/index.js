import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from './auth.route.js'
import {buildingRoute} from './building.route.js'
import { userRoute } from './user.route.js'
import { vehicleRoute } from './vehicle.route.js'
const Router = express.Router()

/** Check APIs V1 status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/** Auth APIs */
Router.use('/auth', authRoute)
/** Building APIs */
Router.use('/admin/buildings', buildingRoute)
/** User APIs */
Router.use('/users', userRoute)
/** Vehicle APIs */
Router.use('/vehicles', vehicleRoute)

export const APIs_V1 = Router
