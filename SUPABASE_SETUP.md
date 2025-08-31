# Supabase Setup Guide

## Required Storage Bucket

To enable photo uploads, you need to create a storage bucket in your Supabase project:

### 1. Go to Supabase Dashboard
- Navigate to your project at https://supabase.com/dashboard
- Select your project

### 2. Create Storage Bucket
- Go to **Storage** in the left sidebar
- Click **Create a new bucket**
- Bucket name: `order-photos`
- Make it **public** (uncheck "Private bucket")
- Click **Create bucket**

### 3. Set Storage Policies
- Click on the `order-photos` bucket
- Go to **Policies** tab
- Add this policy for public access:
  ```sql
  CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'order-photos');
  CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-photos' AND auth.role() = 'authenticated');
  ```

### 4. Alternative: Disable Photo Uploads
If you don't want to set up storage, the app will fallback to storing local photo URIs, but these won't persist across app restarts.

## Current Status
- ✅ Database schema updated to match app requirements
- ✅ Status transitions fixed to use only supported statuses
- ✅ Action type logic improved
- ⚠️ Photo storage bucket needs to be created
- ✅ App will work without storage bucket (fallback to local URIs)
