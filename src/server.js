import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import exitHook from 'async-exit-hook'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import fs from 'fs'

import { env } from './config/environment.js'
import { closeDB, connectDB } from './config/database.js'
import { APIs_V1 } from './routes/v1/index.js'
import { corsOptions } from './config/cors.js'
import { errorHandlingMiddleware } from './middlewares/error.middleware.js'

const app = express()

const HOST = env.HOST
const PORT = env.PORT

// Enable req.body json data
app.use(express.json())
// Configure CORS to allow requests from the React front-end
app.use(cors(corsOptions))
// Enable HTTP request logging
app.use(morgan('dev'))
// Set security-related HTTP headers
app.use(helmet())
// Enable cookie parsing
app.use(cookieParser())
// Set up Swagger UI for API documentation
const swaggerDocument = JSON.parse(fs.readFileSync('./src/swagger.json', 'utf-8'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
// use API V1
app.use('/v1', APIs_V1)
// Middleware xử lí lỗi tập trung
app.use(errorHandlingMiddleware)

// Start the server
const START_SERVER = () => {
  app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`)
  })
}

exitHook((callback) => {
  closeDB()
    .then(() => {
      console.log('Disconnected from database successfully')
    })
    .catch((error) => {
      console.error('Error disconnecting from MongoDB:', error)
    })
    .finally(callback)
})

// Chỉ khi kết nối đến db thành công thì mới start server back-end lên
// Immediately-invoked / Anonymous Async Function (IIFE)
;(async () => {
  try {
    console.log('1. Connecting to database...')
    await connectDB()
    console.log('2. Connected to database!')

    START_SERVER()
  } catch (error) {
    console.error('Error connecting to database:', error)
    process.exit(0)
  }
})()
