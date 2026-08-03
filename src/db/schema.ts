import { pgTable, uuid, text, varchar, boolean, index, foreignKey, primaryKey, unique } from "drizzle-orm/pg-core"

export const contactGroups = pgTable("contact_groups", {
	id: uuid().defaultRandom().primaryKey(),
	contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
	groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
}, (table) => [
	index("idx_contact_groups_group_id").using("btree", table.groupId.asc().nullsLast()),
	unique("contact_groups_unique").on(table.contactId, table.groupId),]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull(),
	email: varchar({ length: 200 }).notNull(),
	phone: varchar({ length: 20 }),
	active: boolean().default(true),
	obs: text().default("no obs"),
}, (table) => [
	unique("contacts_email_key").on(table.email),]);

export const groups = pgTable("groups", {
	id: uuid().defaultRandom().primaryKey(),
	name: text().notNull(),
}, (table) => [
	unique("groups_name_key").on(table.name),]);
