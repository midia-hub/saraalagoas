-- Atualiza o job de lembretes de escalas para 17h05 America/Maceio (UTC-3 fixo, sem DST)
-- 17h05 Maceio = 20h05 UTC → expressão cron: '5 20 * * *'
-- Antes estava em '0 18 * * *' (15h00 Maceio).
SELECT cron.alter_job(
  job_id   := (SELECT jobid FROM cron.job WHERE jobname = 'escalas-lembretes-diarios'),
  schedule := '5 20 * * *'
);
