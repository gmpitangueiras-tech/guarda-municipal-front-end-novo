# Plano — Central operacional de Ocorrências

## Escopo e integração

Implementar a Etapa 1 do briefing anexado diretamente no repositório `gmpitangueiras-tech/guarda-municipal-front-end-novo`: lista operacional responsiva com filtros, indicadores, cartões, paginação, estados de carregamento/erro/vazio e acesso restrito por sessão ao projeto Supabase ativo `wswezvcxfljzcttpqkch`. O app já possui login, sessão, perfis, cliente Supabase, bucket privado e dashboard; essas estruturas serão reutilizadas. Nenhuma migração ou alteração de dados/schema será feita.

A página ficará protegida pelo fluxo de sessão já usado por `App.tsx`, acessível em `#/ocorrencias`, e será adicionada à navegação interna a partir do dashboard. As consultas selecionam somente colunas necessárias à listagem; não buscam CPF, nomes completos ou dados de envolvidos. O recorte por papel é aplicado na consulta da lista: Guardas veem registros próprios ou com participação ativa; Supervisor/Administrador podem ver a equipe. As políticas RLS existentes continuam ativas, sem mudança nesta entrega; a lista não deve ser tratada como substituta de uma política server-side por papel. Filtros, ordenação e paginação serão aplicados no banco. Fotos serão lidas no bucket privado com a sessão autenticada e exibidas somente via blob URL temporária.

A ação “Nova ocorrência” continuará direcionando ao fluxo operacional existente (`/bomobile/#nova-ocorrencia`), pois criação, edição e fila offline pertencem às etapas seguintes. Retificações, auditoria completa e detalhes com dados pessoais não serão simulados como disponíveis; o detalhe desta entrega exibirá apenas o resumo não sensível.

## Design

- **Movimento visual:** ferramenta cívica operacional, seguindo o painel já existente no app.
- **Princípios:** leitura rápida em campo; estados sempre com texto e cor; ações confortáveis para toque; privacidade por padrão.
- **Cores:** floresta (`#123b35`) e verde profundo para identidade e ações; fundos claros `#f4f6f2`/branco para leitura; âmbar (`#efa94b`) para atenção e sincronização pendente; vermelho reservado para cancelamento/falha.
- **Layout:** hierarquia vertical mobile-first, cabeçalho compacto, resumo horizontal rolável, filtros de uma mão e cartões com informação operacional em primeiro plano; em telas largas, largura contida e mais espaço para metadados.
- **Elementos assinatura:** pequenos acentos de cantos assimétricos já usados no app; badges de estado com rótulo explícito; brasão institucional existente.
- **Interação/animação:** atualização preserva resultados existentes; carregamento incremental e feedback imediato; transições discretas, respeitando `prefers-reduced-motion`.
- **Tipografia:** Inter/system-ui e os níveis já estabelecidos no front-end; números e datas em hierarquia secundária.
- **Essência e voz:** central de operação de Pitangueiras para GM em campo e supervisão; objetiva, segura e institucional. Exemplo: “Registros da equipe” / “Atualizar lista”.
- **Marca/logotipo:** manter o brasão oficial existente; cor proprietária da interface continua o verde-floresta `#123b35`.

## Estrutura do projeto

- `client/src/App.tsx`: interpretar e proteger a rota `#/ocorrencias` e reutilizar o perfil autenticado.
- `client/src/pages/Occurrences.tsx`: interface, filtros, resumo, cartões, estados, detalhe resumido e paginação.
- `client/src/lib/occurrences.ts`: consultas paginadas ao Supabase, contagens, enrichments de GM e referência segura de foto.
- `client/src/components/PrivateRecordThumbnail.tsx`: reutilizar download autenticado de miniaturas privadas.
- `client/src/pages/Dashboard.tsx`, `DashboardActivity.tsx`, `DashboardBottomNav.tsx`: apontar o atalho de ocorrências para a nova rota sem alterar as telas de abordagens e notificações.
- `client/src/index.css`: estilos adicionais escopados à central, mantendo regras já existentes.
- `.env.production`: chave publicável correta para o projeto Supabase ativo; nenhuma chave administrativa.
- `TODO.md`: critérios explícitos de aceitação e estado de entrega.

## Implementação

1. Adicionar rota hash protegida e navegação interna.
2. Criar camada de leitura paginada com escopo por papel, filtros de banco e seleção mínima de colunas.
3. Implementar estados visuais e layout adaptável com resumo, cartões, filtros e ação de atualização.
4. Confirmar alinhamento da chave publishable com o projeto ativo e manter a RLS intacta.
5. Instalar dependências pelo lockfile, executar TypeScript e build de produção, revisar diff e salvar a alteração no GitHub conforme autorização dada.
