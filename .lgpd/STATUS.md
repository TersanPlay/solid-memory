# LGPD Audit Status

**Projeto**: MemoryDoc / folio-protocolo
**Cenário**: A — Greenfield
**Início**: 2026-11-08
**Última atualização**: 2026-11-09
**Encarregado**: pendente designação

> Este arquivo registra o estado técnico do MVP. Não é declaração de conformidade nem substitui decisão do controlador ou revisão jurídica.

## Legenda

- **[x] Implementado tecnicamente**: existe no código e foi validado no fluxo atual.
- **[~] Parcial**: existe uma parte técnica, mas faltam operação, configuração, cobertura ou decisão institucional.
- **[ ] Pendente**: ainda não implementado ou não iniciado.

## Pipeline atual

- [x] F0 — Setup e descoberta
- [~] F1 — Bases legais preliminares documentadas; validação pelo controlador pendente
- [~] F2 — Mapa de dados preliminar; classificação de conteúdo e owners pendentes
- [~] F3 — Especificação de consentimento; ledger não é necessário enquanto não houver finalidade opcional baseada em consentimento
- [~] F4 — Política de privacidade v1 em rascunho; publicação e revisão jurídica pendentes
- [~] F5 — DSAR com endpoint, canal público MVP, interface administrativa, mensagens, trilha e portabilidade técnica; operação institucional ainda parcial
- [~] F6 — Logs protegidos e solicitações rastreáveis; log imutável e registro formal de incidentes pendentes
- [ ] F7 — Criptografia gerenciada de chaves, armazenamento e backups
- [~] F8 — Sessões expiradas são limpas; regras e prazos de retenção são configuráveis por administradores, mas execução de eliminação continua pendente
- [x] F8.1 — Interface administrativa para regras por objeto, prazos, finalidades, bases legais e ações pós-prazo
- [x] F8.2 — Diagnóstico administrativo somente leitura para verificar a configuração da governança
- [~] F9 — Runbook inicial e redação de logs implementados; registro operacional e tabletop pendentes
- [ ] F10 — ROPA consolidado (checkpoint)
- [ ] F11 — Designação e publicação do Encarregado
- [ ] F12 — RIPD, se indicado após classificação de risco e escala
- [~] F13 — Público infantil/adolescente fora do escopo documentado; reavaliar se o produto mudar
- [~] F14 — Links externos apenas como URLs; inventário de operadores, hospedagem, backups e DPAs pendentes para futura infraestrutura

## Artefatos gerados ou revisados

- `.lgpd/data-map.md` — v1 preliminar, revisado em 2026-11-09
- `.lgpd/legal-basis.md` — v1 preliminar, revisado em 2026-11-09
- `.lgpd/dsar/workflow.md` — fluxo e estados técnicos revisados em 2026-11-09
- `.lgpd/retention.md` — política inicial revisada em 2026-11-09
- `.lgpd/gaps.md` — lacunas reclassificadas em 2026-11-09
- `.lgpd/policies/privacy-policy-v1-draft.md` — rascunho; não publicado
- `.lgpd/policies/cookie-policy-v1-draft.md` — rascunho; não publicado
- `.lgpd/security-baseline.md` — baseline técnico; itens de produção ainda pendentes
- `.lgpd/policies/data-minimization-and-history-v1.md` — controle técnico de descrições, URLs e histórico; aprovação pendente
- `.lgpd/incidents/runbook.md` — runbook inicial; registro operacional pendente

## Implementações técnicas confirmadas

- DSAR autenticado para registrar e consultar pedidos do próprio usuário; administradores podem tratar a fila conforme RBAC.
- Canal público MVP em `/privacidade/solicitar`, com referência e consulta administrativa restrita.
- Validação administrativa para associar pedidos públicos a um titular antes de liberar portabilidade.
- Todos os tipos de solicitação estão disponíveis para registro, acompanhamento, mensagens, alteração de status e trilha: acesso, correção, eliminação, anonimização, portabilidade, oposição e revogação de consentimento.
- A execução operacional varia por tipo: portabilidade possui geração e entrega técnica implementadas; os demais direitos possuem intake, tratamento e registro, mas a execução sobre os dados ainda depende de decisão e procedimento institucional.
- Trilha técnica de criação, alterações de status, notas, mensagens, geração e download de entrega.
- Mensagens internas por solicitação para administradores e titular autenticado autorizado.
- Portabilidade técnica: JSON minimizado, hash do pacote, token armazenado por hash, validade de 48 horas, uso único e registro de download.
- Exclusão de senhas, tokens, credenciais e conteúdo de links documentais externos do pacote de portabilidade.
- Interface administrativa para copiar o link seguro e preparar mensagem/e-mail no cliente local.
- Envio automático de e-mail não está implementado: depende de SMTP/provedor e dados institucionais.
- `/privacidade` e `/cookies` públicas são alimentadas pelos rascunhos em `.lgpd/policies/`.
- Banner informativo e gerenciador de preferências implementados; apenas cookie técnico de sessão é usado no MVP.
- Limpeza de sessões expiradas na inicialização e `SESSION_HOURS` configurável.
- Governança administrativa em `/privacidade/configuracoes` para regras de retenção, prazo de resposta DSAR e validade das entregas; nenhuma exclusão automática é executada.
- Diagnóstico administrativo somente leitura em `/privacidade/testes`, com verificações de acesso ao banco, cobertura dos objetos de dados, validade de regras e parâmetros, limites por tipo de solicitação e confirmação de exclusão automática desativada.
- Links documentais externos são tratados como URL HTTPS e provedor identificado; o MemoryDoc não acessa, baixa, sincroniza, hospeda ou analisa o conteúdo.
- G006 recebeu controles técnicos: limites de campos, redação de URLs sensíveis nos logs, redação de notas de eventos, rejeição de URLs com segredos e fingerprint no histórico de links.

## Lacunas ainda abertas

Ver `.lgpd/gaps.md`. Em especial: controlador/CNPJ/endereço, Encarregado, canal institucional, revisão jurídica, aprovação da matriz de retenção, revisão periódica de históricos, classificação e proteção de anexos, registro formal de incidentes, ROPA e futura infraestrutura. O diagnóstico de `/privacidade/testes` valida a configuração técnica, mas não substitui aprovação ou execução institucional.

## Próximas decisões do responsável

1. Definir controlador, entidade, contatos institucionais, Encarregado e canal oficial.
2. Aprovar o procedimento de validação, prazos, critérios de encerramento e retenção de DSAR.
3. Decidir se haverá SMTP/provedor para notificações e entrega de portabilidade.
4. Aprovar matriz de retenção para documentos, anexos, históricos, logs, solicitações, mensagens e exportações.
5. Classificar dados sensíveis e decidir controles de anexos, criptografia, malware scan e backups.
6. Revisar juridicamente os rascunhos antes de qualquer publicação ou uso com dados reais.

## Checkpoint

O MVP continua local, sem hospedagem em nuvem ou operador de infraestrutura externo identificado. A política de privacidade permanece `privacy-policy-v1-draft.md` e a política de cookies permanece `cookie-policy-v1-draft.md`; nenhuma delas deve ser tratada como versão final ou declaração de conformidade.
