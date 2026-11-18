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
