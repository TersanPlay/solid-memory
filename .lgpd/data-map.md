# Mapa de Dados — MemoryDoc

**Versão**: v1
**Data**: 2026-11-08
**Owner global**: pendente designação
**Público-alvo**: usuários internos adultos; a aplicação não é destinada nem disponibilizada para crianças ou adolescentes.

## Atividades de tratamento

### A001 — Conta e autenticação
| Campo | Valor |
|---|---|
| Finalidade | Criar conta, autenticar e manter sessão |
| Base legal | Art. 7º, V — execução de contrato/procedimentos solicitados |
| Titulares | Usuários autorizados, administradores e operadores |
| Dados | Nome, e-mail, senha em hash/salt, perfil, estado ativo, timestamps, token de sessão em hash |
| Fonte | Cadastro administrativo ou bootstrap configurado no ambiente |
| Sistemas | `User` e `Session` em SQLite; cookie HttpOnly `folio_session` |
| Compartilhamentos | Nenhum operador de infraestrutura externo identificado no MVP local |
| Transferência internacional | Não identificada nesta execução local |
| Retenção | Definir prazo de conta inativa e expiração/eliminação de sessões |
| Segurança | scrypt, token de sessão aleatório com hash, RBAC, cookie HttpOnly/SameSite, rate limit de login, Helmet |
| Alto risco | Não aparente; confirmar escala e população |
| Owner | Produto/Infraestrutura |

### A002 — Protocolo e tramitação documental
| Campo | Valor |
|---|---|
| Finalidade | Registrar, localizar, acompanhar e comprovar movimentações de documentos administrativos |
| Base legal | Art. 7º, V e/ou II, conforme vínculo contratual e obrigação aplicável |
| Titulares | Usuários adultos do sistema e pessoas mencionadas nos documentos |
| Dados | Assunto, origem/destino, nomes de responsáveis, conteúdo textual, datas, status, protocolos e links externos |
| Fonte | Usuário autenticado e sistemas/serviços documentais externos |
| Sistemas | `Document`, `DocumentType`, `Department`, `ProtocolSequence`, SQLite |
| Compartilhamentos | Usuários internos conforme perfil; o sistema registra links HTTPS informados pelo usuário |
| Serviços externos referenciados | Google Drive, OneDrive, Dropbox ou outro serviço indicado; o MemoryDoc não acessa, baixa, sincroniza ou processa o conteúdo |
| Transferência internacional | Não determinada pelo MemoryDoc; depende do serviço externo escolhido pelo usuário |
| Retenção | Definir por classe documental e obrigação de arquivo; não deixar indefinida |
| Segurança | RBAC, autorização backend, validação Zod, histórico de alterações, HTTPS obrigatório para links |
| Alto risco | Depende do conteúdo; pode ser alto risco se houver dados sensíveis ou grande escala. Não destinado a menores. |
| Owner | Administração documental |

### A003 — Anexos documentais
| Campo | Valor |
|---|---|
| Finalidade | Associar arquivos ao protocolo administrativo |
| Base legal | Art. 7º, V e/ou II, conforme finalidade do documento |
| Titulares | Pessoas mencionadas nos anexos; aplicação não destinada a menores |
| Dados | Nome original, MIME type, tamanho, bytes ou chave de armazenamento, usuário de upload |
| Fonte | Usuário autenticado |
| Sistemas | `Attachment` e diretório `ATTACHMENTS_DIR` |
| Compartilhamentos | Nenhum operador de infraestrutura externo identificado no MVP local |
| Transferência internacional | Não identificada nesta execução local |
| Retenção | Definir por classe documental; remoção deve abranger banco e filesystem |
| Segurança | Limite de 10 MB, normalização de nomes e prevenção de path traversal; faltam controles documentados de criptografia/scan de conteúdo |
| Alto risco | Depende do conteúdo |
| Owner | Administração documental/Infraestrutura |

### A004 — Histórico, atividade e relatórios
| Campo | Valor |
|---|---|
| Finalidade | Rastreabilidade, auditoria operacional e exportação administrativa |
| Base legal | Art. 7º, II, V ou IX; Art. 10 se legítimo interesse for utilizado |
| Titulares | Usuários e pessoas constantes dos documentos |
| Dados | Ações, descrições, detalhes JSON, autor, horários, protocolo e campos exportados |
| Fonte | Eventos gerados pelo sistema |
| Sistemas | `DocumentHistory`, logs HTTP Pino, CSV/JSON/PDF/XLSX gerados sob demanda |
| Compartilhamentos | Administradores e destinatários autorizados de exportações |
| Transferência internacional | Não determinada |
| Retenção | Definir prazo de logs e histórico; aplicar minimização às exportações |
| Segurança | Redação de cookie/autorização nos logs, RBAC para relatórios; não há log imutável documentado |
| Alto risco | Pode ser alto se exportações forem em larga escala |
| Owner | Segurança/Operações |

### A005 — Solicitações de titulares, atendimento e portabilidade
| Campo | Valor |
|---|---|
| Finalidade | Receber, autenticar, acompanhar e responder solicitações de titulares previstas no art. 18, incluindo entrega de portabilidade |
| Base legal | Art. 18; base da atividade originária; obrigação legal/regulatória quando aplicável |
| Titulares | Usuários autenticados e requerentes do canal público, após validação de identidade |
| Dados | Nome, e-mail, tipo de solicitação, descrição, referência, status, prazo, notas de tratamento, mensagens, eventos de atendimento e dados mínimos do pacote de portabilidade |
| Fonte | Usuário autenticado ou formulário público MVP; associação administrativa para pedidos públicos |
| Sistemas | `DataSubjectRequest`, `PrivacyRequestMessage`, `PrivacyRequestDelivery`, trilha técnica e SQLite |
| Compartilhamentos | Usuários autorizados no próprio pedido e administradores; entrega ocorre por link temporário ou cliente de e-mail local |
| Transferência internacional | Não identificada no MVP local; não há SMTP nem provedor externo configurado |
| Retenção | Definir prazos para pedidos, mensagens, eventos e entregas; links de portabilidade expiram em 48 horas e são de uso único |
| Segurança | RBAC e escopo por titular, validação administrativa, JSON minimizado, hash do pacote, token armazenado por hash, expiração, uso único e registro de download |
| Alto risco | Depende do conteúdo do acervo e da escala; confirmar com controlador |
| Owner | Controlador/Encarregado, quando designados; operação administrativa no MVP |

## Observações
- O código não mostra analytics, cookies de rastreamento ou SDKs de terceiros além da infraestrutura e links documentais.
- A presença de dados sensíveis e a escala real precisam ser confirmadas pelo negócio; o schema não permite concluir que esses dados não existirão nos documentos.
