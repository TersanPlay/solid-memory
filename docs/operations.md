# Operação, backup e diagnóstico

## Modelo operacional

O MemoryDoc opera com uma única instância Node/Express, um arquivo SQLite local e uma pasta local de anexos. Não há Docker, fila, storage externo ou escala horizontal.

Em produção:

1. use armazenamento persistente para o SQLite e para `ATTACHMENTS_DIR`; no padrão, ambos ficam em `data`;
2. execute `npm run build` antes de iniciar;
3. execute `npm run db:deploy` antes de cada versão;
4. publique o processo por HTTPS, pois o cookie de produção usa `Secure`;
5. mantenha somente uma instância gravando em cada arquivo SQLite.

O processo Node escuta em `0.0.0.0` na porta definida em `PORT`. Em uma VM tradicional, restrinja a exposição com firewall e proxy reverso HTTPS. No Railway, o edge proxy termina TLS e encaminha o tráfego para essa porta.

Comandos na raiz:

```powershell
npm ci
npm run db:generate
npm run build
npm run db:deploy
npm run attachments:migrate
npm run db:seed
$env:NODE_ENV='production'
npm start
```

Resultado esperado: a porta definida em `PORT` entrega `/api/health`, `/api/*` e o frontend de `dist/`.

As páginas do frontend possuem URLs próprias. O Express usa fallback da SPA para requisições `GET` fora de `/api`, portanto endereços como `/documentos` e `/documentos/<ID>` podem ser abertos ou atualizados diretamente. O proxy reverso deve encaminhar esses caminhos ao processo Node; não configure uma regra que procure um arquivo físico com o mesmo nome da rota.

## Saúde e logs

```http
GET /api/health
```

Retorna 200 somente depois de executar `SELECT 1` no SQLite. Monitore status HTTP, latência e disponibilidade do volume.

Pino escreve logs JSON em stdout com método, URL, status, duração e request ID. Cookies e autorização são ocultados. Encaminhe stdout/stderr ao gerenciador de serviço; não grave segredos em mensagens manuais.

O Express mantém `trust proxy=false`. No Railway, detectado por `RAILWAY_ENVIRONMENT_ID`, o rate limiter usa o `X-Real-IP` validado que o edge proxy fornece; localmente e em outros ambientes usa `request.ip`. Não habilite confiança irrestrita em cabeçalhos encaminhados.

Para o procedimento completo de volume, variáveis, build, healthcheck e primeiro
deploy, consulte [Deploy no Railway](railway.md).

Indicadores operacionais úteis:

- respostas 5xx;
- `SQLITE_BUSY` recorrente;
- 401/429 anormais no login;
- espaço livre no volume;
- tamanho do banco, da pasta de anexos e tempo do backup;
- falha de migration no deploy.

## Gerenciamento de usuários pelo CLI

O utilitário administrativo acessa diretamente o arquivo indicado por `DATABASE_URL`; a aplicação web pode estar parada. Migrations e seed devem ter sido executados antes do primeiro uso. Como esse acesso permite conceder perfil `admin`, execute o comando somente na raiz do projeto e por operadores autorizados a acessar o servidor e o arquivo SQLite.

Ajuda e listagem:

```powershell
npm run users -- help
npm run users -- list
```

Resultado esperado da listagem: uma tabela `ID`, `NOME`, `E-MAIL`, `PERFIL` e `ATIVO`, com usuários ativos primeiro e nomes em ordem crescente. Hash, salt, senha, token e sessão nunca são exibidos.

Criação interativa:

```powershell
npm run users -- create --name "Maria Souza" --email "maria@example.invalid" --role OPERATOR
```

A senha e a confirmação são solicitadas em prompt mascarado. Nome e e-mail ausentes também são perguntados quando o terminal é interativo; o perfil padrão é `VIEWER`. A senha deve ter no mínimo 10 caracteres.

Para automação, acrescente `--password-stdin` e forneça exatamente uma linha pela entrada padrão a partir de uma fonte de segredos protegida. Não escreva a senha literalmente no comando, em arquivo versionado ou no histórico do shell. A opção `--password` é rejeitada.

Edição por e-mail ou ID:

```powershell
npm run users -- edit maria@example.invalid --name "Maria da Silva"
npm run users -- edit <ID> --role VIEWER
npm run users -- edit <ID> --inactive
npm run users -- edit <ID> --active
npm run users -- edit <ID> --reset-password
```

Sem opções de alteração, um terminal interativo pergunta nome, e-mail, perfil e situação, preservando os valores atuais como padrão. `--active` e `--inactive` são mutuamente exclusivos. `--reset-password` solicita uma nova senha e encerra todas as sessões do usuário; `--password-stdin` só pode acompanhá-lo na edição. Desativar um usuário também encerra suas sessões.

O CLI não exclui usuários e impede desativar ou rebaixar o último administrador ativo. Retorna código `0` em sucesso e `1` para validação, conflito, usuário inexistente ou falha operacional esperada.

## Backup seguro

Como o banco usa WAL, a rotina mais simples e segura é parar o processo antes da cópia.

1. Interrompa somente a instância do MemoryDoc pelo gerenciador de serviço.
2. Confirme que não há processo escrevendo no banco.
3. Crie uma pasta de backup fora da árvore publicada.
4. Copie todo o conjunto SQLite e a pasta de anexos da mesma parada.

Exemplo PowerShell, executado na raiz com a aplicação parada:

```powershell
$backupDir = Join-Path 'D:\Backups\MemoryDoc' (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $backupDir | Out-Null
Copy-Item -LiteralPath '.\data\folio.db' -Destination $backupDir
if (Test-Path -LiteralPath '.\data\folio.db-wal') { Copy-Item -LiteralPath '.\data\folio.db-wal' -Destination $backupDir }
if (Test-Path -LiteralPath '.\data\folio.db-shm') { Copy-Item -LiteralPath '.\data\folio.db-shm' -Destination $backupDir }
if (Test-Path -LiteralPath '.\data\attachments') { Copy-Item -LiteralPath '.\data\attachments' -Destination $backupDir -Recurse }
```

Resultado esperado: o diretório datado contém `folio.db`, os arquivos WAL/SHM quando existentes e a pasta `attachments`. Restrinja permissões do backup: ele contém usuários, hashes, documentos e anexos.

Se `ATTACHMENTS_DIR` for absoluto ou estiver fora de `data`, substitua o caminho do último `Copy-Item` pelo valor efetivo da variável. Banco e anexos devem pertencer ao mesmo instante lógico.

Valide periodicamente a restauração em um ambiente isolado; cópia sem teste não comprova recuperabilidade.

## Restauração

1. Pare a aplicação.
2. Preserve o banco e `ATTACHMENTS_DIR` atuais em uma pasta de contingência.
3. Copie o conjunto SQLite e a pasta de anexos do mesmo backup para seus caminhos configurados.
4. Execute `npm run db:deploy` para aplicar migrations posteriores ao backup.
5. Inicie a aplicação e verifique `/api/health`, login, contagens e download de um anexo conhecido.

Não misture `folio.db`, WAL/SHM e anexos de momentos diferentes.

## Reset somente em desenvolvimento

Este procedimento apaga documentos, usuários, sequências e anexos. Confirme que o caminho é o banco local e pare a aplicação antes.

Na raiz:

```powershell
Get-Item -LiteralPath '.\data\folio.db' | Select-Object FullName,Length,LastWriteTime
Remove-Item -LiteralPath '.\data\folio.db' -Force
Remove-Item -LiteralPath '.\data\folio.db-wal' -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath '.\data\folio.db-shm' -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath '.\data\attachments' -Recurse -Force -ErrorAction SilentlyContinue
npm run db:migrate
npm run db:seed
```

Resultado esperado: uma base vazia é recriada com catálogos e administrador. Nunca execute esse fluxo em produção.

## Diagnóstico

### `EADDRINUSE`

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,5173 | Select-Object LocalPort,OwningProcess
```

Identifique o processo antes de encerrá-lo. Outra aplicação na porta 3000 também faz o proxy do Vite responder com conteúdo incorreto; use `PORT` e `API_PORT` iguais em uma porta livre.

### `SQLITE_BUSY`

- confirme instância única;
- procure Prisma Studio ou utilitário externo com transação aberta;
- evite copiar o banco enquanto o processo escreve;
- se persistente, pare o serviço de forma graciosa e inspecione logs/request IDs.

### `no such table` ou migration pendente

```powershell
npm run db:deploy
```

Em desenvolvimento, use `npm run db:migrate`. Confirme que `DATABASE_URL` aponta para o arquivo esperado.

### Cliente Prisma incompatível

```powershell
npm run db:generate
npm run verify
```

Gere novamente após qualquer alteração do schema ou atualização do Prisma.

### Login funciona em desenvolvimento, mas não em produção

- confirme HTTPS;
- confirme que frontend e API estão na mesma origem pública;
- verifique `NODE_ENV=production`, host/headers do proxy reverso e o cookie `Secure`;
- não desative a proteção de origem ou `HttpOnly` para contornar configuração de proxy.

### Upload rejeitado

- limite de 10 MB;
- extensões permitidas: `.pdf`, `.docx`, `.xlsx`, `.jpg`, `.jpeg`, `.png`;
- o conteúdo precisa corresponder à extensão; apenas renomear um arquivo é rejeitado.

### Atualizar uma página do frontend retorna 404

- confirme que `npm run build` gerou `dist/index.html`;
- confirme `NODE_ENV=production` no processo que executa `npm start`;
- encaminhe caminhos como `/inicio`, `/documentos` e `/usuarios` ao Express;
- não redirecione `/api/*` para o fallback do frontend;
- valide diretamente uma rota profunda, por exemplo `Invoke-WebRequest http://127.0.0.1:3000/documentos/ID_DE_TESTE`.

## Atualização de versão

1. Faça backup testado.
2. Instale o lockfile com `npm ci`.
3. Gere o cliente e execute `npm run verify`.
4. Pare a instância atual.
5. Execute `npm run db:deploy`.
6. Ainda com a aplicação parada, execute `npm run attachments:migrate`.
7. Inicie a nova versão.
8. Verifique saúde, autenticação, criação, histórico e download de anexos novos e antigos.
9. Mantenha caminho de rollback do código; restaure banco e anexos juntos quando a migration não for retrocompatível, sempre usando backup validado.

## Limitações conhecidas

- única instância de escrita;
- anexos aumentam diretamente o tamanho de `ATTACHMENTS_DIR` e do backup;
- sem recuperação de senha por e-mail;
- sem exclusão física de documentos, usuários ou tipos; departamentos somente podem ser excluídos quando não possuem vínculos, e anexos podem ser removidos com auditoria;
- sem storage externo ou replicação;
- sem workflow rígido entre status não cancelados;
