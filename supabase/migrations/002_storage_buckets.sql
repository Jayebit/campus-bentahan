-- Campus Bentahan - Storage Buckets
-- Migration 002: Create storage buckets for avatars and listing images

-- Enable the storage extension
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "storage";

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create listing-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-images',
    'listing-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatars bucket
-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Public can view avatars
CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- RLS Policies for listing-images bucket
-- Users can upload images for their listings
CREATE POLICY "Users can upload listing images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'listing-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own listing images
CREATE POLICY "Users can update listing images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'listing-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own listing images
CREATE POLICY "Users can delete listing images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'listing-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Public can view listing images
CREATE POLICY "Public can view listing images" ON storage.objects
    FOR SELECT USING (bucket_id = 'listing-images');