-- Migrazione per sistema voti richieste libere
-- Eseguire su Supabase SQL Editor

-- 1. Aggiungere colonne contatori voti alla tabella richieste_libere
ALTER TABLE public.richieste_libere
ADD COLUMN IF NOT EXISTS up_votes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS down_votes integer NOT NULL DEFAULT 0;

-- Indici per ordinamento per popolarità
CREATE INDEX IF NOT EXISTS idx_richieste_libere_up_votes ON public.richieste_libere(up_votes DESC);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_down_votes ON public.richieste_libere(down_votes DESC);

-- 2. Creare tabella per tracciare i voti individuali (anti-duplicato)
CREATE TABLE IF NOT EXISTS public.richieste_libere_voti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessioni_libere(id) ON DELETE CASCADE,
  richiesta_id uuid NOT NULL REFERENCES public.richieste_libere(id) ON DELETE CASCADE,
  voter_id text NOT NULL, -- UUID generato client-side, persistito in localStorage
  vote text NOT NULL CHECK (vote IN ('up', 'down')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Un solo voto per utente per richiesta per sessione
  CONSTRAINT unique_vote_per_user UNIQUE (session_id, richiesta_id, voter_id)
);

-- Indici per query veloci
CREATE INDEX IF NOT EXISTS idx_richieste_libere_voti_richiesta ON public.richieste_libere_voti(richiesta_id);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_voti_voter ON public.richieste_libere_voti(voter_id);
CREATE INDEX IF NOT EXISTS idx_richieste_libere_voti_session ON public.richieste_libere_voti(session_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_voti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_richieste_libere_voti_updated_at ON public.richieste_libere_voti;
CREATE TRIGGER update_richieste_libere_voti_updated_at
  BEFORE UPDATE ON public.richieste_libere_voti
  FOR EACH ROW EXECUTE FUNCTION update_voti_updated_at();

-- 3. Funzione RPC atomica per gestione voti
-- action: 'up' | 'down' | 'none' (rimuovi voto)
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
BEGIN
  -- Verifica che la richiesta esista e appartenga alla sessione
  IF NOT EXISTS (
    SELECT 1 FROM public.richieste_libere 
    WHERE id = p_richiesta_id AND session_id = p_session_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
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

  -- Leggi contatori aggiornati
  SELECT up_votes, down_votes INTO v_up_votes, v_down_votes
  FROM public.richieste_libere
  WHERE id = p_richiesta_id;

  RETURN jsonb_build_object(
    'ok', true,
    'upVotes', v_up_votes,
    'downVotes', v_down_votes,
    'myVote', v_my_vote
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Funzione helper per ottenere voti utente per una sessione
CREATE OR REPLACE FUNCTION get_user_votes_for_session(
  p_session_id uuid,
  p_voter_id text
)
RETURNS TABLE (richiesta_id uuid, vote text) AS $$
BEGIN
  RETURN QUERY
  SELECT v.richiesta_id, v.vote
  FROM public.richieste_libere_voti v
  WHERE v.session_id = p_session_id AND v.voter_id = p_voter_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions per RPC (se usi anon key)
-- GRANT EXECUTE ON FUNCTION vote_richiesta_libera TO anon;
-- GRANT EXECUTE ON FUNCTION get_user_votes_for_session TO anon;
