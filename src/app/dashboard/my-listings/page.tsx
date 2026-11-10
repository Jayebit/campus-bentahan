"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Eye, MoreVertical, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ListingCard } from "@/components/listings/ListingCard";

interface MyListing {
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
  updated_at: string;
  expires_at: string | null;
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
  _count?: {
    offers: number;
    conversations: number;
  };
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  RESERVED: "bg-blue-100 text-blue-800",
  SOLD: "bg-gray-100 text-gray-800",
  REMOVED: "bg-red-100 text-red-800",
  EXPIRED: "bg-orange-100 text-orange-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  REMOVED: "Removed",
  EXPIRED: "Expired",
  DRAFT: "Draft",
};

export default function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function fetchListings() {
      if (!user) return;

      setLoading(true);
      try {
        let query = supabase
          .from("listings")
          .select(
            `
            *,
            category:categories(id, name, slug),
            _count:offers(count),
            _count:conversations(count)
          `
          )
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        if (statusFilter) {
          query = query.eq("status", statusFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        setListings(data || []);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load listings",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [user, statusFilter, supabase, toast]);

  const filteredListings = listings.filter((listing) =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;

    try {
      // Delete images from storage first
      const listing = listings.find((l) => l.id === listingId);
      if (listing?.images.length) {
        for (const imageUrl of listing.images) {
          const pathMatch = imageUrl.match(/\/listing-images\/(.+)$/);
          if (pathMatch) {
            await supabase.storage.from("listing-images").remove([pathMatch[1]]);
          }
        }
      }

      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;

      setListings((prev) => prev.filter((l) => l.id !== listingId));
      toast({ title: "Listing deleted" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete listing",
      });
    }
  };

  const handleStatusChange = async (listingId: string, newStatus: MyListing["status"]) => {
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: newStatus })
        .eq("id", listingId);
      if (error) throw error;

      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
      );
      toast({ title: `Listing marked as ${statusLabels[newStatus]}` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update listing",
      });
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
        <p className="text-muted-foreground">You need to be logged in to view your listings.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-muted-foreground mt-1">Manage your marketplace listings</p>
        </div>
        <Button onClick={() => router.push("/listings/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Listing
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="RESERVED">Reserved</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="REMOVED">Removed</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Listings */}
      {loading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-gray-200" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-16">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No listings found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter
              ? "Try adjusting your search or filters."
              : "You haven't created any listings yet."}
          </p>
          {!searchQuery && !statusFilter && (
            <Button onClick={() => router.push("/listings/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Listing
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="relative">
              <ListingCard listing={listing} variant="default" />

              {/* Status Badge Overlay */}
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="outline" className={statusColors[listing.status]}>
                  {statusLabels[listing.status]}
                </Badge>
              </div>

              {/* Actions Menu */}
              <div className="absolute top-2 right-2 z-10">
                <div className="relative">
                  <button
                    className="p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-white shadow-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/listings/${listing.id}`);
                  }}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/listings/${listing.id}/edit`);
                  }}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                {listing.status === "AVAILABLE" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStatusChange(listing.id, "RESERVED");
                      }}
                    >
                      Reserve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStatusChange(listing.id, "SOLD");
                      }}
                    >
                      Sold
                    </Button>
                  </>
                )}
                {listing.status !== "REMOVED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:bg-red-50"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary">{listings.length}</p>
              <p className="text-sm text-muted-foreground">Total Listings</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {listings.filter((l) => l.status === "AVAILABLE").length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {listings.filter((l) => l.status === "SOLD").length}
              </p>
              <p className="text-sm text-muted-foreground">Sold</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {listings.reduce((sum, l) => sum + l.view_count, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}