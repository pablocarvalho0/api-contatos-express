import { NextFunction, Request, Response } from "express"
import { isValidUuid } from "../utils/validate-uuid"

export function validarIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params
    if (id && isValidUuid(String(id))) {
        next()
    } else {
        res.status(400).json({ error: 'ID inválido' })
    }
}