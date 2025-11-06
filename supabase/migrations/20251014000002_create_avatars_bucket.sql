-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Allow users to upload their own avatars
-- Filename format: userId_timestamp.ext
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = split_part(name, '_', 1)
);

-- Allow anyone to view avatars (since they're displayed publicly)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = split_part(name, '_', 1)
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = split_part(name, '_', 1)
);
