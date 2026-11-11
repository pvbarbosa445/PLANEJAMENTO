-- Executar no projeto Supabase existente do Calendário Financeiro.
-- Permite o perfil 3 sem apagar dados financeiros já armazenados.
ALTER TABLE public.finance_state
  DROP CONSTRAINT IF EXISTS finance_state_profile_id_check;

ALTER TABLE public.finance_state
  ADD CONSTRAINT finance_state_profile_id_check
  CHECK (profile_id IN ('1', '2', '3'));
