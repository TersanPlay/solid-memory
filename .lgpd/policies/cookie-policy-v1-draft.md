# Política de Cookies — MemoryDoc

**Versão**: v1.0-draft  
**Data do rascunho**: 2026-11-08  
**Vigência**: após revisão jurídica e publicação

> Este documento é um rascunho técnico. O controlador, o Encarregado, o canal oficial e a revisão jurídica ainda não foram definidos no MVP.

## 1. O que são cookies

Cookies são pequenos arquivos ou identificadores armazenados no navegador para permitir o funcionamento de uma aplicação, manter uma sessão ou lembrar determinadas informações.

## 2. Cookie utilizado pelo MemoryDoc

O MemoryDoc utiliza o cookie técnico `folio_session` exclusivamente para manter a sessão de usuários autenticados.

| Cookie | Finalidade | Categoria | Duração | Acesso |
|---|---|---|---|---|
| `folio_session` | Manter a autenticação e proteger o acesso às áreas internas | Necessário/estritamente funcional | Sessão, com expiração operacional configurável | Apenas pelo servidor; `HttpOnly` |

Esse cookie utiliza `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção. O valor não deve ser registrado em logs nem acessado por JavaScript da aplicação.

## 3. O que não utilizamos no MVP

No código auditado não foram identificados cookies de marketing, publicidade comportamental, analytics, rastreamento ou SDKs de terceiros para monitoramento de navegação.

O MemoryDoc também não acessa nem analisa o conteúdo de links documentais informados pelos usuários, incluindo links para Google Drive, OneDrive, Dropbox ou serviços semelhantes.

## 4. Consentimento

O cookie de sessão é necessário para prestar o serviço autenticado e não é utilizado para finalidade opcional. Por isso, este MVP não ativa cookies opcionais nem apresenta um banner de consentimento para marketing ou analytics.

A aplicação disponibiliza um banner informativo e um gerenciador de preferências. As preferências são salvas localmente no navegador para lembrar a escolha do titular. Como não existem categorias opcionais ativas no MVP, as opções de analytics e marketing aparecem como indisponíveis e não instalam cookies.

Se forem adicionados cookies não necessários, o controlador deverá revisar a finalidade, a base legal, a informação ao titular, o mecanismo de recusa e a revogação do consentimento antes da ativação.

## 5. Como desabilitar cookies

O titular pode bloquear ou remover cookies nas configurações do navegador ou reabrir o gerenciador de preferências pelo banner enquanto a escolha ainda não tiver sido registrada. A remoção do cookie de sessão encerrará o acesso autenticado e poderá impedir o uso das áreas internas do MemoryDoc.

## 6. Alterações e contato

Qualquer nova categoria de cookie deverá ser documentada antes da ativação e refletida nesta política.  
Controlador: **[confirmar]**  
Encarregado/canal: **[confirmar]**

Esta política não substitui a Política de Privacidade nem representa declaração de conformidade. O MVP ainda depende de definição institucional e revisão jurídica.

## Referências

- [LGPD — Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Guia da ANPD sobre cookies e proteção de dados pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais)
