-- Migrazione: Aggiunge contatore richieste per gestire ri-richieste di brani rifiutati
-- Data: 2026-01-11

-- Aggiungi colonna request_count (default 1 per richieste esistenti)
ALTER TABLE richieste_libere 
ADD COLUMN IF NOT EXISTS request_count INTEGER DEFAULT 1;

-- Imposta il valore di default per le richieste esistenti
UPDATE richieste_libere SET request_count = 1 WHERE request_count IS NULL;

-- Commento: Questo contatore tiene traccia di quante volte un brano è stato richiesto
-- Quando un brano rifiutato viene ri-richiesto, il contatore aumenta
