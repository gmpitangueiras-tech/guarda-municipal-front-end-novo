# Plano — Central de Ocorrências e registro nativo

## Escopo e decisões

O repositório é `gmpitangueiras-tech/guarda-municipal-front-end-novo`, React/TypeScript/Vite, publicado em GitHub Pages e conectado ao Supabase `wswezvcxfljzcttpqkch`. Preservar a rota hash `#/ocorrencias/nova`, sessão autenticada, `AuthenticatedAppShell` (cabeçalho e menu fixo compartilhados) e identidade azul institucional já adotada no novo app. Não alterar o repositório ou o fluxo do BO Mobile.

A tela de registro começa com a escolha explícita entre **BO Rápido** e **BO Completo**, reproduzindo o fluxo do BO Mobile, mas usando componentes React acessíveis, identidade azul e os contratos server-side atuais. O modo do documento (`modo_criacao`) e a situação do atendimento (`data_hora_encerramento`) permanecem eixos distintos: um BO Rápido fica “BO incompleto / A complementar” até ser concluído; sua situação vem do servidor, não de uma inferência do modo. O BO Completo exige horário de início, horário de término e relato mínimo de 10 caracteres.

Em ambos os modos, gravidade (`baixa`, `media`, `alta`, `critica`) e equipe mínima são obrigatórias. Conforme confirmado pelo usuário, Guarda/Supervisor têm o responsável pré-preenchido e bloqueado na sessão atual; Administrador continua escolhendo um GM ativo, preservando a regra do backend. O GM de apoio deve ser outro usuário ativo cadastrado e é selecionado por busca com sugestões a partir do terceiro caractere. BO externo é apenas identificação manual, sem integração externa.

O modo rápido mantém os campos operacionais essenciais e aceita fotos opcionais. O completo inclui solicitante e contatos opcionais em seção recolhida, local detalhado, BO externo, envolvidos (tipo e nome obrigatórios; CPF, telefone e observações opcionais), assinatura manuscrita opcional vinculada a cada pessoa, relato e anexos opcionais. Os dados pessoais não entram na lista operacional. Envolvidos e assinaturas são gravados dentro da transação da RPC autenticada; as imagens de assinatura ficam em tabela privada sem permissão de leitura direta para perfis autenticados, sem conteúdo na coluna legada `ocorrencias.assinaturas`. Arquivos permanecem no bucket privado `anexos`, nunca por URL pública.

A migration Supabase é aditiva: estende a RPC existente sem mudar sua assinatura pública nem remover dados, cria uma tabela privada de assinaturas e autorização estreita para anexos do autor no novo BO logo após a criação, e conserva as policies de leitura atuais. A aplicação web não usa service-role. O bucket privado existente limita cada arquivo a 1 MiB; políticas RLS também validam tamanho e MIME por modo, imagens são reduzidas quando necessário, e tipos/tamanhos não aceitos são recusados antes do envio. Não alterar o limite nem a allowlist global do bucket compartilhado com o BO Mobile.

## Design

- **Identidade visual:** azul institucional (`#173f68`) no shell, passos, foco e cartões; gravidade, situação e documento usam tons semânticos de contraste mais forte, não apenas pastéis.
- **Princípios:** foco no trabalho em campo, hierarquia curta, dados pessoais fora da listagem, mensagens honestas sobre o que foi salvo e controles confortáveis para toque.
- **Layout:** escolha enxuta dos modos, navegação progressiva, campos opcionais recolhidos e eliminação de instruções repetidas; primeiro celular, com conteúdo fluido em telas maiores.
- **Acessibilidade:** rótulos explícitos, erros associados aos campos, teclado e ponteiro suportados, autocomplete de apoio acessível, assinatura em canvas de toque, fontes legíveis e alvos de ação de pelo menos 44px.
- **Interação:** estados do documento/atendimento continuam vindo do servidor; imagens selecionadas mostram nome, tipo e tamanho; anexos podem ser removidos antes de salvar; falha parcial de upload informa que o BO já foi gravado e não cria ocorrência duplicada ao tentar novamente.
- **Voz:** direta e operacional, sem dicas duplicadas; solicitante opcional não ocupa espaço até ser expandido.

## Estrutura do projeto

- `client/src/pages/OcorrenciaNova.tsx`: seletor de modo, equipe e etapas de registro sob o shell existente.
- `client/src/pages/Occurrences.tsx`: cards, filtros e conclusão de BO com tons de gravidade.
- `client/src/components/DashboardActivity.tsx`: cards do dashboard com selos semânticos de gravidade/status.
- `client/src/components/occurrences/SignaturePad.tsx`: captura opcional de assinatura para cada envolvido.
- `client/src/components/occurrences/OccurrencePersonEditor.tsx`: cadastro enxuto de pessoas relacionadas e assinaturas opcionais.
- `client/src/components/occurrences/OccurrenceAttachments.tsx`: seleção e apresentação de anexos locais, validação do limite do bucket e envio privado.
- `client/src/lib/ocorrencias.ts`: tipos de envolvidos/assinaturas, chamada da RPC de criação e persistência de anexos no Supabase.
- `client/src/index.css`: estilos novos escopados ao azul institucional e às regras mobile, incluindo cards/selos de maior contraste e autocomplete.
- `supabase/migrations/20261118_bo_rapido_completo.sql`: validação transacional de envolvidos, tabela restrita de assinaturas e policies mínimas de MIME/tamanho para upload privado de anexos.
- `client/src/App.tsx` e `client/src/components/AuthenticatedAppShell.tsx`: manter a rota e o shell existente; sem alteração de navegação ou identidade compartilhada nesta entrega.

## Implementação

1. Refatorar o registro nativo em dois modos explícitos, mantendo gravidade e equipe obrigatórias e a separação entre documento e situação.
2. Implementar dados de envolvidos e captura manuscrita opcional no modo completo; permitir anexos opcionais no rápido e no completo, com persistência privada e mensagens de estado sem duplicar BO.
3. Aplicar a migration aditiva à RPC/policies do Supabase, usando o cliente autenticado e respeitando as regras RLS e o limite atual do bucket.
4. Refinar a equipe para pré-preencher/bloquear o responsável da sessão Guarda/Supervisor, manter seleção de GM pelo Administrador e buscar apoio por autocomplete acessível após três caracteres.
5. Remover repetições e dar mais contraste aos cards e chips de gravidade, situação e documento nas telas do formulário, da Central e do dashboard; compilar e verificar o diff sem criar registros operacionais de teste.
6. Preservar `bomobile` intacto e preparar a entrega no GitHub conforme a autorização existente de publicação direta do frontend novo.


## Iteração do dashboard — detalhe completo e PDF somente em Boletins

A alteração abrange apenas os cartões de ocorrências da aba “Boletins” (ou “Ocorrências” no perfil Guarda); as abas Pessoas e Veículos não recebem novas ações. Cada cartão de BO terá uma ação explícita “Ver completo” e outra de PDF. O diálogo carrega um payload completo por RPC dedicada, com campos liberados por allowlist e autorização no servidor usando `gm_can_manage_occurrence(p_id)`: perfil ativo, autor ou participante com vínculo ativo; Supervisor/Administrador, conforme `gm_is_manager()`. O UUID recebido não é autoridade e o cliente não envia perfil/papel para decidir acesso.

O retorno da RPC reúne dados da ocorrência, solicitante, equipe, envolvidos, assinaturas e metadados/caminhos de anexos, sem abrir `SELECT` direto na tabela privada de assinaturas. A galeria do diálogo navega entre anexos sem fechar/reabrir, carrega imagens autenticadas e apresenta PDFs/vídeos no próprio carrossel quando o navegador suporta, revogando URLs temporárias no fechamento. Mantém-se o bucket existente; nenhum link público ou alteração de leitura é introduzido.

O módulo PDF reproduz o layout efetivamente desenhado em `/home/ubuntu/bomobile/js/pdf-export.js`, sem alterar o repositório legado: A4 retrato em mm, margens 14 mm, brasão 21 × 21 mm, cabeçalho/rodapé repetidos com paginação `PÁGINA n DE total`, filetes, rótulos Courier e narrativa Times, tabelas compactas, equipe, local, solicitante, classificação, relato, envolvidos, assinaturas, histórico/retificação e galeria fotográfica com legendas. Anexos de imagem entram no corpo; vídeos/PDFs não são embutidos, alinhado ao exportador oficial legado, mas seus nomes/tipos são informados no bloco de anexos. O nome de download segue `Ocorrencia_<numero-ou-Rascunho>_<AAAA-MM-DD>.pdf`.

Estrutura dessa iteração: `client/src/components/dashboard/OccurrenceDetailDialog.tsx` (estado/carrossel/dialog), `client/src/lib/dashboard.ts` (tipos e chamada RPC), `client/src/lib/occurrence-pdf.ts` (gerador jsPDF/AutoTable), `client/src/components/DashboardActivity.tsx` e `client/src/index.css` (ações somente na aba Boletins/visual), `client/public/assets/logo-guarda-pdf.png` (cópia local do brasão legado) e `supabase/migrations/20261118_dashboard_ocorrencia_detalhe.sql` (RPC de leitura autorizada).


## Refinamento visual dos cartões de Boletins

O cartão de ocorrência prioriza tipo/número e abre o detalhe completo ao ativar o corpo inteiro; o PDF fica como a única ação separada. Gravidade e dados ausentes têm texto explícito, sem chips de fundo. Atendimento, Documento e Sincronia usam rótulos independentes em uma linha textual simples, separada por pontos discretos, com apenas cor tipográfica semântica; os valores vêm exclusivamente da RPC `gm_ocorrencias_itens` e nunca são inferidos do status legado. A composição quebra naturalmente em telas estreitas, sem empilhar cartões ou caixas de estado.

O PDF mostra “Gerando PDF…” enquanto trabalha, confirmação curta de sucesso ou erro, e feedback acessível que expira temporariamente. O nome de download oficial permanece inalterado. A mudança fica restrita aos cartões de Boletins e preserva o modal, o PDF e os cartões de Pessoas/Veículos.

Estrutura: RPC consumida por `client/src/lib/dashboard.ts`; markup em `client/src/components/DashboardActivity.tsx`; estilos responsivos escopados em `client/src/index.css`; critérios de aceite em `TODO.md`.
