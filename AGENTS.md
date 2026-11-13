# Instruções do projeto — MemoryDoc

## Governança LGPD

Para qualquer tarefa que envolva dados pessoais, autenticação, cookies, links documentais, logs, retenção, DSAR, exportações, fornecedores ou segurança, utilize a skill `lgpd-audit` do plugin `lgpd-skills` e consulte primeiro os artefatos em `.lgpd/`.

A pasta `.lgpd/` é a fonte versionada de especificação e status de privacidade deste projeto. Após implementar ou alterar um controle relacionado à LGPD:

1. compare o comportamento real do código com `.lgpd/STATUS.md`, `.lgpd/gaps.md` e os artefatos especializados aplicáveis;
2. atualize a documentação somente para funcionalidades comprovadamente implementadas;
3. mantenha as lacunas institucionais, jurídicas e operacionais explicitamente abertas;
4. não declare conformidade, segurança jurídica ou publicação de política sem aprovação humana adequada;
5. valide com testes, build e `git diff --check` quando houver alteração de código.

## Contexto fixo do produto

- O MemoryDoc é um MVP administrativo interno, atualmente executado em máquina local.
- O produto não é destinado a crianças ou adolescentes.
- Não invente controlador, razão social, CNPJ, endereço, Encarregado, canal institucional, fornecedor ou dados jurídicos. Use pendente/placeholders quando necessário.
- As políticas em `.lgpd/policies/` permanecem rascunhos até revisão institucional e jurídica.
- O campo de link documental é opcional; armazene somente URL HTTPS e provedor identificado. Não acesse, baixe, sincronize, hospede ou analise o conteúdo de Google Drive, OneDrive, Dropbox ou serviços semelhantes.
- Não implemente integrações externas sem solicitação e análise específica de operador, segurança, transferência internacional e contrato.

## Regras técnicas de privacidade

- Preserve autenticação, RBAC, cookies HttpOnly/SameSite, rate limiting, Helmet, validação de entrada e hash de senhas.
- Não registre cookies, tokens, senhas, autorização, URLs sensíveis ou conteúdo documental em logs e trilhas.
- Usuários comuns só podem acessar dados próprios; operações administrativas devem permanecer protegidas no backend, além da proteção de interface.
- Regras de retenção são configuração de governança. Não exclua, anonimize ou destrua dados automaticamente sem política institucional aprovada e rotina revisada.
- Diagnósticos de governança devem ser somente leitura, salvo quando a tarefa autorizar explicitamente uma alteração.

## Codebase Memory

Para exploração arquitetural, rastreamento de dependências ou análise de impacto, use a skill local `codebase-memory` e o servidor MCP definido em `.mcp.json` quando estiver disponível. Confirme resultados do grafo no código local e respeite o `.cbmignore`.

- Não indexe o repositório sem autorização explícita para essa operação.
- Não use ausência de resultados como prova de ausência de código.
- Não leia ou exponha `.env`, banco SQLite, anexos, uploads, dependências ou artefatos de build no grafo.
- Ao fazer afirmações de impacto, verifique cobertura do índice e a versão do checkout.

## Validação e documentação

Para mudanças de código, execute conforme aplicável:

```text
npm test
npm run build
git diff --check
```

Ao concluir, informe arquivos alterados, controles implementados, testes executados e lacunas ainda abertas. A skill e este arquivo não substituem revisão jurídica, decisão do controlador ou aprovação institucional.
