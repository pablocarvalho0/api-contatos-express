import { RequestHandler } from "express"
import { Contact, UpdateContact } from "../types/contact"
import { isValidEmail } from "../utils/validate-email"
import { getAllContacts, getContactById, getContactByName, createContact, deleteContactbyId, idExist, emailExist, updateContact, getContactByEmail } from "../services/contacts"
import z from "zod"

export const createNewContact: RequestHandler = async (req, res) => {
    const createContactSchema = z.object({
        name: z.string('Name é obrigatório').min(2, 'Mínimo de 2 caracteres'),
        email: z.email('E-mail inválido'),
        phone: z.string().optional()
    })

    const schemaResult = createContactSchema.safeParse(req.body)
    if (!schemaResult.success) {
        const flattened = z.flattenError(schemaResult.error)
        res.status(400).json({ error: flattened.fieldErrors })
        return
    }

    const { name, email, phone } = schemaResult.data

    const emailExists = await emailExist(email)
    if (emailExists) {
        res.status(409).json({ error: 'E-mail já cadastrado' })
        return
    }

    const contact: Contact = {
        name,
        email: email.toLowerCase(),
        phone
    }

    const newContact = await createContact(contact)
    res.status(201).json({ contact: newContact })
}

export const getAll: RequestHandler = async (req, res) => {
    const { name } = req.query
    if (!name) {
        const contacts_data = await getAllContacts()
        res.status(200).json({ contacts: contacts_data })
        return
    }

    let filteredContacts = await getContactByName(name as string)
    res.status(200).json({ contacts: filteredContacts })
}

export const getOne: RequestHandler = async (req, res) => {
    const { id } = req.params

    const contact = await getContactById(id as string)
    if (!contact) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }

    res.status(200).json({ contact })
}

export const updateContactById: RequestHandler = async (req, res) => {
    if (!req.body) {
        res.status(400).json({ error: 'Sem corpo da requisição' })
        return
    }

    const { name, email, phone } = req.body
    const updates: UpdateContact = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email.toLowerCase()
    if (phone !== undefined) updates.phone = phone

    if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'Nenhum campo para atualizar' })
        return
    }

    const { id } = req.params
    const contactExist = await idExist(id as string)
    if (!contactExist) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }

    if (email) {
        if (!isValidEmail(email)) {
            res.status(400).json({ error: 'E-mail inválido' })
            return
        }
        const achado = await getContactByEmail(email)

        if (achado && achado.id !== id) {
            res.status(409).json({ error: 'E-mail já cadastrado' })
            return
        }
    }

    const contactUpdated = await updateContact(updates, id as string)
    res.status(200).json({ contact: contactUpdated })
}

export const deleteContact: RequestHandler = async (req, res) => {
    const { id } = req.params

    const deleted = await deleteContactbyId(id as string)
    if (deleted === null) {
        res.status(404).json({ error: 'Contato não encontrado' })
        return
    }
    res.status(200).json({ contact: deleted })
}