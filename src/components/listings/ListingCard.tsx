"use client";

import Link from "next/link";
import Image from "next/image";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MapPin, Eye, Tag } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    original_price: number | null;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
    status: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "EXPIRED";
    images: string[];
    is_negotiable: boolean;
    view_count: number;
    created_at: string;
    category: {
      id: string;
      name: string;
      slug: string;
    } | null;
    seller: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      is_verified: boolean;
    } | null;
    meetup_location: {
      name: string;
    } | null;
  };
  variant?: "default" | "compact";
  onSave?: (listingId: string, saved: boolean) => void;
  isSaved?: boolean;
}

const conditionLabels: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
};

const conditionColors: Record<string, string> = {
  NEW: "bg-green-100 text-green-800",
  LIKE_NEW: "bg-blue-100 text-blue-800",
  GOOD: "bg-yellow-100 text-yellow-800",
  FAIR: "bg-orange-100 text-orange-800",
  POOR: "bg-red-100 text-red-800",
};

export function ListingCard({
  listing,
  variant = "default",
  onSave,
  isSaved = false,
}: ListingCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to save listings." });
      return;
    }

    setSaving(true);
    try {
      if (saved) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listing.id);
        if (error) throw error;
        setSaved(false);
        onSave?.(listing.id, false);
        toast({ title: "Removed from saved" });
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listing.id });
        if (error) throw error;
        setSaved(true);
        onSave?.(listing.id, true);
        toast({ title: "Saved to your listings" });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save listing",
      });
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = listing.images[0];

  if (variant === "compact") {
    return (
      <Link
        href={`/listings/${listing.id}`}
        className="group flex gap-4 p-3 bg-white rounded-xl border border-gray-100 hover:border-primary/50 hover:shadow-md transition-all"
      >
        <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
          {imageUrl ? (
            <Image src={imageUrl} alt={listing.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="80px" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">No image</div>
          )}
          {listing.status !== "AVAILABLE" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs">
                {listing.status}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{listing.description}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {listing.category && (
                <Badge variant="outline" className="text-xs">
                  {listing.category.name}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs", conditionColors[listing.condition])}>
                {conditionLabels[listing.condition]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-baseline gap-1">
              {listing.original_price && listing.original_price > listing.price && (
                <span className="text-xs line-through text-muted-foreground">
                  {formatCurrency(listing.original_price, "PHP")}
                </span>
              )}
              <span className="font-bold text-lg text-primary">{formatCurrency(listing.price, "PHP")}</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                saved ? "text-red-500 bg-red-50" : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
              )}
              aria-label={saved ? "Remove from saved" : "Save listing"}
            >
              <Heart className={cn("h-4 w-4", saved && "fill-current")} />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">No image</div>
        )}

        {/* Status Badge */}
        {listing.status !== "AVAILABLE" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive">{listing.status}</Badge>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full transition-all",
            saved ? "bg-red-50 text-red-500" : "bg-white/90 backdrop-blur-sm text-muted-foreground hover:text-red-500 hover:bg-white"
          )}
          aria-label={saved ? "Remove from saved" : "Save listing"}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-current")} />
        </button>

        {/* Condition Badge */}
        <Badge
          className={cn("absolute bottom-2 left-2", conditionColors[listing.condition])}
        >
          {conditionLabels[listing.condition]}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category & Seller */}
        <div className="flex items-center justify-between gap-2">
          {listing.category && (
            <Link
              href={`/categories/${listing.category.slug}`}
              className="text-xs text-primary hover:underline whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              {listing.category.name}
            </Link>
          )}
          {listing.seller && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarImage src={listing.seller.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-[10px]">
                  {listing.seller.display_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{listing.seller.display_name || "Anonymous"}</span>
              {listing.seller.is_verified && <span className="text-green-500">✓</span>}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {listing.meetup_location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {listing.meetup_location.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {listing.view_count}
          </span>
          <span>{formatDate(listing.created_at)}</span>
        </div>

        {/* Price & Negotiable */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-baseline gap-2">
            {listing.original_price && listing.original_price > listing.price && (
              <span className="text-sm line-through text-muted-foreground">
                {formatCurrency(listing.original_price, "PHP")}
              </span>
            )}
            <span className="text-2xl font-bold text-primary">{formatCurrency(listing.price, "PHP")}</span>
          </div>
          {listing.is_negotiable && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Tag className="h-3 w-3" />
              Negotiable
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}