import { z } from "zod";

export const createContactSchema = z.object({
    name: z.string('Name é obrigatório').min(2, 'Mínimo de 2 caracteres'),
    email: z.email('E-mail inválido'),
    phone: z.string().optional()
})