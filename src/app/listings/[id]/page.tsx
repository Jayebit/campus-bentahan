"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Tag,
  DollarSign,
  MessageSquare,
  Flag,
  Share2,
  Heart,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Listing {
  id: string;
  seller_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
  status: "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "REMOVED" | "EXPIRED";
  images: string[];
  meetup_location_preference: string | null;
  view_count: number;
  is_negotiable: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  seller: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    rating_avg: number | null;
    rating_count: number;
    is_verified: boolean;
    university_id: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  meetup_location: {
    id: string;
    name: string;
    building: string | null;
    floor: string | null;
  } | null;
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

export default function ListingDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerNote, setOfferNote] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const listingId = params.id as string;

  useEffect(() => {
    async function fetchListing() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            *,
            seller:users!seller_id(id, display_name, email, avatar_url, rating_avg, rating_count, is_verified, university_id),
            category:categories(id, name, slug),
            meetup_location:meetup_locations(id, name, building, floor)
          `)
          .eq("id", listingId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Listing not found");

        setListing(data);

        // Check if saved
        if (user) {
          const { data: saved } = await supabase
            .from("saved_listings")
            .select("id")
            .eq("user_id", user.id)
            .eq("listing_id", listingId)
            .single();
          setIsSaved(!!saved);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setLoading(false);
      }
    }

    fetchListing();
  }, [listingId, supabase, user]);

  useEffect(() => {
    if (listing) {
      // Increment view count
      supabase
        .from("listings")
        .update({ view_count: listing.view_count + 1 })
        .eq("id", listingId);
    }
  }, [listing, listingId, supabase]);

  const handlePreviousImage = () => {
    if (listing && listing.images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? listing.images.length - 1 : prev - 1));
    }
  };

  const handleNextImage = () => {
    if (listing && listing.images.length > 0) {
      setCurrentImageIndex((prev) => (prev === listing.images.length - 1 ? 0 : prev + 1));
    }
  };

  const handleSaveListing = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
        setIsSaved(false);
        toast({ title: "Removed from saved" });
      } else {
        const { error } = await supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
        setIsSaved(true);
        toast({ title: "Saved to your listings" });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save listing",
      });
    }
  };

  const handleSubmitOffer = async () => {
    if (!user || !listing) return;
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Please enter a valid offer amount" });
      return;
    }

    setSubmittingOffer(true);
    try {
      // Create or get conversation
      let conversationId: string;

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .eq("seller_id", listing.seller_id)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: listing.seller_id,
          })
          .select("id")
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Create offer
      const { error: offerError } = await supabase.from("offers").insert({
        conversation_id: conversationId,
        listing_id: listingId,
        buyer_id: user.id,
        amount: parseFloat(offerAmount),
        note: offerNote || null,
      });

      if (offerError) throw offerError;

      // Create message for the offer
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: `Offer: ${formatCurrency(parseFloat(offerAmount))}${offerNote ? ` - ${offerNote}` : ""}`,
        message_type: "OFFER",
      });

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      toast({ title: "Offer sent", description: "The seller will be notified of your offer." });
      setShowOfferModal(false);
      setOfferAmount("");
      setOfferNote("");
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit offer",
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Listing Not Found</h1>
        <p className="text-muted-foreground mb-4">{error || "This listing doesn't exist or has been removed."}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const isOwnListing = user && listing.seller_id === user.id;
  const isAvailable = listing.status === "AVAILABLE";

  const currentImage = listing.images[currentImageIndex];

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <span>/</span>
        <Link href={`/categories/${listing.category?.slug}`} className="hover:text-primary">
          {listing.category?.name}
        </Link>
        <span>/</span>
        <span className="truncate max-w-[200px]">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Image Gallery */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Image */}
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            {listing.images.length > 0 ? (
              <>
                <Image
                  src={currentImage}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
                {listing.images.length > 1 && (
                  <>
                    <button
                      onClick={handlePreviousImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <Badge
                variant={
                  listing.status === "AVAILABLE"
                    ? "success"
                    : listing.status === "SOLD"
                    ? "destructive"
                    : listing.status === "RESERVED"
                    ? "default"
                    : "outline"
                }
              >
                {listing.status}
              </Badge>
            </div>
            {/* Save Button */}
            <button
              onClick={handleSaveListing}
              className={cn(
                "absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm transition-all hover:bg-white",
                isSaved && "text-red-500"
              )}
              aria-label={isSaved ? "Remove from saved" : "Save listing"}
            >
              <Heart
                className={cn("h-5 w-5 transition-colors", isSaved && "fill-current")}
              />
            </button>
          </div>

          {/* Thumbnail Strip */}
          {listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {listing.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                    index === currentImageIndex ? "border-primary" : "border-transparent hover:border-primary/50"
                  )}
                  aria-label={`View image ${index + 1}`}
                  aria-current={index === currentImageIndex ? "true" : "false"}
                >
                  <Image
                    src={img}
                    alt={`${listing.title} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {listing.description || "No description provided."}
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Condition</p>
                  <p className="font-medium">
                    <Badge variant="outline" className={conditionColors[listing.condition]}>
                      {conditionLabels[listing.condition]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">
                    <Link href={`/categories/${listing.category?.slug}`} className="text-primary hover:underline">
                      {listing.category?.name}
                    </Link>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posted</p>
                  <p className="font-medium">{formatDate(listing.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="font-medium">{listing.view_count}</p>
                </div>
                {listing.meetup_location && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Preferred Meetup Location</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {listing.meetup_location.name}
                      {listing.meetup_location.building && ` - ${listing.meetup_location.building}`}
                      {listing.meetup_location.floor && ` (${listing.meetup_location.floor})`}
                    </p>
                  </div>
                )}
                {listing.is_negotiable && (
                  <div className="sm:col-span-2">
                    <Badge variant="secondary" className="gap-1">
                      <Tag className="h-3 w-3" />
                      Price is negotiable
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Price & Actions + Seller Info */}
        <div className="space-y-4">
          {/* Price Card */}
          <Card className="sticky top-24">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Price */}
                <div className="space-y-1">
                  {listing.original_price && listing.original_price > listing.price && (
                    <p className="text-sm line-through text-muted-foreground">
                      {formatCurrency(listing.original_price, "PHP")}
                    </p>
                  )}
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(listing.price, "PHP")}
                  </p>
                  {listing.original_price && listing.original_price > listing.price && (
                    <Badge variant="secondary" className="text-xs">
                      Save {formatCurrency(listing.original_price - listing.price, "PHP")} ({" "}{(
                        ((listing.original_price - listing.price) / listing.original_price) *
                        100
                      ).toFixed(0)}% off)
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                  {isOwnListing ? (
                    <>
                      <Button variant="outline" className="w-full" onClick={() => router.push(`/listings/${listingId}/edit`)}>
                        Edit Listing
                      </Button>
                      {isAvailable && (
                        <Button variant="destructive" className="w-full" onClick={() => {
                          if (confirm("Are you sure you want to mark this as sold?")) {
                            // Mark as sold - would need server action
                          }
                        }}>
                          Mark as Sold
                        </Button>
                      )}
                    </>
                  ) : isAvailable ? (
                    <>
                      <Button className="w-full" onClick={() => {
                        if (!user) {
                          router.push("/auth/login");
                        } else {
                          setShowOfferModal(true);
                        }
                      }}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Make an Offer
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => {
                        if (!user) {
                          router.push("/auth/login");
                        } else {
                          router.push(`/messages/new?listing=${listingId}&seller=${listing.seller_id}`);
                        }
                      }}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message Seller
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {listing.status === "SOLD" ? "Sold" : listing.status === "RESERVED" ? "Reserved" : "Unavailable"}
                    </Button>
                  )}

                  <Button variant="ghost" className="w-full" onClick={handleSaveListing}>
                    {isSaved ? (
                      <>
                        <Heart className="mr-2 h-4 w-4 fill-current text-red-500" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Heart className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>

                  <Button variant="ghost" className="w-full" onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: listing.title,
                        text: listing.description || "",
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied" });
                    }
                  }}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>

                  <Button variant="ghost" className="w-full text-destructive" onClick={() => {
                    if (!user) {
                      router.push("/auth/login");
                    } else {
                      // Report listing
                      toast({ title: "Report submitted", description: "We'll review this listing." });
                    }
                  }}>
                    <Flag className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seller Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Seller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {listing.seller ? (
                <>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={listing.seller.avatar_url || undefined} alt={listing.seller.display_name || "Seller"} />
                      <AvatarFallback>
                        {listing.seller.display_name?.[0]?.toUpperCase() || listing.seller.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{listing.seller.display_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground truncate">{listing.seller.email}</p>
                      {listing.seller.university_id && (
                        <p className="text-xs text-muted-foreground">{listing.seller.university_id}</p>
                      )}
                    </div>
                    {listing.seller.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <span className="relative top-[1px]">✓</span>
                        Verified
                      </Badge>
                    )}
                  </div>

                  {listing.seller && listing.seller.rating_count > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{listing.seller.rating_avg?.toFixed(1)}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-yellow-400",
                              i < Math.round(listing.seller?.rating_avg || 0) ? "fill-current" : ""
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">({listing.seller.rating_count} reviews)</span>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => {
                      if (!user) {
                        router.push("/auth/login");
                      } else {
                        router.push(`/messages/new?listing=${listingId}&seller=${listing.seller_id}`);
                      }
                    }}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message Seller
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Seller information unavailable.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Make an Offer</h2>
              <button onClick={() => setShowOfferModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Listing price: <span className="font-medium text-foreground">{formatCurrency(listing.price, "PHP")}</span>
              {listing.is_negotiable && " (Negotiable)"}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="offerAmount" className="text-sm font-medium">Your Offer (PHP)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    id="offerAmount"
                    step="0.01"
                    min="1"
                    max={listing.price}
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter your offer"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="offerNote" className="text-sm font-medium">Note (Optional)</label>
                <textarea
                  id="offerNote"
                  value={offerNote}
                  onChange={(e) => setOfferNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Add a message for the seller..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowOfferModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmitOffer} disabled={submittingOffer || !offerAmount}>
                {submittingOffer ? "Sending..." : "Send Offer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}