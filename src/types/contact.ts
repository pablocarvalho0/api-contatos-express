import { contacts } from "../db/schema"

export type Contact = typeof contacts.$inferInsert
export type UpdateContact = Partial<Omit<Contact, 'id'>>