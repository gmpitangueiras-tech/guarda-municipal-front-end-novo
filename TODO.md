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
- [x] A consulta da interface filtra Guardas para registros próprios ou com participação ativa; Supervisor/Administrador podem ver a equipe. As políticas RLS existentes foram mantidas sem alteração.
- [x] Atualização e falha de rede não apagam a lista já carregada; estado offline e pendência de sincronização são textuais, sem expor mensagens livres de erro ou prometer escrita/sincronização offline que esta etapa não implementa.
- [x] O detalhe desta etapa é limitado a resumo operacional não sensível; dados de envolvidos, anexos detalhados, histórico completo, aprovações e retificações permanecem protegidos e não são apresentados como funcionalidades concluídas.
- [x] “Nova ocorrência” continua abrindo o fluxo de criação operacional existente enquanto criação/edição e persistência offline não forem entregues nesta tela.
- [x] A tela não altera tabelas, políticas RLS ou registros Supabase; consulta somente colunas necessárias ao cartão e à paginação.
- [ ] Alinhar e aprovar uma migration RLS server-side para separar Guarda (criou/participação ativa), Supervisor (equipe) e Administrador (global), validando a compatibilidade com o aplicativo legado e a definição de “equipe”.
