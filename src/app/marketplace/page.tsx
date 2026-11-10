import { Metadata } from "next";
import { ListingGrid } from "@/components/listings/ListingGrid";

export const metadata: Metadata = {
  title: "Marketplace - Campus Bentahan",
  description: "Browse and buy items from fellow students at your university",
};

export default function MarketplacePage() {
  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground mt-1">
          Discover items for sale from your campus community
        </p>
      </div>

      <ListingGrid showFilters={true} />
    </div>
  );
}