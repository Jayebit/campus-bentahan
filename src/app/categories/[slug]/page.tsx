import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ListingGrid } from "@/components/listings/ListingGrid";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: category } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("slug", slug)
    .single();

  if (!category) {
    return { title: "Category Not Found" };
  }

  const categoryName = (category as { name: string }).name;

  return {
    title: `${categoryName} - Campus Bentahan`,
    description: `Browse ${categoryName} listings from your campus community`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Fetch category
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  if (categoryError || !category) {
    notFound();
  }

  const categoryId = (category as { id: string }).id;
  const categoryName = (category as { name: string }).name;

  // Fetch subcategories
  const { data: subcategories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("parent_id", categoryId)
    .order("position");

  const subcategoriesTyped = (subcategories || []) as Array<{ id: string; name: string; slug: string }>;

  // Fetch initial listings for this category
  const { data: listings, count } = await supabase
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
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
    .limit(20);

  const listingsTyped = (listings || []) as Array<{
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
    category: { id: string; name: string; slug: string } | null;
    seller: { id: string; display_name: string | null; avatar_url: string | null; is_verified: boolean } | null;
    meetup_location: { name: string } | null;
  }>;

  // Fetch all categories for filter
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("position");

  const allCategoriesTyped = (allCategories || []) as Array<{ id: string; name: string; slug: string }>;

  // Fetch meetup locations for filter
  const { data: meetupLocations } = await supabase
    .from("meetup_locations")
    .select("id, name, building, floor")
    .eq("is_active", true)
    .order("name");

  const meetupLocationsTyped = (meetupLocations || []) as Array<{ id: string; name: string; building: string | null; floor: string | null }>;

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      {/* Category Header */}
      <div className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/marketplace" className="hover:text-primary">Marketplace</a>
          <span>/</span>
          <span className="font-medium">{categoryName}</span>
        </nav>
        <h1 className="text-3xl font-bold">{categoryName}</h1>
        <p className="text-muted-foreground mt-1">
          {count || 0} {count === 1 ? "listing" : "listings"} in this category
        </p>
      </div>

      {/* Subcategories */}
      {subcategoriesTyped && subcategoriesTyped.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {subcategoriesTyped.map((sub) => (
            <a
              key={sub.id}
              href={`/categories/${sub.slug}`}
              className="px-3 py-1.5 text-sm bg-gray-100 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {sub.name}
            </a>
          ))}
        </div>
      )}

      {/* Listings Grid */}
      <ListingGrid
        initialListings={listingsTyped}
        initialCategories={allCategoriesTyped}
        initialMeetupLocations={meetupLocationsTyped}
        categoryId={categoryId}
        showFilters={true}
      />
    </div>
  );
}