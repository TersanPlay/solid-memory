# Deploy no Railway

Este guia publica o frontend Vite, a API Express, o SQLite e os anexos como um
único serviço Railway. O projeto deve operar com uma única réplica, pois não há
coordenação de escrita entre múltiplas instâncias SQLite.

Referências oficiais usadas:

- [Config as Code](https://docs.railway.com/config-as-code/reference);
- [Node.js no Railpack](https://railpack.com/languages/node/);
- [Volumes](https://docs.railway.com/volumes);
- [Healthchecks](https://docs.railway.com/deployments/healthchecks);
- [Variáveis](https://docs.railway.com/variables);
- [Especificações de rede](https://docs.railway.com/networking/public-networking/specs-and-limits).

## O que já está configurado no repositório

`railway.json` é a fonte de configuração do deploy:

- builder `RAILPACK`;
- build `npm run build:railway`;
- start `npm run start:railway`;
- healthcheck `GET /api/health`;
- timeout de saúde de 300 segundos;
- reinício em falha, limitado a dez tentativas.

O comando de build gera o Prisma Client e compila `dist/`. O comando de start
aplica migrations, executa o seed idempotente e inicia o Express. O start
personalizado também impede o Railpack de classificar este repositório como um
site Vite exclusivamente estático.

Migrations não ficam em `preDeployCommand`: volumes Railway existem durante o
runtime, mas não durante build ou pre-deploy. Por isso `db:deploy` está no início
do processo, antes da abertura da porta.

## 1. Conectar o serviço

No Railway:

1. crie ou abra o projeto;
2. adicione um serviço a partir do repositório
   `TersanPlay/solid-memory`;
3. mantenha o diretório raiz como `/`;
4. mantenha uma única réplica;
5. não configure o serviço como Static Site.

O `railway.json` versionado substitui comandos divergentes cadastrados
anteriormente no painel.

## 2. Criar o volume persistente

Antes do primeiro uso, adicione um volume ao serviço e defina:

```text
Mount Path: /app/data
```

O Railway executa a aplicação em `/app`; portanto o volume cobre o SQLite e os
anexos no mesmo armazenamento persistente. Sem esse volume, registros, sessões
e uploads são perdidos quando o container é substituído.

Volumes ficam ligados a uma instância. Não aumente a quantidade de réplicas
enquanto o projeto usar SQLite e filesystem local.

## 3. Cadastrar variáveis

Na aba **Variables** do serviço, informe:

```dotenv
PORT=3000
NODE_ENV=production
DATABASE_URL=file:/app/data/folio.db
ATTACHMENTS_DIR=/app/data/attachments
BOOTSTRAP_ADMIN_NAME=Administrador do sistema
BOOTSTRAP_ADMIN_EMAIL=admin@example.invalid
BOOTSTRAP_ADMIN_PASSWORD=SUBSTITUA_POR_UMA_SENHA_FORTE
SEED_DEMO_DATA=false
```

Substitua nome, e-mail e senha do administrador. Use uma senha exclusiva com no
mínimo dez caracteres e sele a variável `BOOTSTRAP_ADMIN_PASSWORD` no painel.
Não use o endereço de exemplo em produção.

Não configure `API_PORT`: essa variável é usada somente pelo proxy Vite local.
O Railway e o healthcheck usam `PORT`. O frontend de produção acessa `/api` na
mesma origem pública.

O seed não redefine a senha de um administrador já existente, mas garante que o
usuário de bootstrap permaneça ativo e com perfil `ADMIN`. Alterar as variáveis
de bootstrap não renomeia a conta antiga para outro e-mail; pode criar outra
conta administrativa.

## 4. Implantar

Revise as alterações staged no Railway e inicie o deploy. A ordem efetiva será:

1. Railpack instala o `package-lock.json`;
2. `npm run build:railway` gera o cliente e `dist/`;
3. o volume é montado em `/app/data`;
4. `npm run start:railway` cria o arquivo, aplica migrations e executa o seed;
5. Express escuta em `0.0.0.0:3000`;
6. Railway consulta `/api/health`;
7. a versão passa a receber tráfego após retornar HTTP 200.

O hostname usado pelo healthcheck é `healthcheck.railway.app`. A aplicação não
restringe `Host`, e esse cenário retorna HTTP 200.

## 5. Validar

Depois do deploy:

1. abra `https://<dominio-railway>/api/health`;
2. confirme `data.status = "ok"` e `data.database = "sqlite"`;
3. abra `https://<dominio-railway>/login`;
4. autentique com o administrador configurado;
5. crie um registro de teste e, se apropriado, um anexo sem dados pessoais;
6. faça um redeploy;
7. confirme que registro e anexo continuam disponíveis.

O último passo comprova que banco e anexos estão realmente no volume.

## Operação e diagnóstico

### Build publica somente o frontend

Confirme que o deploy mostra `npm run build:railway` e
`npm run start:railway` como comandos originados de `railway.json`. Um servidor
Caddy de site estático não executa Express, autenticação, SQLite ou anexos.

### `Cannot find server/generated/prisma`

Confirme que o log de build contém `npm run db:generate`. O diretório gerado é
intencionalmente ignorado pelo Git e precisa ser criado no container.

### `DATABASE_URL deve usar o formato file:`

Cadastre exatamente:

```text
DATABASE_URL=file:/app/data/folio.db
```

### Dados desaparecem após redeploy

Confirme que o volume pertence ao mesmo serviço, está montado em `/app/data` e
que `DATABASE_URL` e `ATTACHMENTS_DIR` apontam para esse caminho.

### Healthcheck retorna 502

Verifique no log:

- bind em `0.0.0.0`;
- porta recebida em `PORT`;
- migrations concluídas;
- seed sem variável obrigatória ausente;
- `GET /api/health` retornando 200.

### Migration ou seed entra em reinício

O processo encerra quando a preparação falha, e a política tenta novamente até
dez vezes. Corrija a variável ou migration em vez de remover `db:deploy` do
start.

### Anexos legados em BLOB

Para uma base migrada de versão antiga, interrompa o serviço e execute uma vez,
com o volume conectado:

```text
npm run attachments:migrate
```

Não execute duas instâncias desse utilitário simultaneamente.

## Segurança operacional

- mantenha as variáveis administrativas fora do Git;
- use variáveis seladas para senhas;
- não publique Prisma Studio;
- não exponha o arquivo SQLite ou `/app/data` como conteúdo estático;
- mantenha uma única réplica;
- use backups do volume e valide periodicamente a restauração;
- não reutilize o volume de produção em ambientes de pull request.
