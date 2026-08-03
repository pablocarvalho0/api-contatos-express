import { db } from "../db";
import { contacts } from "../db/schema";


export async function getAllContacts() {
    const contacts_data = await db.select().from(contacts)
    return contacts_data
}