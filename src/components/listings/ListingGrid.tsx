"use client";

import { useState, useEffect, useCallback } from "react";
import { ListingCard } from "./ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Filter, X, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Listing {
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
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MeetupLocation {
  id: string;
  name: string;
  building: string | null;
  floor: string | null;
}

interface ListingGridProps {
  initialListings?: Listing[];
  initialCategories?: Category[];
  initialMeetupLocations?: MeetupLocation[];
  categoryId?: string;
  showFilters?: boolean;
  variant?: "default" | "compact";
  className?: string;
}

export function ListingGrid({
  initialListings = [],
  initialCategories = [],
  initialMeetupLocations = [],
  categoryId,
  showFilters = true,
  variant = "default",
  className,
}: ListingGridProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [meetupLocations, setMeetupLocations] = useState<MeetupLocation[]>(initialMeetupLocations);
  const [loading, setLoading] = useState(!initialListings.length);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedMeetupLocation, setSelectedMeetupLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price_asc" | "price_desc" | "popular">("newest");

// Handler for Select component that expects string
const handleSortChange = (value: string) => {
  setSortBy(value as "newest" | "oldest" | "price_asc" | "price_desc" | "popular");
};
  const [showOnlyNegotiable, setShowOnlyNegotiable] = useState(false);
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);

  const supabase = createClient();
  const ITEMS_PER_PAGE = 20;

  const buildQuery = useCallback(() => {
    let query = supabase
      .from("listings")
      .select(
        `
        *,
        category:categories(id, name, slug),
        seller:users!seller_id(id, display_name, avatar_url, is_verified),
        meetup_location:meetup_locations(name)
      `,
        { count: "exact" }
      )
      .eq("status", "AVAILABLE")
      .order(
        sortBy === "newest"
          ? "created_at"
          : sortBy === "oldest"
          ? "created_at"
          : sortBy === "price_asc"
          ? "price"
          : sortBy === "price_desc"
          ? "price"
          : "view_count",
        { ascending: sortBy === "newest" || sortBy === "price_asc" }
      )
      .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    if (selectedCondition) {
      query = query.eq("condition", selectedCondition);
    }
    if (selectedMeetupLocation) {
      query = query.eq("meetup_location_preference", selectedMeetupLocation);
    }
    if (minPrice) {
      query = query.gte("price", parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte("price", parseFloat(maxPrice));
    }
    if (showOnlyNegotiable) {
      query = query.eq("is_negotiable", true);
    }
    if (showOnlyVerified) {
      query = query.eq("seller.is_verified", true);
    }

    return query;
  }, [
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedMeetupLocation,
    minPrice,
    maxPrice,
    sortBy,
    showOnlyNegotiable,
    showOnlyVerified,
    page,
    supabase,
  ]);

  const fetchListings = useCallback(async (resetPage = false) => {
    if (resetPage) {
      setPage(1);
      return;
    }

    setLoading(true);
    try {
      const query = buildQuery();
      const { data, error, count } = await query;

      if (error) throw error;

      if (page === 1) {
        setListings(data || []);
      } else {
        setListings((prev) => [...prev, ...(data || [])]);
      }
      setTotalCount(count || 0);
      setHasMore((data || []).length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, page]);

  // Initial data fetch
  useEffect(() => {
    if (!initialCategories.length) {
      supabase
        .from("categories")
        .select("id, name, slug")
        .order("position")
        .then(({ data }) => data && setCategories(data));
    }
    if (!initialMeetupLocations.length) {
      supabase
        .from("meetup_locations")
        .select("id, name, building, floor")
        .eq("is_active", true)
        .order("name")
        .then(({ data }) => data && setMeetupLocations(data));
    }
  }, [supabase, initialCategories.length, initialMeetupLocations.length]);

  // Fetch when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedMeetupLocation,
    minPrice,
    maxPrice,
    sortBy,
    showOnlyNegotiable,
    showOnlyVerified,
    fetchListings,
  ]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const activeFiltersCount = [
    searchQuery,
    selectedCategory,
    selectedCondition,
    selectedMeetupLocation,
    minPrice,
    maxPrice,
    showOnlyNegotiable,
    showOnlyVerified,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(categoryId || "");
    setSelectedCondition("");
    setSelectedMeetupLocation("");
    setMinPrice("");
    setMaxPrice("");
    setShowOnlyNegotiable(false);
    setShowOnlyVerified(false);
    setSortBy("newest");
  };

  const conditionOptions = [
    { value: "NEW", label: "New" },
    { value: "LIKE_NEW", label: "Like New" },
    { value: "GOOD", label: "Good" },
    { value: "FAIR", label: "Fair" },
    { value: "POOR", label: "Poor" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" },
  ];

  if (loading && page === 1 && listings.length === 0) {
    return (
      <div className={cn("grid gap-6", className)}>
        {[...Array(6)].map((_, i) => (
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
    );
  }

  return (
    <div className={cn(className)}>
      {/* Mobile Filter Toggle */}
      {showFilters && (
        <div className="lg:hidden mb-4">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        {showFilters && (
          <aside
            className={cn(
              "lg:w-72 flex-shrink-0 space-y-6",
              filtersOpen ? "block" : "lg:block hidden"
            )}
          >
            <div className="sticky top-24 space-y-6 p-4 bg-gray-50 rounded-xl border">
              {/* Search */}
              <div>
                <label htmlFor="search" className="text-sm font-medium mb-1 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search listings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="text-sm font-medium mb-1 block">
                  Category
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Condition */}
              <div>
                <label htmlFor="condition" className="text-sm font-medium mb-1 block">
                  Condition
                </label>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Any condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any condition</SelectItem>
                    {conditionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Meetup Location */}
              <div>
                <label htmlFor="meetup" className="text-sm font-medium mb-1 block">
                  Meetup Location
                </label>
                <Select value={selectedMeetupLocation} onValueChange={setSelectedMeetupLocation}>
                  <SelectTrigger id="meetup">
                    <SelectValue placeholder="Any location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any location</SelectItem>
                    {meetupLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} {loc.building && `- ${loc.building}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-1 block">Price Range (PHP)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full"
                    step="0.01"
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyNegotiable}
                    onChange={(e) => setShowOnlyNegotiable(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Negotiable only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyVerified}
                    onChange={(e) => setShowOnlyVerified(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Verified sellers only</span>
                </label>
              </div>

              {/* Sort */}
              <div>
                <label htmlFor="sort" className="text-sm font-medium mb-1 block">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger id="sort">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" className="w-full text-destructive" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Clear all filters
                </Button>
              )}
            </div>
          </aside>
        )}

        {/* Listings Grid */}
        <div className="flex-1 min-w-0">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground">
                {totalCount || listings.length} {totalCount || listings.length === 1 ? "listing" : "listings"} found
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Tags */}
          {(activeFiltersCount > 0 || searchQuery) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchQuery && (
                <Badge variant="outline" className="gap-1">
                  Search: "{searchQuery}"
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="outline" className="gap-1">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCategory("")}
                  />
                </Badge>
              )}
              {selectedCondition && (
                <Badge variant="outline" className="gap-1">
                  {conditionOptions.find((c) => c.value === selectedCondition)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedCondition("")}
                  />
                </Badge>
              )}
              {selectedMeetupLocation && (
                <Badge variant="outline" className="gap-1">
                  {meetupLocations.find((l) => l.id === selectedMeetupLocation)?.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSelectedMeetupLocation("")}
                  />
                </Badge>
              )}
              {(minPrice || maxPrice) && (
                <Badge variant="outline" className="gap-1">
                  PHP {minPrice || "0"} - {maxPrice || "∞"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  />
                </Badge>
              )}
              {showOnlyNegotiable && (
                <Badge variant="outline" className="gap-1">
                  Negotiable only
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setShowOnlyNegotiable(false)}
                  />
                </Badge>
              )}
              {showOnlyVerified && (
                <Badge variant="outline" className="gap-1">
                  Verified sellers
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setShowOnlyVerified(false)}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Listings */}
          {listings.length === 0 ? (
            <div className="text-center py-16">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search terms.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-6",
                  variant === "compact"
                    ? "grid-cols-1"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                )}
              >
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant={variant}
                  />
                ))}
              </div>

              {/* Load More / Infinite Scroll */}
              {hasMore && (
                <div className="mt-8 text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading more...
                      </>
                    ) : (
                      "Load More Listings"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}