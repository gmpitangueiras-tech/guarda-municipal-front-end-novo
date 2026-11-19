# TODO

## Cartões de boletins na tela inicial — concluído
- [x] Mostrar uma miniatura pequena da primeira foto anexada ao boletim.
- [x] Apresentar o tipo do boletim com tipografia legível e refinada.
- [x] Exibir localização, data e hora, status, gravidade, GM que criou e GM de apoio.

## Cartões de abordagens de pessoas e veículos na tela inicial — concluído
- [x] Mostrar uma miniatura pequena da primeira foto anexada à abordagem.
- [x] Exibir tipo, localização, data e hora, fase ou situação, GM que criou e GM de apoio.

## Privacidade das fotos dos cartões — concluído
- [x] Manter os anexos no bucket privado e não transformar os caminhos armazenados em links públicos.
- [x] Carregar a miniatura com a sessão autenticada e usar somente uma URL local temporária no navegador.

## Modal de validação do login — concluído
- [x] Mostrar a animação de login como um modal enquanto o backend valida o acesso.
- [x] Deixar o restante da tela opaco/atenuado para dar destaque à animação e informar ao usuário o que está acontecendo.

## Nome de guerra nos cartões do dashboard — concluído
- [x] Nos cartões de “Últimas Ocorrências”, “Últimas Abordagens de Pessoas” e “Últimas Abordagens de Veículos”, apresentar o GM que criou e o GM que apoiou no formato “GM” + apelido cadastrado pelo guarda.

## Refinamento visual e abertura dos detalhes dos cards — concluído
- [x] Nos cards das três abas, destacar o tipo do registro com capitalização natural; nos boletins, apresentar também o número e um selo textual de status.
- [x] Manter a miniatura da primeira foto anexada; quando não houver foto, mostrar um placeholder visual consistente.
- [x] Organizar localização e data/hora para leitura rápida, truncando endereços longos sem perder a informação principal.
- [x] Exibir gravidade nos boletins e fase/situação nas abordagens, sem depender apenas da cor para comunicar o status.
- [x] Manter GM criador e GM de apoio legíveis, em hierarquia visual secundária.
- [x] Tornar o card inteiro acionável por toque e teclado para abrir os detalhes disponíveis, sem exibir dados pessoais desnecessários nem publicar links das fotos.

## Central de Notificações responsiva — concluído
- [x] Reutilizar uma única central ao abrir pelo sino do cabeçalho e por Mais → Notificações.
- [x] No celular, apresentar a central como painel quase em tela cheia; no desktop, como painel lateral/modal responsivo.
- [x] Exibir contador de não lidas, filtros Todas/Não lidas/Operacionais/Sistema e ação para marcar todas como lidas.
- [x] Agrupar notificações por Hoje, Ontem, Esta semana e Anteriores, com ícones e cores por tipo.
- [x] Permitir abrir a notificação, marcá-la automaticamente como lida e alternar individualmente o estado de leitura.
- [x] Tratar carregamento, estado vazio, erro de conexão e atualização ao abrir/recuperar a conexão.

## Refinamento visual da Central de Notificações — concluído
- [x] Diferenciar visualmente avisos urgentes, de atenção e informativos, reservando vermelho para rejeições ou falhas.
- [x] Simplificar o cabeçalho e apresentar um resumo de não lidas, operacionais e avisos do sistema.
- [x] Manter filtros horizontais compactos, com nomenclatura curta e contadores.
- [x] Reorganizar o cartão para priorizar tipo, título, mensagem, horário e ação “Ver detalhes”.
- [x] Exibir “Marcar como lida” somente em avisos não lidos e um estado discreto para avisos já lidos.
- [x] Preservar a lista durante atualizações subsequentes, usando indicador leve em vez de esconder os avisos.
- [x] Usar gaveta lateral no desktop e painel inferior/quase tela cheia no celular.

## Central operacional de Ocorrências — interface concluída
- [x] O cabeçalho mostra “Ocorrências”, contagem dos registros visíveis, indicador online/offline, botão “Atualizar”, voltar para o painel e ação destacada “Nova ocorrência”.
- [x] O resumo apresenta contagens de Rascunhos, Pendentes, Em andamento e Finalizadas, respeitando o escopo de acesso do perfil.
- [x] Os filtros rápidos são Todas, Minhas, Pendentes e Finalizadas; o filtro inicial é Minhas para Guarda Municipal e Todas da equipe para Supervisor/Administrador.
- [x] Os filtros avançados cobrem período, status, gravidade, tipo de ocorrência, local, GM responsável, registros com retificação e pendências de sincronização.
- [x] A lista aplica busca, filtros, ordenação e paginação incremental no Supabase; não carrega todas as ocorrências de uma vez; mantém estados de carregamento, vazio, erro e tentativa novamente.
- [x] Cada cartão mostra tipo, número do BO ou temporário, local, data/hora, status textual, gravidade, GM responsável e de apoio quando disponíveis, estado e tentativas de sincronização e miniatura privada quando existir.
- [x] A lista não mostra CPF, nomes completos de envolvidos ou outros dados pessoais; nomes operacionais de GM são apelidos, nunca nomes completos por fallback.
- [x] As miniaturas continuam em bucket privado, carregadas com a sessão autenticada e renderizadas apenas por URL blob temporária; nenhuma URL pública de armazenamento é criada.
- [x] A consulta da interface filtra Guardas para registros próprios ou com participação ativa; Supervisor/Administrador podem ver a equipe. As policies de leitura da lista permanecem separadas e inalteradas; as permissões de escrita de anexos são ampliadas apenas pela migration aditiva deste fluxo.
- [x] Atualização e falha de rede não apagam a lista já carregada; estado offline e pendência de sincronização são textuais, sem expor mensagens livres de erro ou prometer escrita/sincronização offline que esta etapa não implementa.
- [x] O detalhe desta etapa é limitado a resumo operacional não sensível; dados de envolvidos, anexos detalhados, histórico completo, aprovações e retificações não são consultados nem exibidos nesta tela e não são apresentados como funcionalidades concluídas.
- [x] O antigo atalho de “Nova ocorrência” não leva ao BO Mobile; neste incremento, ele foi substituído pela escolha nativa entre BO Rápido e BO Completo, descrita nas seções abaixo.
- [x] A Central de Ocorrências continua consultando apenas as colunas necessárias ao cartão e à paginação. O novo fluxo de gravação é separado, usa a RPC autenticada e a migration aditiva, e não reescreve registros históricos.
- [ ] Alinhar e aprovar uma migration RLS server-side geral para separar Guarda (criou/participação ativa), Supervisor (equipe) e Administrador (global), validando a compatibilidade com o aplicativo legado e a definição de “equipe”.

## BO Rápido nativo — concluído
- [x] Ao abrir “Nova ocorrência”, oferecer escolha clara entre BO Rápido e BO Completo, mantendo o cabeçalho compartilhado, menu fixo e identidade azul institucional; nenhum fluxo deve navegar ao BO Mobile.
- [x] No BO Rápido, gravidade `baixa`, `media`, `alta` ou `critica`, GM responsável e GM de apoio ativo diferente são obrigatórios; o atendimento registra tipo, início, local e relato; a forma de solicitação corresponde ao fluxo rápido do BO Mobile.
- [x] O BO Rápido é criado como `modo_criacao='rapido'` e permanece documento “BO incompleto / A complementar” até ser concluído; a situação do atendimento continua derivada independentemente pelo servidor.
- [x] Permitir selecionar fotos opcionais no BO Rápido; arquivos ficam no bucket privado `anexos`, nunca em link público, e não são obrigatórios para registrar.

## BO Completo nativo — concluído
- [x] Preservar o fluxo completo do BO Mobile: origem/solicitante, dados do evento e local, equipe, envolvidos, relato, anexos e revisão com horário de término.
- [x] Gravidade e equipe mínima são obrigatórias; o responsável é o guarda autenticado ou, para administrador, um GM ativo escolhido; o GM de apoio é outro guarda/supervisor ativo já cadastrado.
- [x] O relato completo exige pelo menos 10 caracteres; o encerramento é obrigatório e não pode anteceder o início; o BO externo, quando existir, é digitado manualmente sem integração externa.
- [x] Permitir cadastrar zero ou mais envolvidos. Para cada um, tipo e nome completo são obrigatórios; CPF, telefone e observações são opcionais. Dados pessoais permanecem fora da listagem operacional.
- [x] Oferecer assinatura manuscrita opcional para cada envolvido, vinculada ao ID daquela pessoa e salva com o registro; a assinatura não é requisito para concluir. O conteúdo da assinatura fica em tabela sem leitura direta por clientes autenticados.
- [x] Permitir anexos opcionais (imagem, vídeo ou PDF) no BO Completo; ausência de anexos nunca impede o salvamento.

## Persistência segura de filhos e mídia — concluído
- [x] A gravação server-side salva ocorrência, equipe e envolvidos pela RPC; imagens de assinatura manuscrita são gravadas na tabela privada sem SELECT autenticado, mantendo `ocorrencias.assinaturas` intacta para compatibilidade.
- [x] A autorização de upload/metadados é restrita ao criador ativo do novo registro e ao caminho vinculado ao UUID da ocorrência; Storage RLS valida MIME conforme o modo e o tamanho real, sem ampliar policies de leitura nem criar URL pública.
- [x] Respeitar o limite do bucket (1 MiB servidor) e a validação RLS; reduzir imagens quando possível, recusar arquivos não aceitos antes do envio e explicar o motivo.
- [x] Se um anexo falhar depois de o BO ser criado, informar que o BO já foi gravado, permitir tentar enviar os arquivos pendentes sem criar outro BO e nunca declarar sincronização concluída sem confirmação do servidor.
- [x] Não alterar o repositório BO Mobile, não reescrever ocorrências históricas e não usar service-role no navegador.


## Refinamento visual de equipe, gravidade e chips — concluído
- [x] Guarda/Supervisor vê o GM responsável preenchido pela sessão autenticada, somente leitura; Administrador mantém a seleção de um GM ativo segundo a regra atual do backend.
- [x] O campo GM de apoio é busca acessível por teclado, sugere apenas perfis ativos a partir de três caracteres e não oferece o GM responsável como próprio apoio.
- [x] A equipe não repete instruções longas; campos opcionais do solicitante ficam recolhidos por padrão nos dois modos.
- [x] Removidos rótulos/avisos redundantes e botões “Agora” desnecessários; envolvidos e anexos não repetem os títulos da etapa.
- [x] Gravidade baixa/média/alta/crítica recebe cores semânticas mais fortes e indicação visual de seleção; situação, documento e gravidade têm bordas e fundos mais legíveis na Central, dashboard e formulário.
- [x] Etapas ativas, cartões de modo e campos de equipe usam o azul institucional; chips de status/gravidade recebem tamanho legível e contraste suficiente.


## Detalhe completo e exportação PDF — aba Boletins — concluída
- [x] Somente os cards da aba Boletins/Minhas ocorrências, até os seis registros recentes já exibidos, mostram ações separadas “Ver completo” e PDF; Pessoas e Veículos não recebem os botões nesta iteração.
- [x] “Ver completo” abre um modal acessível, adaptado a celular, carrega o registro completo sem alterar dados e apresenta identificação, natureza/subtipo/classificação/gravidade, horários e situação, endereço/coordenadas, solicitante, equipe, relato, envolvidos/dados complementares, assinaturas, histórico/retificação e cancelamento quando houver.
- [x] Os anexos são navegáveis num carrossel dentro do modal, sem fechar e abrir uma imagem por vez; imagens usam URLs blob autenticadas revogadas ao trocar/fechar, e PDFs/vídeos usam URLs assinadas de curta duração (5 minutos), nunca URLs públicas permanentes.
- [x] A função server-side de detalhe autoriza perfil ativo pelo escopo do servidor: Supervisor/Administrador conforme `gm_is_manager()`, Guarda se criou o registro ou tem participação ativa; ocorrência excluída ou sem acesso não é devolvida, e o cliente não escolhe a identidade/perfil usada na autorização.
- [x] Assinaturas manuscritas continuam sem SELECT direto para authenticated; a RPC validada retorna somente as assinaturas do registro autorizado, inclusive assinaturas legadas já persistidas quando disponíveis.
- [x] O botão PDF gera arquivo baixável sem modificar a ocorrência e reproduz o padrão oficial efetivo do BO Mobile (`js/pdf-export.js`): A4 retrato/mm, brasão institucional, cabeçalho/rodapé em todas as páginas, número e data de emissão, paginação total, sequência de seções e tipografia Courier/Times.
- [x] O PDF contém os campos completos existentes, equipe, solicitante, envolvidos, assinaturas, relato, controle de versões/retificação/cancelamento e as fotos com legenda; vídeos e PDFs anexados são listados, não embutidos, conforme a exportação legada.
- [x] Nome do arquivo segue o exportador oficial: `Ocorrencia_<numero_ocorrencia-ou-Rascunho>_<data Brasil AAAA-MM-DD>.pdf`; carregamento, falta de mídia e falha de RPC/exportação têm estados claros, sem exibir URL permanente do Storage.
- [x] A feature não altera o BO Mobile, as abas de Pessoas/Veículos, os dados históricos ou as policies de leitura já existentes; nenhuma ocorrência operacional é criada para teste.


## Verificação técnica — concluída
- [x] `npm run build` gera os bundles de produção; o módulo PDF é carregado sob demanda.
- [x] `npx tsc --noEmit` conclui sem erros de tipos.
- [x] `npm audit --omit=dev` não reporta vulnerabilidades nas dependências de produção.


## Refinamento do cartão de Boletins — concluído
- [x] O cartão abre o detalhe completo ao tocar/clicar no seu conteúdo; o botão PDF é a única ação separada e não fica aninhado no controle que abre detalhes.
- [x] Priorizar tipo e número do registro; informar explicitamente quando a gravidade, data/hora ou numeração ainda não estiverem disponíveis.
- [x] Exibir de forma independente e com rótulos explícitos os estados Atendimento (situação), Documento (completude do BO) e Sincronização (transporte), usando os valores/descrições calculados pela RPC server-side `gm_ocorrencias_itens` e não inferências do campo legado `status`.
- [x] As cores são reforço semântico, com texto/labels para informar o estado; manter leitura responsiva em mobile e desktop sem afetar Pessoas e Veículos.
- [x] O botão PDF mostra “Gerando PDF…” durante o processamento, “PDF baixado.” no sucesso e orientação clara de erro; feedback temporário é anunciado acessivelmente, sem exibir nome de arquivo longo.
- [x] A mudança permanece na aba Boletins; detalhe completo, padrão oficial do PDF e repositório BO Mobile são preservados.


## Validação do refinamento de cartões — concluída
- [x] `npm run build` e `npx tsc --noEmit` concluíram sem erros após a implementação.
- [ ] Confirmar visualmente no preview os estados do cartão em desktop/mobile após a atualização.
- [ ] `git diff --check`, commit/push e publicação Pages após finalizar validações.
