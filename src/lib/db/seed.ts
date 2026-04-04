import { getDb } from "./index";
import { users } from "./schema";
import { v4 as uuid } from "uuid";

export async function seed(): Promise<string> {
  const db = getDb();

  // Check if default user exists
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: users already exist");
    return existing[0].id;
  }

  const userId = uuid();
  await db.insert(users).values({
    id: userId,
    name: "Default User",
    apiProvider: "glm5",
  });
  console.log("Seed completed, default user created:", userId);
  return userId;
}

// Run seed if executed directly
if (require.main === module) {
  seed()
    .then((id) => {
      console.log("Done! User ID:", id);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
