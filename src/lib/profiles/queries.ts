import { createClient } from "@/lib/supabase/server";
import { mapProfileRow } from "@/lib/profiles/mappers";
import type { TablesUpdate } from "@/types/database";
import type { Profile } from "@/types/profile";

const PROFILE_COLUMNS = "id, name, avatar_url, created_at, updated_at" as const;

export async function getProfileByUserId(
  userId: string
): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn("[profiles] Failed to load profile:", error.message);
    }
    return null;
  }

  return mapProfileRow(data);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileByUserId(user.id);
}

export type UpdateProfileInput = {
  name?: string | null;
  avatarUrl?: string | null;
};

export async function updateCurrentProfile(
  input: UpdateProfileInput
): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const payload: TablesUpdate<"profiles"> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error || !data) {
    console.warn("[profiles] Failed to update profile:", error?.message);
    return null;
  }

  return mapProfileRow(data);
}
