import express from 'express'
import { logger } from './middlewares/logger'
import { mainRoutes } from './routes/main'

const app = express()

app.use(express.json())
app.use(logger)

app.use(mainRoutes)

app.listen(3000, () => {
    console.log('Servidor funcionando...')
})