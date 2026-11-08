# Baseline técnico de segurança

- Produção somente com HTTPS e `secure` cookies.
- Manter RBAC no backend e princípio do menor privilégio.
- Não registrar cookies, tokens, senhas ou conteúdo documental em logs.
- Criptografar backups, armazenamento de anexos e segredos em repouso; manter rotação e controle de acesso às chaves.
- Limitar MIME/tamanho de anexos, executar antivírus e impedir conteúdo ativo quando aplicável.
- Monitorar acessos administrativos, exportações, downloads e falhas de autenticação.
- Testar restauração de backup e revogação de sessões.

Base: LGPD arts. 6º, VII e VIII, e 46.
