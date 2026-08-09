import express from 'express'
import { validarIdMiddleware } from '../middlewares/validar-id'
import * as contactController from '../controllers/contact'

export const mainRoutes = express.Router()

mainRoutes.get('/ping', (req, res) => {
    res.status(200).json({ pong: true })
})

mainRoutes.post('/contacts', contactController.createNewContact)
mainRoutes.get('/contacts', contactController.getAll)
mainRoutes.get('/contacts/:id', validarIdMiddleware, contactController.getOne)
mainRoutes.put('/contacts/:id', validarIdMiddleware, contactController.updateContactById)
mainRoutes.delete('/contacts/:id', validarIdMiddleware, contactController.deleteContact)