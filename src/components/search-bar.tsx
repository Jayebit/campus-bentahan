"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({
  placeholder = "Search...",
  defaultValue = "",
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 h-12 text-base"
        />
        <Button
          type="submit"
          size="lg"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
        >
          Search
        </Button>
      </div>
    </form>
  );
}