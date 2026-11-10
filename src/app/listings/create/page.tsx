"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Upload, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const conditionOptions = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  price: z.coerce.number().min(0.01, "Price must be greater than 0").max(100000, "Price too high"),
  original_price: z.coerce.number().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]),
  category_id: z.string().uuid("Please select a category"),
  meetup_location_preference: z.string().uuid().optional(),
  is_negotiable: z.boolean().default(false),
});

type ListingFormValues = z.infer<typeof listingSchema>;

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
  room: string | null;
}

export default function CreateListingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meetupLocations, setMeetupLocations] = useState<MeetupLocation[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      is_negotiable: false,
    },
  });

  const watchedPrice = watch("price");
  const watchedOriginalPrice = watch("original_price");

  useEffect(() => {
    async function fetchData() {
      const [categoriesRes, locationsRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("position"),
        supabase.from("meetup_locations").select("id, name, building, floor, room").eq("is_active", true).order("name"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (locationsRes.data) setMeetupLocations(locationsRes.data);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    if (watchedPrice && watchedOriginalPrice && watchedOriginalPrice < watchedPrice) {
      setValue("original_price", undefined);
    }
  }, [watchedPrice, watchedOriginalPrice, setValue]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > 10) {
      toast({
        variant: "destructive",
        title: "Too many images",
        description: "Maximum 10 images allowed per listing.",
      });
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not an image.`,
        });
        return;
      }
    }

    setUploadingImages(true);
    try {
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      setImages((prev) => [...prev, ...files]);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ListingFormValues) => {
    if (!user) return;

    if (images.length === 0) {
      toast({
        variant: "destructive",
        title: "No images",
        description: "Please upload at least one image for your listing.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload images to storage
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(fileName, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("listing-images")
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Create listing
      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          category_id: data.category_id,
          title: data.title,
          description: data.description,
          price: data.price,
          original_price: data.original_price || null,
          condition: data.condition,
          status: "AVAILABLE",
          images: imageUrls,
          meetup_location_preference: data.meetup_location_preference || null,
          is_negotiable: data.is_negotiable,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Listing created",
        description: "Your listing is now live on the marketplace.",
      });

      router.push(`/listings/${listing.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create listing.",
      });
    } finally {
      setIsLoading(false);
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
        <p className="text-muted-foreground">You need to be logged in to create a listing.</p>
      </div>
    );
  }

  const priceWithSavings = watchedPrice && watchedOriginalPrice && watchedOriginalPrice > watchedPrice
    ? watchedOriginalPrice - watchedPrice
    : null;

  return (
    <div className="container mx-auto max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Listing</h1>
        <p className="text-muted-foreground mt-1">Sell your items to fellow students</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={'e.g., MacBook Pro M2 13" - Excellent Condition'}
                {...register("title")}
                disabled={isLoading}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Category</Label>
              <Select onValueChange={(value) => setValue("category_id", value)}>
                <SelectTrigger disabled={isLoading}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-sm text-destructive">{errors.category_id.message}</p>}
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onValueChange={(value) => setValue("condition", value as any)}
              >
                <SelectTrigger disabled={isLoading}>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.condition && <p className="text-sm text-destructive">{errors.condition.message}</p>}
            </div>

            {/* Price */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (PHP)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    {...register("price")}
                    disabled={isLoading}
                  />
                </div>
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_price">Original Price (Optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="original_price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    {...register("original_price")}
                    disabled={isLoading}
                  />
                </div>
                {errors.original_price && <p className="text-sm text-destructive">{errors.original_price.message}</p>}
              </div>
            </div>

            {priceWithSavings && (
              <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                Savings: PHP {priceWithSavings.toFixed(2)} ({(priceWithSavings / (watchedOriginalPrice || 1) * 100).toFixed(0)}% off)
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the item in detail: condition, specs, included accessories, reason for selling, etc."
                rows={6}
                {...register("description")}
                disabled={isLoading}
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            {/* Meetup Location */}
            <div className="space-y-2">
              <Label htmlFor="meetup_location_preference">Preferred Meetup Location</Label>
              <Select onValueChange={(value) => setValue("meetup_location_preference", value)}>
                <SelectTrigger disabled={isLoading}>
                  <SelectValue placeholder="Select preferred meetup location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No preference</SelectItem>
                  {meetupLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} {loc.building && `- ${loc.building}`} {loc.floor && `(${loc.floor})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Negotiable */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_negotiable"
                {...register("is_negotiable")}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_negotiable" className="cursor-pointer mb-0">
                Price is negotiable
              </Label>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Images (max 10, 10MB each)</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  uploadingImages ? "opacity-50" : "hover:border-primary hover:bg-primary/5"
                )}
              >
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="sr-only"
                  disabled={isLoading || uploadingImages || images.length >= 10}
                />
                <label
                  htmlFor="images"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {images.length >= 10 ? "Maximum images reached" : "Click or drag to upload images"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {images.length}/10 images • PNG, JPG, WebP up to 10MB each
                  </span>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square group">
                      <img
                        src={preview}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className={cn(
                          "absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity",
                          isLoading && "pointer-events-none opacity-0"
                        )}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Listing"
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}