# Plano — Central de Ocorrências e registro nativo

## Escopo e decisões

O repositório é `gmpitangueiras-tech/guarda-municipal-front-end-novo`, React/TypeScript/Vite, publicado em GitHub Pages e conectado ao Supabase `wswezvcxfljzcttpqkch`. Preservar a rota hash `#/ocorrencias/nova`, sessão autenticada, `AuthenticatedAppShell` (cabeçalho e menu fixo compartilhados) e identidade azul institucional já adotada no novo app. Não alterar o repositório ou fluxo do BO Mobile.

A tela de registro começa com a escolha explícita entre **BO Rápido** e **BO Completo**, reproduzindo o fluxo do BO Mobile, mas usando componentes React acessíveis, identidade azul e os contratos server-side atuais. O modo do documento (`modo_criacao`) e a situação do atendimento (`data_hora_encerramento`) permanecem eixos distintos: um BO Rápido fica “BO incompleto / A complementar” até ser concluído; sua situação vem do servidor, não de uma inferência do modo. O BO Completo exige horário de início, horário de término e relato mínimo de 10 caracteres.

Em ambos os modos, gravidade (`baixa`, `media`, `alta`, `critica`) e equipe mínima são obrigatórias. O responsável é o guarda autenticado, exceto perfis administrativos que precisam selecionar um GM ativo; o GM de apoio deve ser outro usuário ativo cadastrado. BO externo é apenas identificação manual, sem integração externa.

O modo rápido mantém os campos operacionais essenciais e aceita fotos opcionais. O completo inclui solicitante, local detalhado, BO externo, envolvidos (tipo e nome obrigatórios; CPF, telefone e observações opcionais), assinatura manuscrita opcional vinculada a cada pessoa, relato e anexos opcionais. Os dados pessoais não entram na lista operacional. Envolvidos e assinaturas são gravados dentro da transação da RPC autenticada; as imagens de assinatura ficam em tabela privada sem permissão de leitura direta para perfis autenticados, sem conteúdo na coluna legada `ocorrencias.assinaturas`. Arquivos permanecem no bucket privado `anexos`, nunca por URL pública.

A migration Supabase é aditiva: estende a RPC existente sem mudar sua assinatura pública nem remover dados, cria uma tabela privada de assinaturas e autorização estreita para anexos do autor no novo BO logo após a criação, e conserva as policies de leitura atuais. A aplicação web não usa service-role. O bucket privado existente limita cada arquivo a 1 MiB; políticas RLS também validam tamanho e MIME por modo, imagens são reduzidas quando necessário, e tipos/tamanhos não aceitos são recusados antes do envio. Não alterar o limite nem a allowlist global do bucket compartilhado com o BO Mobile.

## Design

- **Movimento visual:** interface operacional cívica, continuidade do shell e da identidade azul institucional (`#173f68`), sem retornar ao verde do fluxo legado.
- **Princípios:** foco no trabalho em campo, hierarquia curta, dados pessoais fora da listagem, mensagens honestas sobre o que foi salvo e controles confortáveis para toque.
- **Layout:** etapas enxutas, cartões de escolha dos modos, navegação progressiva e resumo final; primeiro celular, com conteúdo fluido em telas maiores.
- **Acessibilidade:** rótulos explícitos, erros associados aos campos, teclado e ponteiro suportados, assinatura em canvas de toque, fontes legíveis e alvos de ação de pelo menos 44px.
- **Interação:** estados do documento/atendimento continuam vindo do servidor; imagens selecionadas mostram nome, tipo e tamanho; anexos podem ser removidos antes de salvar; falha parcial de upload informa que o BO já foi gravado e não cria ocorrência duplicada ao tentar novamente.
- **Voz:** direta e operacional. Exemplos: “Escolha como registrar” / “A assinatura é opcional e ficará vinculada a esta pessoa.”

## Estrutura do projeto

- `client/src/pages/OcorrenciaNova.tsx`: seletor de modo e etapas de registro, usando o perfil e shell já existentes.
- `client/src/components/occurrences/SignaturePad.tsx`: captura opcional de assinatura para cada envolvido.
- `client/src/components/occurrences/OccurrenceAttachments.tsx`: seleção e apresentação de anexos locais, validação do limite do bucket e envio privado.
- `client/src/lib/ocorrencias.ts`: tipos de envolvidos/assinaturas, chamada da RPC de criação e persistência de anexos no Supabase.
- `client/src/index.css`: estilos novos escopados ao registro, alinhados ao azul institucional e às regras mobile.
- `supabase/migrations/20261118_bo_rapido_completo.sql`: validação transacional de envolvidos, tabela restrita de assinaturas e policies mínimas de MIME/tamanho para upload privado de anexos.
- `client/src/App.tsx` e `client/src/components/AuthenticatedAppShell.tsx`: manter a rota e o shell existente; sem alteração de navegação ou identidade compartilhada nesta entrega.

## Implementação

1. Refatorar o registro nativo em dois modos explícitos, mantendo gravidade e equipe obrigatórias e a separação entre documento e situação.
2. Implementar dados de envolvidos e captura manuscrita opcional no modo completo; permitir anexos opcionais no rápido e no completo, com persistência privada e mensagens de estado sem duplicar BO.
3. Aplicar a migration aditiva à RPC/policies do Supabase, usando o cliente autenticado e respeitando as regras RLS e o limite atual do bucket.
4. Atualizar os critérios do projeto, executar o build Vite e revisar o diff sem criar registros operacionais de teste; preservar `bomobile` intacto.
5. Preparar a entrega no GitHub conforme a autorização existente de publicação direta do frontend novo.
