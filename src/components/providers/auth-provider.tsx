"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createClient } from "@/lib/supabase/client";

type AuthContextType = {
  supabase: SupabaseClient<Database>;
  user: Database["public"]["Tables"]["users"]["Row"] | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<Database["public"]["Tables"]["users"]["Row"]>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<
    Database["public"]["Tables"]["users"]["Row"] | null
  >(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateUser = async (data: Partial<Database["public"]["Tables"]["users"]["Row"]>) => {
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", user.id);

    if (error) throw error;

    // Refresh user data
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userData) setUser(userData);
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setUser(userData);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setUser(userData);
        }
        setLoading(false);
      });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, user, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};