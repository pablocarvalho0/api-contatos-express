import express from 'express'
import { logger } from './middlewares/logger'
import { mainRoutes } from './routes/router'
import { errorHandler } from './middlewares/error-handler'

const app = express()

app.use(express.json())
app.use(logger)
app.use(mainRoutes)
app.use(errorHandler)

app.listen(3000, () => {
    console.log('Servidor funcionando...')
})