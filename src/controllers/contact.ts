import { RequestHandler } from "express"
import { Contact } from "../types/contact"
import { isValidEmail } from "../utils/validate-email"
import { getAllContacts, getContactById } from "../services/contacts"

// let contacts: Contact[] = createFakeData()

export const createContact: RequestHandler = (req, res) => {
    if (!req.body || req.body && (!req.body.name || !req.body.email)) {
        res.status(400).json({ error: 'Nome e e-mail são obrigatórios' })
        return
    }
    const { name, email, phone } = req.body

    if (!isValidEmail(email)) {
        res.status(400).json({ error: 'E-mail inválido' })
        return
    }

    // if (contacts.some(c => c.email.toLowerCase() === email.toLowerCase())) {
    //     res.status(409).json({ error: 'E-mail já cadastrado' })
    //     return
    // }

    // let newContact: Contact = {
    //     id: crypto.randomUUID(),
    //     name,
    //     email,
    //     phone
    // }
    // contacts.push(newContact)

    // res.status(201).json({ contact: newContact })
}

export const getAll: RequestHandler = async (req, res) => {
    const { name } = req.query
    if (!name) {
        const contacts_data = await getAllContacts()
        res.status(200).json({ contacts: contacts_data })
        return
    }

    // let filteredContacts = contacts.filter(contact =>
    //     contact.name.toLowerCase().includes(String(name).toLowerCase())
    // )
    // res.status(200).json({ contacts: filteredContacts })
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

export const updateContact: RequestHandler = (req, res) => {
    if (!req.body) {
        res.status(400).json({ error: 'Sem corpo da requisição' })
        return
    }

    const { id } = req.params

    // const contactKey = contacts.findIndex(item => item.id === id)
    // if (contactKey < 0) {
    //     res.status(404).json({ error: 'Contato não encontrado' })
    //     return
    // }

    // const { name, email, phone } = req.body

    // if (email) {
    //     if (!isValidEmail(email)) {
    //         res.status(400).json({ error: 'E-mail inválido' })
    //         return
    //     }

    //     if (contacts.some(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== id)) {
    //         res.status(409).json({ error: 'E-mail já cadastrado' })
    //         return
    //     }
    // }

    // if (contacts[contactKey]) {
    //     if (name) contacts[contactKey].name = name
    //     if (email) contacts[contactKey].email = email
    //     if (phone) contacts[contactKey].phone = phone
    // }

    // res.status(200).json({ contact: contacts[contactKey] })
}

export const deleteContact: RequestHandler = (req, res) => {
    const { id } = req.params

    // contacts = contacts.filter(item => item.id !== id)

    // res.status(204).send()
}