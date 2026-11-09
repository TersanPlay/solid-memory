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

## Limite legal padrão

A LGPD não estabelece um número máximo geral de meses ou dias para contas, sessões, protocolos, anexos, históricos, solicitações ou mensagens. Os arts. 15 e 16 vinculam o término à finalidade e autorizam conservação apenas em hipóteses específicas. A interface oferece a ação “Aplicar referência LGPD” para registrar essa orientação nos campos da regra, mas mantém o prazo numérico obrigatório para decisão institucional ou norma setorial aplicável.

## Estado de implementação

- **Implementado**: limpeza de sessões expiradas na inicialização e configuração por `SESSION_HOURS`.
- **Implementado como configuração**: administradores podem cadastrar, revisar e ativar/desativar regras por categoria em `/privacidade/configuracoes`, incluindo prazo, finalidade, base legal, gatilho e ação pós-prazo.
- **Matriz inicial cadastrada no MVP**: contas de usuários, sessões, protocolos/documentos, anexos, histórico funcional, solicitações de titulares, mensagens internas, entregas de portabilidade e exportações administrativas possuem uma regra operacional específica na interface.
- **Implementado como configuração**: a mesma tela permite registrar um limite máximo, em dias, para cada tipo de solicitação de titular; nenhum limite é inventado ou aplicado enquanto não for definido pelo responsável.
- **Implementado como verificação**: administradores podem executar `/privacidade/testes`, que valida a disponibilidade do banco, a cobertura dos objetos, os limites permitidos, os parâmetros operacionais e a permanência da exclusão automática desativada. O diagnóstico é somente leitura.
- **Parcial**: expiração e uso único de entregas de portabilidade; o prazo agora é configurável pela governança administrativa e inicia com 48 horas.
- **Pendente**: aprovação institucional da matriz de prazos para contas, documentos, anexos, histórico, logs, solicitações, mensagens e exportações.
- **Pendente**: rotinas de eliminação/anonimização de documentos e anexos; nenhuma exclusão automática deve ser ativada antes da aprovação institucional.
