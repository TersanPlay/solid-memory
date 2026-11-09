# Gaps LGPD — MemoryDoc

**Data da revisão**: 2026-11-09

> Status técnico do MVP. “Implementado” significa que há controle no código; não significa conformidade jurídica ou operação institucional completa.

| ID | Prioridade | Status | Lacuna | Evidência atual | Referência | Próxima ação |
|---|---|---|---|---|---|---|
| G001 | Média | Parcial | Atendimento de direitos do titular ainda não está institucionalizado | Todos os tipos do produto podem ser registrados e acompanhados; a portabilidade tem entrega técnica por link; faltam execução operacional dos demais direitos, canal oficial, notificações, SMTP, procedimento aprovado e critérios institucionais de encerramento | Arts. 18 e 19 | Definir controlador/Encarregado, procedimento por tipo de direito, validação, prazos operacionais, retenção e comunicação ao titular |
| G002 | Alta | Aberta | Retenção de documentos, anexos, contas, histórico, DSAR, mensagens e exportações ainda não foi aprovada | Sessões expiradas são limpas; links de portabilidade expiram em 48 horas e têm uso único; demais categorias não são excluídas automaticamente | Arts. 6º, III, 15 e 16 | Aprovar matriz institucional e só depois automatizar eliminação/anonimização |
| G003 | Alta | Aberta | Conteúdo de anexos pode conter dados sensíveis sem classificação | `Attachment.content`/filesystem aceita arquivos genéricos; há limite e proteção contra path traversal, mas não há classificação, criptografia em repouso ou malware scan documentados como concluídos | Arts. 5º, II, 11 e 46 | Classificar conteúdo, restringir tipos, proteger armazenamento e verificar malware |
| G004 | Baixa | Condicional | Infraestrutura e operadores futuros ainda não foram definidos | MVP roda somente em máquina local, sem nuvem, backup externo, SMTP ou operador de infraestrutura identificado; links externos não são acessados | Arts. 33–36 e 39 | Reavaliar antes de hospedagem, backup, observabilidade ou integração externa |
| G005 | Alta | Aberta | MVP sem entidade controladora, CNPJ, endereço, Encarregado, canal institucional ou revisão jurídica | Campos institucionais continuam placeholders; políticas permanecem rascunhos | Arts. 9º e 41; Res. 18/2024 | Definir dados institucionais e revisar juridicamente antes de operar com dados reais |
| G006 | Média | Parcial | Histórico funcional pode conter descrições ou URLs com dados pessoais | Logs HTTP redigem cookies/autorização e não registram corpo; histórico e descrições dependem do conteúdo inserido por usuários | Arts. 6º, III e VII, e 46 | Definir conteúdo permitido, retenção e revisão periódica de descrições/históricos |
| G007 | Média | Condicional | Não há consent ledger para finalidades opcionais | Não há analytics, marketing ou compartilhamento opcional no MVP; existe especificação para caso uma finalidade baseada em consentimento seja adicionada | Arts. 7º, I, 8º e 9º | Não implementar enquanto não houver finalidade opcional; se houver, criar ledger versionado antes da ativação |
| G008 | Média | Parcial | Exportações administrativas ainda podem ampliar exposição | Portabilidade tem JSON minimizado, hash, validade, uso único e trilha; relatórios administrativos CSV/JSON/PDF/XLSX ainda dependem de matriz de acesso, retenção e expiração | Arts. 6º, VII, VIII e 46 | Aprovar matriz de exportações, aplicar minimização, retenção e controles de download |
| G009 | Média | Parcial | Registro operacional de incidentes ainda não foi implementado | `.lgpd/incidents/runbook.md` documenta o processo e os logs são minimizados, mas não há módulo/registro operacional nem tabletop | Art. 48; Res. 15/2024 | Criar registro de incidentes, responsáveis, severidade, evidências e simulação |
| G010 | Baixa | Parcial resolvido | Público infantil/adolescente está fora do escopo, mas a restrição depende de governança | Produto documenta usuários internos adultos e não é destinado a crianças/adolescentes | Art. 14; Lei nº 15.211/2025 | Manter restrição no produto e reavaliar se público, escala ou dados mudarem |
| G011 | Média | Parcial | Entrega por e-mail não é automática | Administração pode copiar o link seguro, inserir na mensagem interna ou abrir o cliente de e-mail local; o MemoryDoc não envia e-mail | Arts. 18 e 19; art. 46 | Definir provedor, domínio, destinatário, SMTP, logs de envio e modelo de comunicação antes de automatizar |

## Itens concluídos tecnicamente nesta revisão

- Registro de solicitação autenticada e pública.
- Controle de acesso por titular e administrador.
- Registro e acompanhamento de todos os tipos de solicitação previstos no produto: acesso, correção, eliminação, anonimização, portabilidade, oposição e revogação de consentimento.
- Interface administrativa de tratamento.
- Mensagens internas vinculadas ao pedido.
- Trilha técnica de atendimento.
- Portabilidade com JSON estruturado minimizado, hash, validade de 48 horas, uso único e registro de download.
- Preparação manual de e-mail sem inventar canal institucional.

Esses itens não encerram G001, G002, G005, G008, G009 ou G011, pois ainda existem decisões institucionais, retenção, infraestrutura e operação externa pendentes.
