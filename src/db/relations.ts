import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	contacts: {
		groups: r.many.groups({
			from: r.contacts.id.through(r.contactGroups.contactId),
			to: r.groups.id.through(r.contactGroups.groupId)
		}),
	},
	groups: {
		contacts: r.many.contacts(),
	},
}))