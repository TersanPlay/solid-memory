# Bases Legais por Atividade de Tratamento

**Última atualização**: 2026-11-08

## A001 — Conta e autenticação
- **Finalidade**: autenticar usuários autorizados e manter a sessão (Art. 6º, I).
- **Dados**: nome, e-mail, credencial derivada, perfil, sessão e timestamps.
- **Sensíveis?** Não identificados.
- **Base legal**: Art. 7º, V — execução de contrato ou procedimentos preliminares solicitados pelo titular.
- **Justificativa**: a conta é necessária para prestar o serviço administrativo e controlar acesso.
- **Retenção**: definir exclusão/anonimização após desligamento e expiração de sessões.
- **Revogação**: não aplicável enquanto a conta/contrato estiver ativo; pedidos devem ser tratados conforme Art. 18.

## A002 — Protocolo e tramitação documental
- **Finalidade**: registrar e acompanhar documentos administrativos.
- **Dados**: metadados documentais, nomes, responsáveis, assunto, destino e links.
- **Sensíveis?** Incerto; conteúdo de documentos pode conter dados do Art. 5º, II.
- **Base legal**: Art. 7º, V; avaliar Art. 7º, II quando houver obrigação legal/regulatória específica. Para dados sensíveis, aplicar Art. 11, II somente após classificar a finalidade.
- **Justificativa**: a operação é necessária para o fluxo documental, mas a base deve ser confirmada por finalidade e tipo de organização.
- **Retenção**: matriz por classe documental e obrigação aplicável.
- **Revogação**: depende da base legal; não usar consentimento genérico para o acervo.

## A003 — Anexos documentais
- **Finalidade**: preservar evidências e documentos associados ao protocolo.
- **Dados**: arquivos potencialmente contendo dados pessoais e metadados de upload.
- **Sensíveis?** Incerto; classificação deve ocorrer pelo conteúdo e contexto.
- **Base legal**: Art. 7º, V ou II; se sensível, reavaliar sob Art. 11.
- **Justificativa**: armazenamento é acessório à tramitação documental.
- **Retenção**: mesma matriz do documento principal, com eliminação coordenada.

## Observação — links documentais externos

O campo de link documental é opcional. O MemoryDoc armazena a URL e o provedor identificado, mas não acessa, baixa, sincroniza, hospeda ou analisa o conteúdo do serviço externo. Google Drive, OneDrive, Dropbox e similares não devem ser classificados automaticamente como operadores do MemoryDoc apenas por serem referenciados.

## A004 — Histórico, atividade e relatórios
- **Finalidade**: segurança, responsabilização, auditoria e prestação de contas.
- **Dados**: autoria, timestamps, ações, protocolo e recortes documentais.
- **Sensíveis?** Não por desenho, mas podem aparecer em descrições e exportações.
- **Base legal**: Art. 7º, II ou V; Art. 7º, IX somente com teste de legítimo interesse e salvaguardas do Art. 10.
- **Justificativa**: rastreabilidade é necessária para segurança e governança, limitada ao mínimo necessário.
- **Retenção**: definir prazos separados para logs técnicos, histórico e relatórios exportados.

## A005 — Solicitações de titulares, atendimento e portabilidade
- **Finalidade**: receber, verificar, tramitar e responder solicitações previstas no art. 18, incluindo a disponibilização de dados em formato estruturado quando a portabilidade for cabível.
- **Dados**: identificação informada pelo requerente, tipo e descrição do pedido, referência, status, prazo, mensagens, eventos de atendimento e pacote mínimo de dados da portabilidade.
- **Base legal**: cumprimento dos direitos do titular previstos nos arts. 18 e 19, combinado com a base legal da atividade de tratamento originária. Não usar consentimento genérico como fundamento automático.
- **Justificativa**: o tratamento é necessário para atender pedidos, registrar decisões e preservar evidências de responsabilização, sempre com minimização e validação de identidade.
- **Portabilidade implementada**: JSON estruturado minimizado, hash do pacote, link com validade de 48 horas, uso único e registro de geração/download. Senhas, tokens, credenciais e conteúdo de links documentais externos são excluídos.
- **Limitações**: pedidos públicos precisam ser associados a um usuário após validação administrativa; envio automático por e-mail não existe no MVP; o link pode ser copiado ou aberto no cliente de e-mail local.
- **Retenção**: definir prazo institucional para a solicitação, mensagens, trilha técnica e registros de entrega; a validade de 48 horas do link não substitui a política de retenção.

## Nota sobre prazos legais

A LGPD não fornece um limite numérico padrão de retenção por tipo de dado ou direito. Os arts. 15 e 16 estabelecem critérios de término e hipóteses de conservação. Qualquer prazo numérico deve ser fundamentado na finalidade, em obrigação legal/regulatória ou em norma setorial aplicável; não deve ser preenchido automaticamente como se fosse um “máximo permitido pela LGPD”.
