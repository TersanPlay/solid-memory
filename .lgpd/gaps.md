# Gaps LGPD — MemoryDoc

**Data**: 2026-11-08

| ID | Prioridade | Lacuna | Evidência | Referência | Ação |
|---|---|---|---|---|---|
| G001 | Média | Canal público e trilha técnica foram implementados, mas o workflow institucional de direitos do titular ainda é parcial | Formulário público em `/privacidade/solicitar`, endpoint `POST /api/public/privacy-requests`, tela administrativa e eventos de atendimento; ainda sem validação institucional de identidade, notificações ou canal oficial definido | Arts. 18 e 19 | Definir controlador/canal oficial, procedimento de verificação adicional de identidade, responsável, comunicação ao titular e critérios de encerramento |
| G002 | Alta | Retenção de documentos, anexos, contas, histórico e exportações ainda não foi aprovada | Sessões expiradas são limpas; nenhum documento é excluído automaticamente | Arts. 6º, III e 15-16 | Aprovar matriz institucional antes de automatizar exclusões |
| G003 | Alta | Conteúdo de anexos pode conter dados sensíveis sem classificação | `Attachment.content`/filesystem aceita arquivos genéricos | Arts. 5º, II, 11 e 46 | Classificar conteúdo, restringir tipos, criptografar e verificar malware |
| G004 | Baixa | Infraestrutura futura ainda não foi definida | Atualmente o MVP roda somente em máquina local, sem nuvem ou operador externo; links não são acessados | Arts. 33-36 e 39 | Reavaliar quando houver hospedagem, backup externo ou publicação |
| G005 | Alta | MVP sem entidade controladora, CNPJ, endereço, Encarregado, canal público ou revisão jurídica | Projeto ainda não possui dados institucionais | Arts. 9º e 41; Res. 18/2024 | Definir controlador e contatos; revisar juridicamente antes de publicar ou operar com dados reais |
| G006 | Média | Histórico funcional ainda pode conter descrições/URLs com dados pessoais | Pino não serializa corpo e redige cookies/autorização; histórico documental depende do conteúdo informado | Arts. 6º, III, VII e 46 | Revisar retenção e conteúdo permitido em descrições |
| G007 | Média | Não há consent ledger para finalidades opcionais | Nenhum modelo de consentimento | Arts. 7º, I e 8º | Implementar apenas se houver tratamento baseado em consentimento |
| G008 | Média | Exportações podem ampliar exposição | CSV/JSON/PDF/XLSX para admins | Arts. 6º, VII, VIII e 46 | Controle de finalidade, watermark, expiração e trilha de download |
| G009 | Média | Runbook existe, mas registro operacional de incidentes ainda não foi implementado | `.lgpd/incidents/runbook.md` documenta o processo | Art. 48; Res. 15/2024 | Criar registro de incidentes e responsáveis quando houver operação real |
| G010 | Resolvido parcialmente | Público infantil/adolescente declarado fora do escopo; alto risco ainda depende do conteúdo e escala | Aplicação administrativa interna | Art. 14; Res. 2/2022 | Registrar essa restrição no produto e confirmar escala/dados sensíveis |
