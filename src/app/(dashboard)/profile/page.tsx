"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, Mail, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadAvatarAction } from "@/actions/profile";

const profileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(50),
  university_id: z.string().max(20).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, supabase, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: "",
      university_id: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        display_name: user.display_name || "",
        university_id: user.university_id || "",
      });
      setAvatarUrl(user.avatar_url);
    }
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("users")
        .update({
          display_name: data.display_name,
          university_id: data.university_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Avatar must be less than 5MB.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }

    setAvatarLoading(true);
    try {
      const publicUrl = await uploadAvatarAction(user.id, file);

      setAvatarUrl(publicUrl);
      toast({
        title: "Avatar updated",
        description: "Your avatar has been changed successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload avatar.",
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Please log in</h1>
        <p className="text-muted-foreground">You need to be logged in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} alt={user.display_name || user.email} />
              <AvatarFallback className="text-2xl font-medium">
                {user.display_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <label className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                avatarLoading && "opacity-50 cursor-wait"
              )}>
                <Camera className="h-4 w-4" />
                <span>Change Avatar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="sr-only"
                  disabled={avatarLoading}
                />
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  placeholder="John Doe"
                  {...register("display_name")}
                  disabled={isLoading}
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="university_id">University ID</Label>
                <Input
                  id="university_id"
                  placeholder="2024-00123"
                  {...register("university_id")}
                  disabled={isLoading}
                />
                {errors.university_id && (
                  <p className="text-sm text-destructive">{errors.university_id.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">University Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="pl-10 bg-muted cursor-not-allowed"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <div className="flex items-center gap-2">
                {user.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                    Pending Verification
                  </span>
                )}
                <span className="text-sm text-muted-foreground">
                  Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}