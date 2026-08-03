import { pgTable, unique, uuid, text, varchar, boolean, index, foreignKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: varchar({ length: 200 }).notNull(),
	phone: varchar({ length: 20 }),
	active: boolean().default(true),
	obs: text().default('no obs'),
}, (table) => [
	unique("contacts_email_key").on(table.email),
]);

export const contactGroups = pgTable("contact_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	contactId: uuid("contact_id").notNull(),
	groupId: uuid("group_id").notNull(),
}, (table) => [
	index("idx_contact_groups_group_id").using("btree", table.groupId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "contact_groups_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "contact_groups_group_id_fkey"
		}).onDelete("cascade"),
	unique("contact_groups_unique").on(table.contactId, table.groupId),
]);

export const groups = pgTable("groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
}, (table) => [
	unique("groups_name_key").on(table.name),
]);
