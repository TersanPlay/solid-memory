# Referência da API

Base local: `http://127.0.0.1:3000/api`. O Express ouve em `0.0.0.0`; em desenvolvimento, o frontend usa `/api` pelo proxy do Vite e, em produção, frontend e API têm a mesma origem.

## Convenções

- JSON UTF-8, exceto relatórios.
- Data administrativa: `YYYY-MM-DD`.
- Timestamp: ISO 8601.
- Cookie de sessão: `folio_session`, não acessível por JavaScript.
- Toda resposta contém `X-Request-Id`.
- Listas paginadas aceitam `page` e `pageSize`; o padrão é 20 e o máximo é 100.

Detalhe:

```json
{ "data": { "id": "..." } }
```

Lista:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
}
```

Erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verifique os dados informados.",
    "fields": { "date": "Use a data no formato AAAA-MM-DD." }
  }
}
```

## Autenticação

| Método e rota       | Autorização             | Resultado                                        |
| ------------------- | ----------------------- | ------------------------------------------------ |
| `GET /health`       | Pública                 | Saúde da API, tipo do banco e timestamp.         |
| `POST /auth/login`  | Pública, com rate limit | Cria cookie e retorna usuário público/expiração. |
| `POST /auth/logout` | Pública/idempotente     | Remove sessão quando houver e retorna 204.       |
| `GET /auth/me`      | Sessão                  | Usuário autenticado.                             |

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.invalid",
  "password": "VALOR_DEFINIDO_LOCALMENTE"
}
```

Não envie nem registre senhas reais em exemplos, issues ou logs.

## Direitos dos titulares

As solicitações exigem sessão autenticada. Usuários comuns só podem abrir e consultar as próprias solicitações; administradores podem consultar e tratar todas.

| Método e rota | Autorização | Corpo/resultado |
|---|---|---|
| `POST /privacy-requests` | Sessão | `{ type, description?, subjectUserId? }`; usuário comum sempre fica vinculado a si próprio; retorna 201. |
| `GET /privacy-requests` | Sessão | Próprias solicitações ou todas para `admin`; retorna 200. |
| `PATCH /privacy-requests/:id` | `admin` | `{ status?, responseNote? }`; conclusão registra responsável e data. |
| `POST /privacy-requests/:id/delivery` | `admin` | Solicitação `PORTABILITY`; gera JSON estruturado, hash, link temporário de 48h e uso único. `{ channel: "LINK"|"EMAIL" }`; o canal `EMAIL` prepara o envio, mas depende de SMTP/provedor externo. |
| `GET /privacy-requests/:id/messages` | Titular do pedido ou `admin` | Lista a conversa interna sem expor mensagens de outros pedidos. |
| `POST /privacy-requests/:id/messages` | Titular do pedido ou `admin` | `{ body }`; permite comunicação contextual e registra evento na trilha. |

O canal público MVP não exige sessão, mas aplica rate limit e validação de entrada:

| Método e rota | Autorização | Corpo/resultado |
|---|---|---|
| `POST /public/privacy-requests` | Pública, rate limitada | `{ requesterName, requesterEmail, type, description? }`; retorna uma referência `DSAR-XXXXXXXX` e prazo operacional inicial. |

Solicitações públicas são consultáveis e tratáveis apenas por administradores em `GET /privacy-requests` e `PATCH /privacy-requests/:id`. Um pedido público precisa ser associado a um usuário e ter a identidade validada antes da geração de portabilidade. Cada criação, alteração de status, nota, geração e download gera evento de trilha técnica. O canal não acessa o conteúdo de URLs documentais.

O download de uma portabilidade usa `GET /privacy-deliveries/:id/download?token=...`, sem sessão, com token aleatório armazenado somente por hash, validade de 48 horas e consumo único. O pacote é JSON estruturado e exclui senhas, tokens, credenciais e conteúdo de links externos. O MemoryDoc local não possui SMTP configurado: a interface oferece cópia do link e abertura do cliente de e-mail para envio manual.

## Transparência pública

| Rota | Conteúdo |
|---|---|
| `/lgpd` | Guia técnico com os documentos versionados de `.lgpd/`. |
| `/privacidade` | Política de Privacidade v1 em rascunho, carregada de `.lgpd/policies/privacy-policy-v1-draft.md`. |
| `/cookies` | Política de Cookies v1 em rascunho, carregada de `.lgpd/policies/cookie-policy-v1-draft.md`. |

As páginas são informativas e não substituem a definição do controlador, do Encarregado ou a revisão jurídica.

O frontend também exibe um banner de cookies e um gerenciador de preferências. No MVP, apenas o cookie técnico de sessão existe; analytics e marketing permanecem indisponíveis e nenhum cookie opcional é instalado. A escolha do usuário é armazenada localmente no navegador.

Tipos aceitos: `ACCESS`, `CORRECTION`, `ANONYMIZATION`, `DELETION`, `PORTABILITY`, `OPPOSITION` e `CONSENT_REVOCATION`. O prazo inicial registrado é de 15 dias corridos como referência operacional; o canal institucional e a verificação adicional de identidade ainda dependem de definição do controlador.

## Usuários

Todas as rotas abaixo exigem `admin`.

| Método e rota              | Corpo/observação                                           |
| -------------------------- | ---------------------------------------------------------- |
| `GET /users`               | Lista usuários ativos e inativos; retorna 200.                          |
| `GET /users/:id/profile`   | Perfil público, métricas, histórico recente e documentos relacionados; o próprio usuário ou `admin`; retorna 200. |
| `POST /users`              | `name`, `email`, `password` com 10+ caracteres e `role`; retorna 201.   |
| `PATCH /users/:id`         | Um ou mais: `name`, `email`, `role`, `active`; retorna 200.             |
| `POST /users/:id/password` | `{ "password": "..." }`; encerra as sessões desse usuário e retorna 204. |

Perfis aceitos: `admin`, `OPERATOR`, `VIEWER`. A API rejeita a desativação ou o rebaixamento do último administrador ativo com `LAST_ADMIN`.

Usuários são ordenados por situação ativa e, em seguida, por nome. Nome aceita de 2 a 120 caracteres; senha administrativa aceita de 10 a 200 caracteres. E-mails são normalizados para minúsculas antes da persistência.

## Tipos documentais

| Método e rota               | Autorização | Corpo                                     |
| --------------------------- | ----------- | ----------------------------------------- |
| `GET /document-types`       | Sessão      | Sem corpo; inclui contagem de documentos. |
| `POST /document-types`      | `admin`     | `name`, `prefix`, `digits`.               |
| `PATCH /document-types/:id` | `admin`     | Campos parciais e/ou `active`.            |

Exemplo:

```json
{
  "name": "Ata administrativa",
  "prefix": "ATA",
  "digits": 3
}
```

Prefixos são normalizados para maiúsculas e devem ser únicos.

Nome aceita de 2 a 100 caracteres; prefixo, de 1 a 8 caracteres alfanuméricos ou hífen; `digits`, de 3 a 6. O formato é fixo em `PREFIXO-NÚMERO/ANO`, por exemplo `MEMO-001/2026`; não existe configuração de separador.

## Departamentos

| Método e rota             | Autorização | Corpo/resultado                                                     |
| ------------------------- | ----------- | ------------------------------------------------------------------- |
| `GET /departments`        | Sessão      | Inclui `_count.originDocuments` e `_count.destinationDocuments`.    |
| `POST /departments`       | `admin`     | `name`, `code`.                                                     |
| `PATCH /departments/:id`  | `admin`     | `name`, `code` e/ou `active`.                                       |
| `DELETE /departments/:id` | `admin`     | Sem corpo; retorna `204` quando o departamento não possui vínculos. |

Códigos são normalizados para maiúsculas e devem ser únicos.

Nome aceita de 2 a 140 caracteres. Código aceita de 2 a 30 caracteres alfanuméricos ou hífen.

A exclusão é física e aceita departamentos ativos ou inativos. Se o cadastro for usado como origem ou destino de qualquer documento, a API retorna `409` com o código `DEPARTMENT_IN_USE`; nesse caso, desative o departamento para impedir novos usos. Um ID inexistente retorna `404 NOT_FOUND`.

## Protocolo e documentos

### Prévia

```http
GET /api/protocols/next?typeId=<ID>&date=2026-07-22
```

```json
{
  "data": {
    "protocol": "MEMO-015/2026",
    "sequence": 15,
    "year": 2026,
    "reserved": false
  }
}
```

### Listagem

`GET /documents` aceita:

| Parâmetro                                       | Significado                                                  |
| ----------------------------------------------- | ------------------------------------------------------------ |
| `q`                                             | Protocolo, assunto, origem, destino ou responsável.          |
| `typeId`                                        | Tipo documental.                                             |
| `status`                                        | Um dos status persistidos.                                   |
| `year`                                          | Ano entre 2000 e 2100.                                       |
| `month`                                         | Mês de 1 a 12; sem `year`, usa o ano corrente do servidor.   |
| `dateFrom`, `dateTo`                            | Período inclusivo; a data final não pode preceder a inicial. |
| `originDepartmentId`, `destinationDepartmentId` | Percurso interno.                                            |
| `page`, `pageSize`                              | Paginação.                                                   |

Status persistidos: `REGISTRADO`, `ENVIADO`, `RECEBIDO`, `ARQUIVADO`, `CANCELADO`. O status `REGISTRADO` é legado e não pode ser usado em novas criações.

### Criação

`POST /documents` exige `admin` ou `OPERATOR`:

```json
{
  "typeId": "<ID_DO_TIPO>",
  "date": "2026-07-22",
  "originDepartmentId": "<ID_DA_ORIGEM>",
  "destinationDepartmentId": "<ID_DO_DESTINO>",
  "destinationText": null,
  "subject": "Solicitação de manutenção de equipamento",
  "responsibleUserId": "<ID_DO_RESPONSAVEL>",
  "status": "ENVIADO"
}
```

Para destino externo, envie `destinationDepartmentId: null` e `destinationText`. Informar ambos ou nenhum é inválido.

O assunto aceita de 3 a 300 caracteres e o destino externo de 2 a 160. O status inicial deve ser `ENVIADO`, `RECEBIDO` ou `ARQUIVADO`; `REGISTRADO` e `CANCELADO` são rejeitados na criação.

O `admin` deve informar o responsável. Para `OPERATOR`, o servidor usa o próprio usuário, mesmo que outro ID seja enviado.

### Detalhe e mutações

| Método e rota                 | Regra                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| `GET /documents/:id`          | Qualquer sessão.                                                      |
| `PATCH /documents/:id`        | `admin` ou `OPERATOR` proprietário; `subject`; somente `admin` pode alterar `responsibleUserId`. |
| `PATCH /documents/:id/status` | Status não cancelado. `OPERATOR` somente em documento próprio.        |
| `POST /documents/:id/cancel`  | Somente `admin`; cancelamento terminal.                               |
| `GET /documents/:id/history`  | Histórico mais recente primeiro.                                      |

Documentos cancelados retornam `CANCELLED_TERMINAL` em tentativas de alteração. Use o endpoint específico para cancelar; `PATCH status` rejeita `CANCELADO`.

## Links documentais

| Método e rota | Regra |
|---|---|
| `POST /documents/:id/links` | `{ "url": "https://..." }`; `admin` ou operador proprietário. |
| `PATCH /links/:id` | `{ "url": "https://..." }`; altera somente a URL. |
| `DELETE /links/:id` | Retorna `204`; `admin` ou operador proprietário. |

O campo de link é opcional. A API aceita somente URLs HTTPS, armazena a URL e identifica o provedor automaticamente. O sistema não acessa, baixa, sincroniza, hospeda ou analisa o conteúdo desses links. Anexos são um recurso separado e seguem as rotas de upload/download documentadas no código.

## Painel e atividades

| Método e rota    | Parâmetros                | Resultado                                          |
| ---------------- | ------------------------- | -------------------------------------------------- |
| `GET /dashboard` | `year`, `month` opcionais | Totais, agrupamentos e cinco documentos recentes.  |
| `GET /activity`  | `page`, `pageSize`        | Histórico global paginado com documento e usuário. |

## Relatórios

`GET /reports/documents?format=csv|json|pdf|xlsx` exige `admin` e aceita os filtros documentais de conteúdo. `page` e `pageSize` não limitam a exportação: todos os registros correspondentes são retornados. A resposta é um download, não um envelope JSON.

O CSV usa `;`, BOM UTF-8 e escapa aspas/fórmulas. Os relatórios incluem registros cancelados quando o filtro não os exclui.

PDF e Excel incluem data, usuário gerador, período, tipo e número de protocolos. O PDF usa layout institucional; o Excel é um `.xlsx` formatado com filtros e cabeçalho congelado.

## Códigos de resposta relevantes

| HTTP | Exemplos de código                                                                                     |
| ---: | ------------------------------------------------------------------------------------------------------ |
|  400 | `VALIDATION_ERROR`, `INACTIVE_REFERENCE`, `RESPONSIBLE_REQUIRED`, `USE_CANCEL_ENDPOINT`, `NO_CHANGES`, `FILE_REQUIRED`, `USER_TARGET_REQUIRED` |
|  401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS`                                                                  |
|  403 | `FORBIDDEN`, `ORIGIN_NOT_ALLOWED`                                                                      |
|  404 | `NOT_FOUND`                                                                                            |
|  409 | `CONFLICT`, `LAST_ADMIN`, `SQLITE_BUSY`, `ALREADY_CANCELLED`, `CANCELLED_TERMINAL`, `STATUS_UNCHANGED` |
|  413 | `LIMIT_FILE_SIZE`                                                                                      |
|  415 | `UNSUPPORTED_MEDIA_TYPE`                                                                               |
|  429 | `RATE_LIMITED`                                                                                         |
|  500 | `INTERNAL_ERROR`, `ATTACHMENT_CONTENT_MISSING`                                                         |
