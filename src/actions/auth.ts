"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function signUpAction(email: string, password: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) throw error;
}

export async function verifyOtpAction(email: string, token: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) throw error;
}

export async function signInAction(email: string, password: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
