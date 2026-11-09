# Retenção e eliminação — política inicial

Nenhuma categoria deve permanecer “indefinida”. O proprietário do processo deve aprovar prazos por classe documental, obrigação legal e necessidade operacional.

- Sessões: eliminar ao expirar e executar limpeza periódica.
- Contas inativas: definir prazo com Jurídico/RH antes de excluir ou anonimizar.
- Documentos e anexos: reter conforme tabela de temporalidade/obrigação aplicável.
- Histórico e logs: prazo separado, mínimo necessário e acesso restrito.
- Exportações: armazenar somente quando necessário, com expiração e eliminação segura.
- Solicitações de titulares: manter pelo prazo necessário para atendimento, prestação de contas e defesa de direitos, conforme prazo aprovado pelo controlador.
- Mensagens e trilha de atendimento: manter separadas do conteúdo documental, com acesso restrito e prazo mínimo necessário.
- Pacotes de portabilidade: o link expira em 48 horas e só pode ser usado uma vez; o registro da solicitação, hash, geração e download seguem o prazo institucional do atendimento.
- Relatórios administrativos: não confundir a expiração do link de portabilidade com a retenção de exportações gerenciais, que ainda precisa de matriz própria.

Base: LGPD arts. 6º, III, 15 e 16.

## Estado de implementação

- **Implementado**: limpeza de sessões expiradas na inicialização e configuração por `SESSION_HOURS`.
- **Parcial**: expiração e uso único de entregas de portabilidade.
- **Pendente**: prazos aprovados para contas, documentos, anexos, histórico, logs, solicitações, mensagens e exportações.
- **Pendente**: rotinas de eliminação/anonimização de documentos e anexos; nenhuma exclusão automática deve ser ativada antes da aprovação institucional.
