import { z } from "zod";

export const contactIdSchema = z.object({
    id: z.uuid('Formato ID errado')
})