# Política técnica de minimização de descrições, URLs e histórico — MemoryDoc

**Versão**: v1.0-draft  
**Data**: 2026-11-09  
**Status**: controle técnico implementado; aprovação institucional pendente

> Este documento orienta o MVP e não substitui a política de retenção aprovada pelo controlador.

## 1. Objetivo

Aplicar os princípios de finalidade, adequação, necessidade, segurança e prevenção da LGPD aos campos de descrição, URLs documentais, histórico funcional, trilha de atendimento e logs HTTP.

## 2. Regras de entrada

- Descrições devem conter somente o contexto mínimo necessário para registrar ou tratar a operação.
- Não inserir senhas, tokens, credenciais, documentos completos, dados de saúde ou outros dados sensíveis desnecessários.
- Descrições de solicitações têm limite técnico de 2.000 caracteres; notas de tratamento e mensagens têm limites próprios.
- URLs documentais devem usar HTTPS e não podem conter credenciais, tokens, chaves, assinaturas ou segredos em parâmetros de consulta.
- O MemoryDoc armazena a URL e o provedor informado, mas não acessa, baixa, sincroniza, hospeda ou analisa o conteúdo externo.

## 3. Histórico e auditoria

- O histórico funcional registra ação, protocolo, usuário, data e status necessários para rastreabilidade.
- URLs completas não são gravadas nos detalhes do histórico de inclusão ou remoção; é armazenado apenas o provedor e uma impressão digital não reversível da URL.
- Logs HTTP não registram corpo de requisição, cookies ou autorização.
- Valores sensíveis em URLs de requisição, como tokens de download, são redigidos antes do registro.
- Notas de eventos administrativos passam por redação técnica de e-mails, documentos, telefones, URLs e tokens; a nota operacional original, quando necessária, permanece somente no registro de tratamento com acesso restrito.

## 4. Retenção e revisão

- Não excluir documentos, anexos ou histórico automaticamente sem matriz de retenção aprovada.
- Sessões expiradas seguem a rotina já configurada no sistema.
- Pedidos de titulares, mensagens, trilhas e exportações devem ter prazos próprios definidos pelo controlador.
- O responsável deve revisar periodicamente descrições e históricos para identificar conteúdo excessivo e ajustar orientações.
- Quando houver eliminação ou anonimização aprovada, registrar a decisão e preservar somente a evidência mínima necessária.

## 5. Estado atual

**Implementado:** limites de entrada, validação HTTPS, rejeição de URLs com segredos, redação de logs HTTP, redação de notas de eventos e substituição de URLs completas por fingerprint no histórico de links.

**Parcial:** retenção e revisão periódica ainda dependem de prazos e responsáveis institucionais.

**Pendente:** aprovação do controlador, matriz de retenção, rotina operacional de revisão e eventual classificação formal de dados sensíveis nos anexos.

## Referências

- LGPD, arts. 5º, 6º, 15, 16, 18 e 46.
- `.lgpd/retention.md`
- `.lgpd/security-baseline.md`
