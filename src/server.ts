import express from 'express'
import { logger } from './middlewares/logger'
import { mainRoutes } from './routes/router'
import { errorHandler } from './middlewares/error-handler'
import { getEnv } from './env'

const app = express()

app.use(express.json())
app.use(logger)
app.use(mainRoutes)
app.use(errorHandler)

app.listen(getEnv().PORT, () => {
    console.log('Servidor funcionando...')
})