# Desenvolvimento e testes

## Estrutura

```text
SoftProtocolo/
├── scripts/
│   ├── users.js                     # CLI administrativo de usuários
│   ├── migrate-attachments.js       # migração explícita de BLOBs legados
│   └── users.test.js                # integração do CLI com SQLite
├── prisma/
│   ├── migrations/                  # SQL versionado
│   ├── schema.prisma                # modelo do banco
│   └── seed.js                      # catálogos e bootstrap
├── server/
│   ├── app.js                       # Express, rotas e validações
│   ├── attachment-storage.js        # hierarquia e operações seguras de arquivo
│   ├── attachment-migration.js      # migração em lotes para o filesystem
│   ├── attachment-storage.test.js   # nomes, traversal e ciclo do arquivo
│   ├── auth.js                      # senha, sessão e RBAC
│   ├── documents.js                 # protocolo e regras documentais
│   ├── db.js                        # Prisma/SQLite
│   ├── index.js                     # processo HTTP
│   ├── users.js                     # regras compartilhadas entre API e CLI
│   ├── spa-routing.test.js          # fallback de URLs profundas em produção
│   └── prepare-database.js          # diretório/arquivo SQLite
├── src/
│   ├── api.js                       # cliente fetch e downloads
│   ├── App.jsx                      # telas, rotas, guardas e integração
│   ├── main.jsx                     # montagem React e BrowserRouter
│   ├── components/FormControls.jsx  # selects pesquisáveis e calendário
│   ├── data.js                      # rótulos e formatação visual
│   └── styles.css                   # identidade visual responsiva
├── docs/
├── prisma.config.ts
├── railway.json                  # build, start e healthcheck no Railway
└── vite.config.js
```

`server/generated/prisma` é regenerado, ignorado pelo Git e não deve ser editado.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Vite e API em paralelo; encerra os dois quando um termina. |
| `npm run dev:web` | Apenas frontend em 127.0.0.1:5173. |
| `npm run dev:api` | Apenas API com watch. |
| `npm run build` | Compila o frontend em `dist/`. |
| `npm run build:railway` | Gera o Prisma Client e compila o frontend no Railpack. |
| `npm start` | Executa Express; em `NODE_ENV=production`, também serve `dist/`. |
| `npm run start:railway` | Em runtime, aplica migrations, executa o seed idempotente e inicia o Express. |
| `npm run preview` | Serve o build Vite localmente; não inicia a API Express. |
| `npm run db:prepare` | Cria diretório e arquivo SQLite quando ausentes. |
| `predb:migrate` | Hook do npm executado automaticamente antes de `db:migrate`; chama `db:prepare`. |
| `npm run db:generate` | Gera Prisma Client. |
| `npm run db:migrate` | Prepara o arquivo e executa `prisma migrate dev`. |
| `predb:deploy` | Hook do npm executado automaticamente antes de `db:deploy`; chama `db:prepare`. |
| `npm run db:deploy` | Prepara o arquivo e aplica migrations versionadas. |
| `npm run db:seed` | Executa o seed explícito. |
| `npm run db:studio` | Abre Prisma Studio. |
| `npm run attachments:migrate` | Move anexos legados do SQLite para `ATTACHMENTS_DIR`; execute com a aplicação parada. |
| `npm run users -- <comando>` | Lista, cria ou edita usuários diretamente no SQLite; consulte `npm run users -- help`. |
| `npm test` | Executa Vitest uma vez. |
| `npm run test:watch` | Vitest em modo interativo. |
| `npm run verify` | Testes seguidos do build. |

## Estratégia de testes

- `server/auth.test.js`: e-mail, scrypt, hash de sessão e máscara.
- `server/config.test.js`: porta padrão e configuração do servidor.
- `server/app.integration.test.js`: migrations reais em SQLite temporário, sessão, RBAC, concorrência, cancelamento, anexos em arquivo/legados, histórico, filtros e relatórios.
- `server/attachment-storage.test.js`: preservação de nome, neutralização de nomes incompatíveis, bloqueio de traversal, escrita, leitura e remoção.
- `server/spa-routing.test.js`: fallback de produção para acesso direto a rotas do frontend.
- `scripts/users.test.js`: argumentos e códigos de saída do CLI, normalização, senha, sessões, conflitos e proteção do último administrador.
- `src/data.test.js`: rótulos e protocolo exibido.
- `src/App.test.jsx`: sessão, URLs, retorno pós-login, navegação, histórico, guardas, detalhes e estados 403/404.
- `src/components/FormControls.test.jsx`: seleção, pesquisa, foco, calendário pt-BR, datas locais e limites de período.
- `src/native-controls.test.js`: garante que o App não reintroduza selects ou calendários nativos.
- `src/SimpleModal.test.jsx` e `src/CancelDocumentModal.test.jsx`: modais próprios e ações de confirmação.
- `src/AttachmentControls.test.jsx`: seleção local, bloqueio durante salvamento, remoção e permissões visuais.

Os testes de servidor declaram ambiente Node. Os testes React usam jsdom, Testing Library e o setup em `src/test/setup.js`.

Os testes integrados criam bancos e pastas de anexos temporários, aplicam todos os arquivos `migration.sql` em ordem, injetam um Prisma Client no `createApp` e removem os artefatos após desconectar. Isso impede uso acidental de `data/folio.db` e `data/attachments` nos testes.

As rotas HTTP e `scripts/users.js` reutilizam `server/users.js`. Alterações em validação, normalização de e-mail, senha, sessões ou proteção administrativa devem ser implementadas nesse serviço compartilhado e cobertas nos dois contratos.

### Executar um arquivo

Na raiz:

```powershell
npx vitest run server/app.integration.test.js
```

Resultado esperado: somente a suíte de integração é executada.

## Alterar o banco

1. Edite `prisma/schema.prisma`.
2. Execute `npm run db:migrate -- --name descricao_curta` na raiz.
3. Revise o SQL gerado, especialmente constraints SQLite não expressas pelo schema Prisma.
4. Execute `npm run db:generate`.
5. Atualize seed, serializers, API e frontend quando necessário.
6. Adicione teste de migração/regra.
7. Execute `npm run verify`.
8. Atualize `docs/database.md` e `docs/api.md` somente com o comportamento implementado.

Nunca edite uma migration já aplicada em ambientes compartilhados; crie outra migration.

## Adicionar ou alterar endpoint

- Defina validação Zod na fronteira da rota.
- Use `ApiError` para falhas esperadas e mantenha o envelope padrão.
- Aplique `authenticate` implicitamente pelo prefixo `/api` e `requireRoles` quando necessário.
- Repita no serviço regras dependentes do proprietário/estado do documento.
- Não devolva hash, salt, token, `storageKey` ou conteúdo binário em JSON.
- Adicione teste Supertest de sucesso, permissão e validação.
- Atualize `docs/api.md` no mesmo conjunto de mudanças.

## Adicionar ou alterar página do frontend

- Cadastre a rota declarativa em `App.jsx` e use um caminho em português coerente com as URLs existentes.
- Use `Link` ou `NavLink` para navegação acionada pelo usuário; reserve `useNavigate` para fluxos programáticos, como login, logout e conclusão de formulários.
- Aplique `RequireRole` para restrições visuais, sem remover a validação equivalente da API.
- Atualize o título em `PageTitle`; páginas de detalhe podem complementar o título depois de carregar o registro.
- Preserve o retorno pós-login, acesso direto, atualização da página e navegação Voltar/Avançar.
- Adicione teste com `MemoryRouter`. Se a rota for profunda, mantenha também o teste do fallback de produção.

## Manutenção sistemática da documentação

Atualize documentação e código no mesmo conjunto de mudanças. Use esta matriz como fonte de roteamento:

| Mudança confirmada no código | Documentos que devem ser revisados |
|---|---|
| Requisitos, scripts, portas ou variáveis de ambiente | `README.md`, `getting-started.md`, `operations.md` |
| Dependências estruturais ou divisão de componentes | `architecture.md`, `development.md` |
| Rota, campo, filtro, envelope ou código de erro da API | `api.md` e, quando afetar permissões, `architecture.md` |
| Modelo Prisma, índice, constraint, migration ou seed | `database.md`, `getting-started.md` e `operations.md` |
| Rota do frontend, regra de navegação ou título | `architecture.md`, `development.md`, `operations.md` |
| Regra de negócio ou RBAC | `architecture.md`, `api.md`, `database.md` quando persistida |
| Teste, fixture ou procedimento de validação | `development.md`; falhas operacionais também em `operations.md` |

Antes de concluir:

1. compare nomes com `package.json`, `.env.example`, `src/App.jsx`, `server/app.js` e `prisma/schema.prisma`;
2. não documente endpoint, variável ou comportamento apenas planejado;
3. procure referências antigas de porta, rota, migration e armazenamento;
4. valide links Markdown relativos;
5. execute `npm run verify` e `npm audit --audit-level=high`.

## Convenções relevantes

- Código da aplicação em JavaScript ESM; arquivos gerados pelo Prisma são TypeScript e executados por `tsx`.
- IDs são gerados pelo Prisma com `cuid()`.
- E-mails ficam em minúsculas; prefixos/códigos, em maiúsculas.
- Status trafegam na API como enum e são traduzidos para pt-BR apenas na apresentação.
- Não calcule protocolo definitivo no frontend.
- Não introduza nova fonte de persistência no navegador.
- Não registre corpos de login, cookies, tokens ou anexos.

## Checklist para mudanças

- Migration e seed continuam idempotentes.
- Perfis negados foram testados, não apenas perfis autorizados.
- Cancelamento continua terminal e sem reaproveitamento.
- Concorrência não cria protocolo duplicado.
- Listas respeitam paginação máxima de 100.
- Anexo não aparece em JSON como conteúdo.
- `npm audit --audit-level=high` é revisado; vulnerabilidades aceitas temporariamente ficam documentadas. `npm test` e `npm run build` devem passar.
- Documentação reflete nomes reais de scripts, rotas e variáveis.
