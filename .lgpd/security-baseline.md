# Baseline técnico de segurança

- Produção somente com HTTPS e `secure` cookies.
- Manter RBAC no backend e princípio do menor privilégio.
- Não registrar cookies, tokens, senhas ou conteúdo documental em logs.
- Criptografar backups, armazenamento de anexos e segredos em repouso; manter rotação e controle de acesso às chaves.
- Limitar MIME/tamanho de anexos, executar antivírus e impedir conteúdo ativo quando aplicável.
- Monitorar acessos administrativos, exportações, downloads e falhas de autenticação.
- Testar restauração de backup e revogação de sessões.

## Estado no MVP local

**Implementado:** hash de senhas, sessões com cookie HttpOnly/SameSite, rate limiting, Helmet, RBAC, validação de entrada, HTTPS obrigatório para links documentais, redação de cookies/autorização nos logs, escopo por titular, tokens de entrega armazenados por hash, validade e uso único de links de portabilidade.

**Parcial ou pendente:** `Secure` depende de execução em HTTPS; criptografia gerenciada de anexos, backups e segredos, rotação de chaves, antivírus/malware scan, monitoramento operacional, restauração de backup e log imutável ainda não estão concluídos no MVP local.

Base: LGPD arts. 6º, VII e VIII, e 46.
