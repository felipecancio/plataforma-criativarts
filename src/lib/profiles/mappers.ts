import type { ProfileRow } from "@/types/database";
import type { Profile } from "@/types/profile";

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
