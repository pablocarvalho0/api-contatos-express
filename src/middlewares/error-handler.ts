import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // aqui você decide o que fazer com o erro
    res.status(500).json({ error: 'Algo deu errado' })
}