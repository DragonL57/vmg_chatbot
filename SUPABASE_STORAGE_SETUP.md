# Supabase Storage Setup for Large Files

To bypass Vercel's **4.5MB payload limit**, this project uses a "Storage-First" ingestion pipeline. Large files are uploaded directly from the browser to Supabase Storage before being processed by the backend.

### 1. SQL Configuration
Copy and paste the following commands into your **Supabase SQL Editor** and run them:

```sql
-- 1. Create the bucket for knowledge files
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-sources', 'knowledge-sources', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Upload
-- This allows the Admin UI (frontend) to upload files directly
CREATE POLICY "Allow public upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'knowledge-sources' );

-- 3. Allow Public Read
-- This allows the Backend (Indexing Service) to download files for processing
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'knowledge-sources' );

-- 4. Allow Delete
-- Allows the system to clean up source files after processing or during deletion
CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'knowledge-sources' );
```

### 2. Dashboard Verification
After running the SQL, verify the following in your Supabase Dashboard:
1. Go to **Storage** in the left sidebar.
2. You should see a bucket named `knowledge-sources`.
3. Click the "cog" icon (Settings) on the bucket and ensure it is set to **Public**.

### 3. Vercel Environment Variables
Ensure these variables are added to your Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
- `NEXT_PUBLIC_SUPABASE_KEY`: Your Supabase Anonymous Key.
- `SUPABASE_URL`: (Server-side) Same as above.
- `SUPABASE_KEY`: (Server-side) Same as above.

---
**Note:** The system is now configured to handle documents of any size (up to the limit defined in your Supabase plan, usually 50MB - 5GB).
