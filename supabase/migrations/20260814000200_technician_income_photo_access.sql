-- Allow active technicians to read private reception photos only for repairs
-- included in their configured visibility scope. Upload/update/delete remain admin-only.
DROP POLICY IF EXISTS "Technicians can view authorized income photos" ON storage.objects;
CREATE POLICY "Technicians can view authorized income photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'income-entry-photos'
    AND EXISTS (
      SELECT 1
      FROM public.income_entries e
      JOIN public.technicians t ON t.business_id = e.user_id
      WHERE e.user_id::text = split_part(storage.objects.name, '/', 1)
        AND e.id::text = split_part(storage.objects.name, '/', 2)
        AND t.auth_user_id = auth.uid()
        AND t.is_active
        AND (
          e.technician_id = t.id
          OR t.visibility_scope = 'business_read'
          OR (t.visibility_scope = 'assigned_unassigned' AND e.technician_id IS NULL)
        )
    )
  );
