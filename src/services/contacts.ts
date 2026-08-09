import { asc, eq, ilike } from "drizzle-orm";
import { db } from "../db";
import { contacts } from "../db/schema";
import type { Contact, UpdateContact } from "../types/contact";


export async function getAllContacts() {
    const contacts_data = await db
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name))
    return contacts_data
}
export async function getContactByName(name: string) {
    const contacts_data = await db
        .select()
        .from(contacts)
        .where(
            ilike(contacts.name, `%${name}%`)
        )

    return contacts_data
}
export async function getContactById(id: string) {
    const contact = await db
        .select()
        .from(contacts)
        .where(
            eq(contacts.id, id)
        )
    if (contact.length > 0) return contact[0]
    return null
}

export async function getContactByEmail(email: string) {
    const contacts_data = await db
        .select()
        .from(contacts)
        .where(
            eq(contacts.email, email.toLowerCase())
        )
    if (contacts_data.length > 0) return contacts_data[0]
    return null

}

export async function emailExist(email: string) {
    const contact = await getContactByEmail(email)
    if (contact === null) return false
    return true
}

export async function idExist(id: string) {
    const hasContact = await getContactById(id)
    return (hasContact !== null)
}

export async function createContact(newContact: Contact) {
    const contact_created = await db.insert(contacts).values(newContact).returning()
    return contact_created
}

export async function deleteContactbyId(id: string) {
    const deleted = await db.delete(contacts).where(
        eq(contacts.id, id)
    ).returning()
    if (deleted.length > 0) return deleted[0]
    return null
}

export async function updateContact(contact: UpdateContact, id: string) {
    const contactUpdated = await db.update(contacts)
        .set(contact)
        .where(eq(contacts.id, id)).returning();

    if (contactUpdated.length > 0) return contactUpdated[0]
    return null

}