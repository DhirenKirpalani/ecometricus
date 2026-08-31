-- Fix position for super_admin users
UPDATE public.profiles
SET position = 'Super Admin'
WHERE role = 'super_admin';

UPDATE public.personnel
SET position = 'Super Admin'
WHERE role ILIKE '%super_admin%';
