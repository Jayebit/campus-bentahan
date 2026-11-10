"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function updateProfileAction(
  userId: string,
  data: { display_name?: string; university_id?: string }
) {
  const supabase = await createServerClient() as SupabaseClient<Database>;

  const updateData: Record<string, string | null> = {};
  if (data.display_name !== undefined) updateData.display_name = data.display_name;
  if (data.university_id !== undefined) updateData.university_id = data.university_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) throw error;

  revalidatePath("/profile");
}

export async function uploadAvatarAction(userId: string, file: File) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerClient()) as any;

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Maximum size is 5MB.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) throw updateError;

  revalidatePath("/profile");
  return publicUrl;
}

export async function getUserProfile(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}