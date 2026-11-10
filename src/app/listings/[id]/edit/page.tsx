"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, X, Upload, DollarSign, Trash2, ArrowLeft } from "lucide-react";
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

interface ListingData {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  condition: string;
  category_id: string;
  meetup_location_preference: string | null;
  is_negotiable: boolean;
  images: string[];
  status: string;
  seller_id: string;
}

export default function EditListingPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meetupLocations, setMeetupLocations] = useState<MeetupLocation[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [listingData, setListingData] = useState<ListingData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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
      const listingId = params.id as string;

      const [categoriesRes, locationsRes, listingRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("position"),
        supabase.from("meetup_locations").select("id, name, building, floor, room").eq("is_active", true).order("name"),
        supabase
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .single(),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (locationsRes.data) setMeetupLocations(locationsRes.data);
      if (listingRes.data) {
        const listing = listingRes.data;
        setListingData(listing);
        setExistingImages(listing.images || []);

        // Populate form
        reset({
          title: listing.title,
          description: listing.description || "",
          price: listing.price,
          original_price: listing.original_price || undefined,
          condition: listing.condition,
          category_id: listing.category_id,
          meetup_location_preference: listing.meetup_location_preference || "",
          is_negotiable: listing.is_negotiable,
        });
      }
    }
    fetchData();
  }, [params.id, supabase, reset]);

  useEffect(() => {
    if (watchedPrice && watchedOriginalPrice && watchedOriginalPrice < watchedPrice) {
      setValue("original_price", undefined);
    }
  }, [watchedPrice, watchedOriginalPrice, setValue]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > 10) {
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

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageUrl: string) => {
    setExistingImages((prev) => prev.filter((img) => img !== imageUrl));
    setImagesToDelete((prev) => [...prev, imageUrl]);
  };

  const onSubmit = async (data: ListingFormValues) => {
    if (!user || !listingData) return;

    const allImages = [...existingImages, ...imagePreviews];
    if (allImages.length === 0) {
      toast({
        variant: "destructive",
        title: "No images",
        description: "Please upload at least one image for your listing.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Delete images marked for removal
      for (const imageUrl of imagesToDelete) {
        const pathMatch = imageUrl.match(/\/listing-images\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from("listing-images").remove([pathMatch[1]]);
        }
      }

      // Upload new images
      const newImageUrls: string[] = [];
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

        newImageUrls.push(publicUrl);
      }

      // Combine existing and new images (preserving order of existing)
      const finalImages = [...existingImages, ...newImageUrls];

      // Update listing
      const { error } = await supabase
        .from("listings")
        .update({
          title: data.title,
          description: data.description,
          price: data.price,
          original_price: data.original_price || null,
          condition: data.condition,
          category_id: data.category_id,
          meetup_location_preference: data.meetup_location_preference || null,
          is_negotiable: data.is_negotiable,
          images: finalImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingData.id);

      if (error) throw error;

      toast({
        title: "Listing updated",
        description: "Your changes have been saved.",
      });

      router.push(`/listings/${listingData.id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update listing.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!user || !listingData) return;

    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;

    try {
      // Delete images from storage
      for (const imageUrl of listingData.images) {
        const pathMatch = imageUrl.match(/\/listing-images\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from("listing-images").remove([pathMatch[1]]);
        }
      }

      const { error } = await supabase.from("listings").delete().eq("id", listingData.id);
      if (error) throw error;

      toast({ title: "Listing deleted" });
      router.push("/dashboard/my-listings");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete listing",
      });
    }
  };

  if (authLoading || !listingData) {
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
        <p className="text-muted-foreground">You need to be logged in to edit a listing.</p>
      </div>
    );
  }

  if (listingData.seller_id !== user.id && user.role !== "admin") {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground">You can only edit your own listings.</p>
      </div>
    );
  }

  const priceWithSavings = watchedPrice && watchedOriginalPrice && watchedOriginalPrice > watchedPrice
    ? watchedOriginalPrice - watchedPrice
    : null;

  return (
    <div className="container mx-auto max-w-3xl py-12">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Listing
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Listing</h1>
          <p className="text-muted-foreground mt-1">Update your listing details</p>
        </div>
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
                Savings: PHP {priceWithSavings.toFixed(2)} ({" "}{(
                  (priceWithSavings / (watchedOriginalPrice || 1)) *
                  100
                ).toFixed(0)}% off)
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

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Current Images</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {existingImages.map((preview, index) => (
                      <div key={index} className="relative aspect-square group">
                        <img
                          src={preview}
                          alt={`Current image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(preview)}
                          className={cn(
                            "absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity",
                            isLoading && "pointer-events-none opacity-0"
                          )}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images Upload */}
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
                  disabled={isLoading || uploadingImages || existingImages.length + images.length >= 10}
                />
                <label
                  htmlFor="images"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {existingImages.length + images.length >= 10
                      ? "Maximum images reached"
                      : "Click or drag to add more images"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {existingImages.length + images.length}/10 images • PNG, JPG, WebP up to 10MB each
                  </span>
                </label>
              </div>

              {/* New Image Previews */}
              {images.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">New Images (not saved yet)</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square group">
                        <img
                          src={preview}
                          alt={`New image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
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
                </div>
              )}
            </div>

            {/* Submit & Delete */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
                  Cancel
                </Button>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteListing}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Listing
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}