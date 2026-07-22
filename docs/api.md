# Referência da API

Base local: `http://127.0.0.1:3002/api`. Em desenvolvimento, o frontend usa `/api` pelo proxy do Vite; em produção, frontend e API têm a mesma origem.

## Convenções

- JSON UTF-8, exceto download de anexos e relatórios.
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

## Usuários

Todas as rotas abaixo exigem `ADMIN`.

| Método e rota              | Corpo/observação                                           |
| -------------------------- | ---------------------------------------------------------- |
| `GET /users`               | Lista usuários ativos e inativos; retorna 200.                          |
| `POST /users`              | `name`, `email`, `password` com 10+ caracteres e `role`; retorna 201.   |
| `PATCH /users/:id`         | Um ou mais: `name`, `email`, `role`, `active`; retorna 200.             |
| `POST /users/:id/password` | `{ "password": "..." }`; encerra as sessões desse usuário e retorna 204. |

Perfis aceitos: `ADMIN`, `OPERATOR`, `VIEWER`. A API rejeita a desativação ou o rebaixamento do último administrador ativo com `LAST_ADMIN`.

Usuários são ordenados por situação ativa e, em seguida, por nome. Nome aceita de 2 a 120 caracteres; senha administrativa aceita de 10 a 200 caracteres. E-mails são normalizados para minúsculas antes da persistência.

## Tipos documentais

| Método e rota               | Autorização | Corpo                                     |
| --------------------------- | ----------- | ----------------------------------------- |
| `GET /document-types`       | Sessão      | Sem corpo; inclui contagem de documentos. |
| `POST /document-types`      | `ADMIN`     | `name`, `prefix`, `separator`, `digits`.  |
| `PATCH /document-types/:id` | `ADMIN`     | Campos parciais e/ou `active`.            |

Exemplo:

```json
{
  "name": "Ata administrativa",
  "prefix": "ATA",
  "separator": "/",
  "digits": 3
}
```

Prefixos são normalizados para maiúsculas e devem ser únicos.

Nome aceita de 2 a 100 caracteres; prefixo, de 1 a 8 caracteres alfanuméricos ou hífen; `digits`, de 3 a 6; `separator` aceita `/` ou `-`.

## Departamentos

| Método e rota            | Autorização | Corpo                         |
| ------------------------ | ----------- | ----------------------------- |
| `GET /departments`       | Sessão      | Sem corpo.                    |
| `POST /departments`      | `ADMIN`     | `name`, `code`.               |
| `PATCH /departments/:id` | `ADMIN`     | `name`, `code` e/ou `active`. |

Códigos são normalizados para maiúsculas e devem ser únicos.

Nome aceita de 2 a 140 caracteres. Código aceita de 2 a 30 caracteres alfanuméricos ou hífen.

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

Status aceitos: `REGISTRADO`, `EM_ELABORACAO`, `ENVIADO`, `RECEBIDO`, `ARQUIVADO`, `CANCELADO`.

### Criação

`POST /documents` exige `ADMIN` ou `OPERATOR`:

```json
{
  "typeId": "<ID_DO_TIPO>",
  "date": "2026-07-22",
  "originDepartmentId": "<ID_DA_ORIGEM>",
  "destinationDepartmentId": "<ID_DO_DESTINO>",
  "destinationText": null,
  "subject": "Solicitação de manutenção de equipamento",
  "responsibleUserId": "<ID_DO_RESPONSAVEL>",
  "status": "REGISTRADO",
  "notes": "Informação complementar sem dado sensível."
}
```

Para destino externo, envie `destinationDepartmentId: null` e `destinationText`. Informar ambos ou nenhum é inválido.

O assunto aceita de 3 a 300 caracteres, o destino externo de 2 a 160 e as observações até 4.000 caracteres. O status inicial pode ser qualquer status aceito, exceto `CANCELADO`.

O `ADMIN` deve informar o responsável. Para `OPERATOR`, o servidor usa o próprio usuário, mesmo que outro ID seja enviado.

### Detalhe e mutações

| Método e rota                 | Regra                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| `GET /documents/:id`          | Qualquer sessão.                                                      |
| `PATCH /documents/:id`        | `ADMIN` ou `OPERATOR` proprietário; `subject`, `notes`; somente `ADMIN` pode alterar `responsibleUserId`. |
| `PATCH /documents/:id/status` | Status não cancelado. `OPERATOR` somente em documento próprio.        |
| `POST /documents/:id/cancel`  | Somente `ADMIN`; cancelamento terminal.                               |
| `GET /documents/:id/history`  | Histórico mais recente primeiro.                                      |

Documentos cancelados retornam `CANCELLED_TERMINAL` em tentativas de alteração. Use o endpoint específico para cancelar; `PATCH status` rejeita `CANCELADO`.

## Anexos

| Método e rota                     | Regra                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /documents/:id/attachments` | `multipart/form-data`, campo `file`; `ADMIN` ou operador proprietário.               |
| `GET /attachments/:id`            | Qualquer sessão; resposta binária com `Content-Disposition: attachment`.             |
| `DELETE /attachments/:id`         | Retorna `204`; `ADMIN` ou operador proprietário, somente em documento não cancelado. |

Formatos: PDF, DOCX, XLSX, JPEG e PNG. Limite: 10 MB. A API compara extensão e assinatura detectada. O conteúdo binário é gravado em `ATTACHMENTS_DIR` e nunca é incluído no JSON de documento; listagens recebem somente ID, nome, MIME, tamanho e data.

A chave física segue `AAAA/MM/<documentId>/<storageId>/<nome-original-seguro>`. O nome original permanece nos metadados e é usado no download. O diretório intermediário aleatório evita colisões entre arquivos de mesmo nome.

A remoção exclui fisicamente o arquivo, atualiza o documento e registra `ATTACHMENT_REMOVE`. O histórico preserva em `detailsJson` o ID, nome, MIME, tamanho, usuário e data do upload; o usuário e a data da remoção vêm do próprio registro de histórico. Anexos de documentos cancelados não podem ser removidos.

## Painel e atividades

| Método e rota    | Parâmetros                | Resultado                                          |
| ---------------- | ------------------------- | -------------------------------------------------- |
| `GET /dashboard` | `year`, `month` opcionais | Totais, agrupamentos e cinco documentos recentes.  |
| `GET /activity`  | `page`, `pageSize`        | Histórico global paginado com documento e usuário. |

## Relatórios

`GET /reports/documents?format=csv|json` exige `ADMIN` e aceita os filtros documentais de conteúdo. `page` e `pageSize` não limitam a exportação: todos os registros correspondentes são retornados. A resposta é um download, não um envelope JSON.

O CSV usa `;`, BOM UTF-8 e escapa aspas/fórmulas. Os relatórios incluem registros cancelados quando o filtro não os exclui.

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
