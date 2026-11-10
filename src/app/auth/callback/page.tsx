"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(() => {
        router.push(next);
      });
    } else {
      router.push("/auth/login?error=Could not authenticate user");
    }
  }, [router, searchParams]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Verifying your account...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}