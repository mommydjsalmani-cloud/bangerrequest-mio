-- Migrazione per stato PLAYED (brano suonato)
-- Eseguire su Supabase SQL Editor

-- 1. Aggiungere colonna played_at alla tabella richieste_libere
-- Il campo status già supporta valori dinamici come text, quindi 'played' 
-- sarà semplicemente un nuovo valore valido
ALTER TABLE public.richieste_libere
ADD COLUMN IF NOT EXISTS played_at timestamptz;

-- 2. Indice per query veloci sulle richieste suonate
CREATE INDEX IF NOT EXISTS idx_richieste_libere_played_at ON public.richieste_libere(played_at DESC);

-- 3. Indice composito per ordinamento ottimizzato (non-played prima, played in fondo)
CREATE INDEX IF NOT EXISTS idx_richieste_libere_status_played ON public.richieste_libere(status, played_at DESC);

-- 4. Aggiorna funzione RPC per bloccare voti su richieste played
-- NOTA: Se la funzione vote_richiesta_libera esiste, questa la aggiorna per bloccare i voti
-- Se non esiste, la crea con il blocco incluso
CREATE OR REPLACE FUNCTION vote_richiesta_libera(
  p_session_id uuid,
  p_richiesta_id uuid,
  p_voter_id text,
  p_action text -- 'up', 'down', 'none'
)
RETURNS jsonb AS $$
DECLARE
  v_existing_vote text;
  v_up_votes integer;
  v_down_votes integer;
  v_my_vote text;
  v_status text;
BEGIN
  -- Verifica che la richiesta esista e appartenga alla sessione
  SELECT status INTO v_status
  FROM public.richieste_libere 
  WHERE id = p_richiesta_id AND session_id = p_session_id;
  
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;
  
  -- BLOCCO VOTI: Se la richiesta è "played", rifiuta il voto
  IF v_status = 'played' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'vote_disabled_played');
  END IF;

  -- Trova voto esistente
  SELECT vote INTO v_existing_vote
  FROM public.richieste_libere_voti
  WHERE session_id = p_session_id 
    AND richiesta_id = p_richiesta_id 
    AND voter_id = p_voter_id;

  -- Gestione logica voto
  IF p_action = 'none' THEN
    -- Rimuovi voto esistente
    IF v_existing_vote IS NOT NULL THEN
      DELETE FROM public.richieste_libere_voti
      WHERE session_id = p_session_id 
        AND richiesta_id = p_richiesta_id 
        AND voter_id = p_voter_id;
      
      -- Decrementa contatore appropriato
      IF v_existing_vote = 'up' THEN
        UPDATE public.richieste_libere 
        SET up_votes = GREATEST(0, up_votes - 1)
        WHERE id = p_richiesta_id;
      ELSE
        UPDATE public.richieste_libere 
        SET down_votes = GREATEST(0, down_votes - 1)
        WHERE id = p_richiesta_id;
      END IF;
    END IF;
    
    v_my_vote := NULL;
    
  ELSIF p_action IN ('up', 'down') THEN
    IF v_existing_vote IS NULL THEN
      -- Nuovo voto
      INSERT INTO public.richieste_libere_voti (session_id, richiesta_id, voter_id, vote)
      VALUES (p_session_id, p_richiesta_id, p_voter_id, p_action);
      
      -- Incrementa contatore
      IF p_action = 'up' THEN
        UPDATE public.richieste_libere SET up_votes = up_votes + 1 WHERE id = p_richiesta_id;
      ELSE
        UPDATE public.richieste_libere SET down_votes = down_votes + 1 WHERE id = p_richiesta_id;
      END IF;
      
      v_my_vote := p_action;
      
    ELSIF v_existing_vote = p_action THEN
      -- Toggle: stesso voto = rimuovi
      DELETE FROM public.richieste_libere_voti
      WHERE session_id = p_session_id 
        AND richiesta_id = p_richiesta_id 
        AND voter_id = p_voter_id;
      
      IF p_action = 'up' THEN
        UPDATE public.richieste_libere SET up_votes = GREATEST(0, up_votes - 1) WHERE id = p_richiesta_id;
      ELSE
        UPDATE public.richieste_libere SET down_votes = GREATEST(0, down_votes - 1) WHERE id = p_richiesta_id;
      END IF;
      
      v_my_vote := NULL;
      
    ELSE
      -- Switch: voto opposto
      UPDATE public.richieste_libere_voti
      SET vote = p_action, updated_at = now()
      WHERE session_id = p_session_id 
        AND richiesta_id = p_richiesta_id 
        AND voter_id = p_voter_id;
      
      -- Aggiorna entrambi i contatori
      IF p_action = 'up' THEN
        UPDATE public.richieste_libere 
        SET up_votes = up_votes + 1, down_votes = GREATEST(0, down_votes - 1)
        WHERE id = p_richiesta_id;
      ELSE
        UPDATE public.richieste_libere 
        SET down_votes = down_votes + 1, up_votes = GREATEST(0, up_votes - 1)
        WHERE id = p_richiesta_id;
      END IF;
      
      v_my_vote := p_action;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_action');
  END IF;

  -- Ottieni i contatori aggiornati
  SELECT up_votes, down_votes INTO v_up_votes, v_down_votes
  FROM public.richieste_libere
  WHERE id = p_richiesta_id;

  RETURN jsonb_build_object(
    'ok', true,
    'upVotes', COALESCE(v_up_votes, 0),
    'downVotes', COALESCE(v_down_votes, 0),
    'myVote', v_my_vote
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Commento sulla migrazione
COMMENT ON COLUMN public.richieste_libere.played_at IS 'Timestamp di quando il brano è stato segnato come "suonato". Se status=played, questo campo viene valorizzato.';

-- Fine migrazione
