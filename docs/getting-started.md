# Instalação e início rápido

Este guia prepara uma cópia nova do SoftProtocolo em Windows/PowerShell. Todos os comandos, exceto o clone e o primeiro `cd`, são executados na raiz do repositório — a pasta que contém `package.json`.

## Pré-requisitos

- Node.js `>=22.13.0 <23` (`node --version`).
- npm (`npm --version`).
- Git para clonar o projeto.
- Windows PowerShell. Em Linux/macOS, substitua `Copy-Item` por `cp`.

O projeto usa um módulo nativo para SQLite. Em instalações comuns do Node 22 o npm baixa um binário pronto; consulte [Problemas comuns](#problemas-comuns) se houver erro de compilação.

## Comandos na ordem correta

| Ordem | Diretório | Comando | Finalidade | Resultado esperado |
|---:|---|---|---|---|
| 1 | Pasta onde o projeto será criado | `git clone https://github.com/TersanPlay/solid-memory.git SoftProtocolo` | Clonar o repositório oficial. | A pasta `SoftProtocolo` é criada. |
| 2 | Pasta pai | `cd SoftProtocolo` | Entrar na raiz do projeto. | O prompt passa a apontar para `SoftProtocolo`. |
| 3 | Raiz | `node --version` | Confirmar a versão suportada. | Uma versão `v22.13.0` ou superior, ainda na série 22. |
| 4 | Raiz | `npm ci` | Instalar exatamente as versões do `package-lock.json`. | Dependências instaladas e auditoria sem erro de instalação. |
| 5 | Raiz | `Copy-Item .env.example .env` | Criar a configuração local não versionada. | O arquivo `.env` passa a existir. |
| 6 | Raiz | editar `.env` | Definir banco e primeiro administrador. | Os placeholders são substituídos localmente, sem commit. |
| 7 | Raiz | `npm run db:generate` | Gerar o cliente Prisma em `server/generated/prisma`. | Mensagem `Generated Prisma Client`. |
| 8 | Raiz | `npm run db:migrate` | Criar o arquivo SQLite, registrar e aplicar migrations de desenvolvimento. | `data/folio.db` e a tabela `_prisma_migrations` são criados. |
| 9 | Raiz | `npm run db:seed` | Cadastrar tipos, departamentos e o administrador inicial. | Mensagem `Seed concluído`. |
| 10 | Raiz | `npm run dev` | Iniciar Vite e Express juntos. | Frontend em `127.0.0.1:5173` e API em `127.0.0.1:3002`. |
| 11 | Navegador | acessar `http://127.0.0.1:5173/login` | Abrir a aplicação. | Tela de login do MemoryDoc; após autenticar, a URL muda para `/inicio` ou para a rota originalmente solicitada. |
| 12 | Raiz, em outro terminal | `npm test` | Executar testes unitários, de frontend e de integração. | Todas as suítes aprovadas. |
| 13 | Raiz | `npm run verify` | Executar testes e build de produção. | Testes verdes e pasta `dist/` gerada. |

### Configuração mínima do `.env`

```dotenv
DATABASE_URL="file:./data/folio.db"
ATTACHMENTS_DIR="./data/attachments"
PORT=3002
API_PORT=3002
NODE_ENV=development
BOOTSTRAP_ADMIN_NAME="Administrador do sistema"
BOOTSTRAP_ADMIN_EMAIL="admin@example.invalid"
BOOTSTRAP_ADMIN_PASSWORD="SUBSTITUA_POR_UMA_SENHA_FORTE"
SEED_DEMO_DATA=false
```

Antes de executar o seed, substitua `SUBSTITUA_POR_UMA_SENHA_FORTE` por uma senha local única. Regras confirmadas no código:

- nome, e-mail e senha do administrador são obrigatórios;
- a senha deve ter ao menos 10 caracteres e o placeholder literal do exemplo é rejeitado;
- a senha é usada somente para criar um administrador ainda inexistente e não é redefinida em execuções posteriores;
- `SEED_DEMO_DATA=true` cria dois documentos sanitizados, sem anexos; o padrão `false` não cria documentos fictícios.

`ATTACHMENTS_DIR` aceita caminho relativo à raiz ou absoluto. A aplicação cria os subdiretórios no primeiro upload. Nunca versione `.env`, bancos ou anexos; `data/` já está no `.gitignore`.

Em desenvolvimento, mantenha `PORT` e `API_PORT` iguais. `PORT` define onde o Express escuta; `API_PORT` define o destino do proxy `/api` do Vite.

## Executar frontend e backend separadamente

Use dois terminais na raiz quando precisar inspecionar os processos de forma independente:

| Terminal | Comando | Finalidade | Resultado esperado |
|---|---|---|---|
| API | `npm run dev:api` | Executar Express com recarga pelo `tsx`. | API em `http://127.0.0.1:3002/api/health`. |
| Web | `npm run dev:web` | Executar o Vite com proxy de `/api`. | Interface em `http://127.0.0.1:5173`. |

Para usar outra porta da API durante o desenvolvimento, mantenha os dois valores iguais:

```powershell
$env:PORT='3101'
$env:API_PORT='3101'
npm run dev
```

Essas variáveis valem somente para o terminal atual.

## Preparação de produção

Na raiz, depois de disponibilizar o código e um `.env` seguro:

| Ordem | Comando | Finalidade | Resultado esperado |
|---:|---|---|---|
| 1 | `npm ci` | Instalar o lockfile. | Dependências reproduzíveis. |
| 2 | `npm run db:generate` | Gerar o cliente Prisma. | Cliente disponível para o backend. |
| 3 | `npm run build` | Compilar o React. | Arquivos estáticos em `dist/`. |
| 4 | `npm run db:deploy` | Aplicar somente migrations versionadas. | Banco atualizado sem criar migration nova. |
| 5 | `npm run attachments:migrate` | Transferir para a pasta configurada qualquer anexo legado ainda armazenado no SQLite. | Contagem migrada ou mensagem `Nenhum anexo legado pendente`. |
| 6 | `npm run db:seed` | Garantir catálogos e administrador de bootstrap. | Seed idempotente concluído. |
| 7 | `$env:NODE_ENV='production'; npm start` | Iniciar o processo único. | API e frontend na porta configurada em `PORT`. |

Em produção, o cookie de sessão possui `Secure`; publique a aplicação por HTTPS.

## Problemas comuns

### Versão do Node incompatível

Sintoma: erro `EBADENGINE`, falha do Vite, Prisma ou jsdom.

```powershell
node --version
nvm use 22.22.1
```

Resultado esperado: Node 22 na faixa indicada em `package.json`.

O comando `nvm use 22.22.1` pressupõe que um gerenciador NVM compatível esteja instalado. Sem NVM, instale uma versão Node 22 que respeite `>=22.13.0 <23`.

### Cliente Prisma ausente

Sintoma: importação de `server/generated/prisma/client.ts` não encontrada.

```powershell
npm run db:generate
```

Resultado esperado: a pasta gerada é recriada. Ela não deve ser versionada.

### Variáveis do seed ausentes

Sintoma: `Defina BOOTSTRAP_ADMIN_NAME...`.

Confirme que `.env` existe, substitua o placeholder e execute novamente `npm run db:seed`.

### Porta ocupada

Sintoma: `EADDRINUSE` ou Vite selecionando outra porta.

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3002,5173
```

Resultado esperado: identificar o PID que já usa a porta. Encerre apenas o processo conhecido ou use `PORT` e `API_PORT` iguais em portas livres.

### Falha ao instalar `better-sqlite3`

Sintoma: erro `node-gyp` durante `npm ci`.

- confirme Node 22 suportado e arquitetura x64;
- remova somente uma instalação incompleta de `node_modules` e execute `npm ci` novamente;
- se não houver binário pronto para a plataforma, instale as ferramentas de compilação C++ do Visual Studio Build Tools e Python suportado pelo `node-gyp`.

### Banco bloqueado

Sintoma: código `SQLITE_BUSY` ou `database is locked`.

- confirme que existe apenas uma instância do backend usando o arquivo;
- não abra a mesma base em processos que mantenham transações de escrita;
- aguarde e tente novamente. O servidor já configura WAL, `busy_timeout=5000` e uma repetição controlada para emissão de protocolo.

### Migration pendente

Desenvolvimento: `npm run db:migrate`. Produção: `npm run db:deploy`. Não use `migrate dev` em produção.

### Conteúdo do anexo não encontrado

Sintoma: código `ATTACHMENT_CONTENT_MISSING` ao baixar.

- confirme que `ATTACHMENTS_DIR` aponta para a mesma pasta usada nos uploads;
- restaure banco e pasta de anexos do mesmo backup;
- para registros antigos ainda no SQLite, pare a aplicação e execute `npm run attachments:migrate` depois de aplicar as migrations.

Procedimentos de reset e restauração estão em [Operação](operations.md).
