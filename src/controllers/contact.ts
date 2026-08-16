import { RequestHandler } from "express"
import { Contact, UpdateContact } from "../types/contact"
import { getAllContacts, getContactById, getContactByName, createContact, deleteContactbyId, idExist, emailExist, updateContact, getContactByEmail } from "../services/contacts"
import z from "zod"
import { createContactSchema } from "../schemas/create-contact"
import { contactIdSchema } from "../schemas/contact-id"


export const createNewContact: RequestHandler = async (req, res) => {
    const schemaResult = createContactSchema.safeParse(req.body)
    if (!schemaResult.success) {
        const flattened = z.flattenError(schemaResult.error)
        res.status(400).json({ error: flattened.fieldErrors })
        return
    }

    const { name, email, phone } = schemaResult.data
    const normalizedEmail = email.toLowerCase()

    const emailExists = await emailExist(normalizedEmail)
    if (emailExists) {
        res.status(409).json({ error: 'E-mail já cadastrado' })
        return
    }

    const contact: Contact = {
        name,
        email: normalizedEmail,
        phone
    }

    const newContact = await createContact(contact)
    res.status(201).json({ contact: newContact })
}

export const updateContactById: RequestHandler = async (req, res) => {
    if (!req.body) {
        res.status(400).json({ error: 'Sem corpo da requisição' })
        return
    }

    const paramsResult = contactIdSchema.safeParse(req.params)
    if (!paramsResult.success) {
        res.status(400).json({ error: 'Parâmetro errado' })
        return
    }
    const { id } = paramsResult.data

    const contactExist = await idExist(id)
    if (!contactExist) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }

    const schemaResult = createContactSchema.partial().safeParse(req.body)
    if (!schemaResult.success) {
        const flattened = z.flattenError(schemaResult.error)
        res.status(400).json({ error: flattened.fieldErrors })
        return
    }

    const { name, email, phone } = schemaResult.data
    const normalizedEmail = email?.toLowerCase()
    const updates: UpdateContact = {}

    if (name !== undefined) updates.name = name
    if (normalizedEmail !== undefined) updates.email = normalizedEmail
    if (phone !== undefined) updates.phone = phone

    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' })
        return
    }

    if (normalizedEmail) {
        const achado = await getContactByEmail(normalizedEmail)

        if (achado && achado.id !== id) {
            res.status(409).json({ error: 'E-mail já cadastrado' })
            return
        }
    }

    const contactUpdated = await updateContact(updates, id)
    res.status(200).json({ contact: contactUpdated })
}

export const getAll: RequestHandler = async (req, res) => {
    const contactQuerySchema = z.object({
        name: z.string().min(2, 'Mínimo 2 caracteres').optional()
    })

    const queryResult = contactQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
        const flattened = z.flattenError(queryResult.error)
        res.status(400).json({ error: flattened.fieldErrors })
        return
    }
    const name = queryResult.data

    if (!name) {
        const contacts_data = await getAllContacts()
        res.status(200).json({ contacts: contacts_data })
        return
    }


    const filteredContacts = await getContactByName(name as string)
    res.status(200).json({ contacts: filteredContacts })
}

export const getOne: RequestHandler = async (req, res) => {
    const paramsResult = contactIdSchema.safeParse(req.params)
    if (!paramsResult.success) {
        res.status(400).json({ error: 'Parâmetro errado' })
        return
    }
    const { id } = paramsResult.data

    const contact = await getContactById(id)
    if (!contact) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }

    res.status(200).json({ contact })
}

export const deleteContact: RequestHandler = async (req, res) => {
    const paramsResult = contactIdSchema.safeParse(req.params)
    if (!paramsResult.success) {
        res.status(400).json({ error: 'Parâmetro errado' })
        return
    }
    const { id } = paramsResult.data

    const deleted = await deleteContactbyId(id)
    if (deleted === null) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }
    res.status(200).json({ contact: deleted })
}