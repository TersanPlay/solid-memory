# Direitos dos titulares — fluxo mínimo

1. **[IMPLEMENTADO — MVP]** Receber solicitação no canal público em `/privacidade/solicitar`, gerando referência e prazo operacional inicial de 15 dias, ou pela área autenticada `/privacidade/solicitacoes`.
2. **[PARCIAL]** Confirmar identidade sem coletar dados excessivos. Usuários autenticados têm escopo próprio; pedidos públicos exigem associação administrativa, mas o procedimento institucional e o canal oficial ainda não foram aprovados.
3. **[PARCIAL]** Classificar direito do art. 18 e localizar dados em `User`, `Session`, `Document`, `DocumentHistory`, `Attachment` e exportações. O registro e o fluxo existem, mas a matriz completa de localização e execução por categoria ainda depende de validação do controlador.
4. **[IMPLEMENTADO — TÉCNICO]** Registrar pedido, responsável, escopo, decisões e resposta. A aplicação mantém trilha técnica de eventos para solicitações públicas e autenticadas, com consulta restrita por escopo e perfil.
5. **[PARCIAL]** Responder nos prazos legais aplicáveis: informação simplificada imediatamente e resposta completa em até 15 dias (art. 19, II); avaliar regime ATPP quando aplicável. O prazo é exibido/registrado, mas notificações e procedimento institucional ainda não estão automatizados.
6. **[PARCIAL — REGISTRO IMPLEMENTADO]** Todos os tipos de solicitação do produto — acesso, correção, eliminação, anonimização, portabilidade, oposição e revogação de consentimento — podem ser registrados, acompanhados, tratados por status, comunicados por mensagens e auditados na trilha. A execução efetiva varia por direito: portabilidade possui entrega técnica implementada; correção, eliminação, anonimização, oposição e revogação ainda exigem decisão e execução institucional controlada.
7. **[IMPLEMENTADO — PORTABILIDADE TÉCNICA]** Gerar JSON estruturado minimizado, calcular hash do pacote, disponibilizar link temporário de 48 horas com uso único e registrar geração e download na trilha. Senhas, tokens, credenciais e conteúdo de links externos ficam excluídos.
8. **[IMPLEMENTADO — CONTROLE DE ACESSO]** Para solicitações públicas, associar o pedido a um usuário somente após validação administrativa da identidade. Sem essa associação, não é permitido gerar o pacote de portabilidade.
9. **[IMPLEMENTADO — COMUNICAÇÃO INTERNA]** Registrar comunicação contextual na conversa interna da solicitação; mensagens ficam limitadas ao titular autorizado e aos administradores. O envio automático por e-mail ainda não está implementado.

## Estado técnico atual

**Implementado:** endpoint autenticado, canal público MVP, interface administrativa, solicitação pelo próprio usuário autenticado, todos os tipos de solicitação previstos no produto, controle de escopo, trilha técnica, mensagens internas, associação administrativa de pedidos públicos e entrega de portabilidade com JSON minimizado, hash, validade de 48 horas, uso único e registro de download.

**Parcial:** validação de identidade pública, execução efetiva de correção/eliminação/anonimização/oposição/revogação, prazos operacionais, classificação completa dos dados e exportações administrativas.

**Pendente:** definição institucional do canal oficial, controlador e Encarregado, procedimento aprovado de verificação, notificações automáticas, SMTP/provedor de e-mail, retenção dos registros de DSAR, operação de eliminação/anonimização e revisão jurídica. O canal público é um MVP e não deve ser tratado como comprovação suficiente de identidade.
