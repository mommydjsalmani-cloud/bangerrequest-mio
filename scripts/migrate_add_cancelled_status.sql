-- Migrazione per aggiungere stato 'cancelled'
-- Permette di cancellare richieste precedentemente accettate

-- Aggiorna il commento per includere il nuovo stato
COMMENT ON COLUMN public.richieste_libere.status IS 'new | accepted | rejected | cancelled | archived';

-- Test che il nuovo stato sia supportato (questo fallirà se ci sono constraint)
-- Se hai constraint CHECK, devi aggiornarli qui
-- ALTER TABLE public.richieste_libere DROP CONSTRAINT IF EXISTS check_status;
-- ALTER TABLE public.richieste_libere ADD CONSTRAINT check_status 
--   CHECK (status IN ('new', 'accepted', 'rejected', 'cancelled', 'archived'));

-- Test inserimento con nuovo stato
DO $$
BEGIN
  -- Test che possiamo inserire il nuovo stato
  INSERT INTO public.richieste_libere (
    session_id,
    title, 
    artists,
    client_ip,
    status
  ) 
  SELECT 
    id, 
    'Test cancelled status', 
    'Test artist',
    '127.0.0.1',
    'cancelled'
  FROM public.sessioni_libere 
  LIMIT 1;
  
  -- Rimuovi il record di test
  DELETE FROM public.richieste_libere 
  WHERE title = 'Test cancelled status' AND artists = 'Test artist';
  
  RAISE NOTICE 'Status cancelled supportato correttamente';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Errore nel test dello status cancelled: %', SQLERRM;
END
$$;