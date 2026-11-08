# LGPD Audit Status

**Projeto**: MemoryDoc / folio-protocolo
**Cenário**: A — Greenfield
**Início**: 2026-11-08
**Última atualização**: 2026-11-08
**Encarregado**: pendente designação

## Pipeline atual
- [x] F0 — Setup e descoberta
- [x] F1 — Legal basis preliminar
- [x] F2 — Data mapping preliminar
- [x] F3 — Consent schema/specificação
- [x] F4 — Privacy policy — draft
- [x] F5 — DSAR/workflow + canal público, interface administrativa e trilha técnica
- [x] F6 — Audit logging — proteção de logs e solicitações rastreáveis
- [ ] F7 — Encryption keys
- [x] F8 — Retention/erasure — expiração configurável de sessões; documentos preservados
- [x] F9 — Incident response/runbook inicial
- [ ] F10 — ROPA (checkpoint)

## Artefatos gerados
- `.lgpd/data-map.md` — v1, 2026-11-08
- `.lgpd/legal-basis.md` — v1, 2026-11-08
- `.lgpd/gaps.md` — v1, 2026-11-08

## Gaps abertos
Ver `.lgpd/gaps.md`.

## Implementação técnica realizada
- Endpoints autenticados e interface administrativa para registrar/listar/tratar solicitações de titulares.
- Migration aditiva `20261108000000_data_subject_requests`.
- Canal público MVP em `/privacidade/solicitar`, endpoint `POST /api/public/privacy-requests`, referência de acompanhamento, prazo operacional inicial e trilha técnica de eventos.
- Solicitações públicas ficam disponíveis somente para administradores na interface de tratamento; o canal não acessa links documentais nem envia e-mails.
- Páginas públicas `/privacidade` e `/cookies`, alimentadas automaticamente pelos documentos `privacy-policy-v1-draft.md` e `cookie-policy-v1-draft.md`.
- Banner informativo e gerenciador de preferências implementados no frontend; somente a categoria necessária está ativa e as preferências são salvas localmente no navegador.
- Limpeza de sessões expiradas na inicialização e `SESSION_HOURS` configurável.
- Documentação de API/operação atualizada.

## Próximo passo
Atualização:
- Público-alvo documentado como usuários internos adultos.
- Resumo e finalidade documental destacam registro e numeração de protocolos.
- O MVP ainda não possui entidade empresarial, CNPJ, contatos institucionais, Encarregado ou revisão jurídica.
- Foram implementados endpoints autenticados e canal público MVP para solicitações de titulares.
- A validação adicional de identidade, o canal institucional oficial, as notificações e o procedimento de atendimento ainda dependem de decisão do controlador/Encarregado.
- A expiração de sessões é configurável.
- O MVP roda apenas em máquina local, sem hospedagem em nuvem ou operador de infraestrutura externo identificado.

Checkpoint F4: revisar `.lgpd/policies/privacy-policy-v1-draft.md` com Jurídico/controlador. Não publicar como versão final até aprovação. A migration `20261108000000_data_subject_requests` foi aplicada ao banco SQLite local.
