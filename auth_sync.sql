-- Script de synchronisation automatique Auth -> Public
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Fonction pour créer un profil public à la création d'un utilisateur Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, status, avatar)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'TECHNICIAN'),
    'Actif',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger pour appeler la fonction sur INSERT dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Synchronisation immédiate des utilisateurs existants (optionnel)
INSERT INTO public.users (id, name, email, role, status, avatar)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 
  email, 
  COALESCE(raw_user_meta_data->>'role', 'TECHNICIAN'), 
  'Actif',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id
FROM auth.users
ON CONFLICT (email) DO NOTHING;
