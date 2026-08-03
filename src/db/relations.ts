import { relations } from "drizzle-orm/relations";
import { contacts, contactGroups, groups } from "./schema";

export const contactGroupsRelations = relations(contactGroups, ({one}) => ({
	contact: one(contacts, {
		fields: [contactGroups.contactId],
		references: [contacts.id]
	}),
	group: one(groups, {
		fields: [contactGroups.groupId],
		references: [groups.id]
	}),
}));

export const contactsRelations = relations(contacts, ({many}) => ({
	contactGroups: many(contactGroups),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	contactGroups: many(contactGroups),
}));