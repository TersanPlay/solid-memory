# Política de Privacidade — MemoryDoc

**Versão**: v1.0-draft  
**Data do rascunho**: 2026-11-08  
**Vigência**: após revisão jurídica e publicação

> Este documento é um rascunho. Os campos entre colchetes precisam ser confirmados pelo controlador antes da publicação.

> **Limitação do MVP:** esta versão foi produzida para orientar o desenvolvimento. O projeto ainda não possui entidade empresarial, CNPJ, endereço institucional, canal oficial de privacidade, Encarregado ou revisão jurídica definidos. Portanto, este documento não deve ser publicado como política oficial nem usado como prova de conformidade.

## Resumo

- O MemoryDoc registra, numera e acompanha protocolos de documentos administrativos.
- Tratamos dados de usuários, responsáveis e pessoas mencionadas nos documentos.
- Usamos os dados para autenticação, tramitação, segurança, auditoria e relatórios.
- Não identificamos venda de dados nem uso de publicidade comportamental.
- Solicitações de titulares devem ser encaminhadas a **[e-mail do controlador/Encarregado]**.

## 1. Controlador — pendente no MVP

- **Razão social**: [confirmar]
- **CNPJ**: [confirmar]
- **Endereço**: [confirmar]
- **Site/aplicação**: [confirmar quando houver publicação]

Enquanto o projeto permanecer um MVP sem empresa ou organização controladora definida, não há identificação institucional suficiente para publicação de uma política oficial.

## 2. Encarregado — pendente no MVP

- **Nome ou empresa**: [confirmar]
- **E-mail**: [confirmar]
- **Canal para titulares**: [confirmar quando houver operação real]

O MVP ainda não possui Encarregado ou canal oficial designado. Essa definição deve ocorrer antes do uso com dados pessoais em produção, observando as regras aplicáveis ao controlador.

## 3. Dados e finalidades

### Conta e autenticação

Tratamos nome, e-mail, perfil de acesso, estado da conta, credencial protegida por hash e dados técnicos de sessão para criar contas, autenticar usuários e controlar o acesso. A base legal preliminar é a execução de contrato ou procedimentos solicitados pelo titular (LGPD, art. 7º, V).

### Registro, numeração e tramitação documental

Tratamos o número de protocolo, datas, assunto, origem, destino, responsáveis, status, links e conteúdo de documentos ou anexos para registrar, numerar, localizar, acompanhar e comprovar movimentações administrativas. O campo de link é opcional: o MemoryDoc armazena somente a URL informada e não acessa, baixa, sincroniza, hospeda ou analisa o conteúdo mantido no serviço externo. A base legal deve ser confirmada pelo controlador para cada classe documental e poderá incluir execução de contrato (art. 7º, V) ou obrigação legal/regulatória (art. 7º, II). Dados sensíveis eventualmente presentes exigem análise específica do art. 11.

### Segurança, histórico e relatórios

Tratamos autoria, ações, horários, protocolos e recortes documentais para segurança, rastreabilidade, auditoria e prestação de contas. A base legal preliminar é obrigação legal/regulatória, execução de contrato ou legítimo interesse com avaliação documentada, conforme o caso (arts. 7º, II, V e IX, e 10).

## 4. Forma e duração

Os dados são coletados no uso da aplicação e armazenados em banco SQLite e diretório de anexos configurado pelo ambiente. O acesso é controlado por autenticação e perfis.

Os prazos de retenção serão definidos por classe de dado e documento. Sessões expiradas devem ser eliminadas; contas, documentos, anexos, históricos, logs e exportações terão prazos próprios, conforme `.lgpd/retention.md` e obrigações aplicáveis.

## 5. Compartilhamento

Podemos compartilhar dados com:

- provedores de hospedagem e armazenamento necessários para operar a aplicação;
- usuários ou destinatários que tenham acesso aos links documentais informados;
- usuários internos autorizados conforme seu perfil;
- autoridades públicas quando houver obrigação legal.

Os serviços externos referenciados nos links — como Google Drive, OneDrive ou Dropbox — não são automaticamente operadores do MemoryDoc. Nesta fase, o MemoryDoc não acessa nem processa o conteúdo hospedado neles. O MVP roda em máquina local e não possui operador de hospedagem em nuvem identificado.

## 6. Transferências internacionais

O MVP atualmente roda apenas em máquina local, sem hospedagem em nuvem ou transferência internacional de infraestrutura identificada. A simples existência de um link para Google Drive, OneDrive, Dropbox ou serviço similar não significa que o MemoryDoc realize uma transferência internacional para esse provedor, pois a aplicação não acessa nem processa o conteúdo do link. Essa avaliação deverá ser refeita quando houver publicação, backup externo ou hospedagem (LGPD, arts. 33–36; Res. CD/ANPD nº 19/2024).

## 7. Direitos dos titulares

Nos termos do art. 18 da LGPD, o titular pode solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informações sobre compartilhamentos e revogação de consentimento quando essa for a base legal.

Solicitações devem ser enviadas para **[canal]**. O prazo de resposta completa é de até 15 dias, observado o art. 19, II, e eventual regime jurídico aplicável ao controlador.

## 8. Cookies

O sistema utiliza cookie técnico HttpOnly para manter a sessão autenticada. Não foram identificados, no código auditado, cookies de marketing ou analytics. Qualquer nova categoria deverá ser informada antes de sua ativação.

## 9. Crianças e adolescentes

O MemoryDoc é uma aplicação administrativa interna, não é destinado a crianças ou adolescentes e não será disponibilizado para esse público. O controlador deve manter controles de acesso e regras de uso compatíveis com essa finalidade. Caso o escopo do produto mude, a aplicabilidade da LGPD, art. 14, e da Lei nº 15.211/2025 deverá ser reavaliada antes da mudança.

## 10. Segurança e incidentes

Adotamos controle de acesso por função, hash de senhas, sessões protegidas, validação de entradas, limitação de tentativas de login, cabeçalhos de segurança e restrição de links a HTTPS. O controlador manterá processo de resposta a incidentes e avaliará comunicações à ANPD e aos titulares conforme a LGPD, art. 48, e a Res. CD/ANPD nº 15/2024.

## 11. Alterações

Alterações materiais em finalidades, bases legais, compartilhamentos, transferências ou retenção serão refletidas em nova versão desta política e comunicadas por canal adequado.

## 12. Contato — ainda não institucionalizado

- Controlador: [confirmar]
- Encarregado: [confirmar]
- Canal de titulares: [confirmar]
- ANPD: https://www.gov.br/anpd

Não há contato institucional oficial definido neste MVP. Os campos acima precisam ser preenchidos antes da publicação.

## Histórico

- v1.0-draft — 2026-11-08: primeira versão para revisão jurídica e validação operacional.
