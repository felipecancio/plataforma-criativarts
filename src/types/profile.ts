import type { ProfileRow } from "@/types/database";

export type Profile = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type { ProfileRow };
