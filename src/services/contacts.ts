import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { contacts } from "../db/schema";


export async function getAllContacts() {
    const contacts_data = await db
        .select()
        .from(contacts)
        .orderBy(asc(contacts.name))
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