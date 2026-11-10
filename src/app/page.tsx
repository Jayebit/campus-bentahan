import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchBar } from "@/components/search-bar";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">Campus Bentahan</h1>
        <p className="text-muted-foreground">
          Your university marketplace for buying, selling, and discovering items
        </p>
      </header>

      {/* Search Bar */}
      <div className="mb-8">
        <SearchBar placeholder="Search for textbooks, electronics, dorm essentials..." />
      </div>

      {/* Categories Preview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Browse Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Textbooks", "Electronics", "Dorm Essentials", "Clothing", "Sports", "Services", "Food", "Other"].map(
            (category) => (
              <Link key={category} href={`/category/${category.toLowerCase()}`}>
                <Card>
                  <CardContent className="p-4 text-center">
                    <CardTitle>{category}</CardTitle>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      </section>

      {/* Featured Listings */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Recent Listings</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Sample Listing {i}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sample description for listing {i}
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-semibold">$99.99</span>
                  <Button size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}