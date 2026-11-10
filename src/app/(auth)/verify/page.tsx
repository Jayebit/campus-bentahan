"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { verifyOtpAction } from "@/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";

const verifySchema = z.object({
  otp: z.string().length(6, "Code must be 6 digits"),
});

function VerifyContent() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ otp: string }>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: { otp: string }) => {
    setIsLoading(true);
    try {
      await verifyOtpAction(email, data.otp);
      toast({
        title: "Verified",
        description: "Your account is now verified. You can login.",
      });
      router.push("/auth/login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Invalid code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="text-2xl font-bold mb-6">Verify Email</h1>
      <p className="mb-4">Enter the 6-digit code sent to {email}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Input id="otp" type="text" placeholder="123456" {...register("otp")} />
          {errors.otp && <p className="text-sm text-destructive">{errors.otp.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify"}
        </Button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
