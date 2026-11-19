# Guarda Municipal — Front-end interno

Novo front-end mobile-first da Guarda Municipal de Pitangueiras/PR. O repositório e a interface do BO Mobile permanecem intocados; a migration compartilhada do Supabase conserva a assinatura pública da RPC de registro.

A aplicação usa o projeto Supabase existente da GM e contém autenticação, recuperação de senha, painel inicial e a Central de Ocorrências (`#/ocorrencias`). O registro nativo oferece BO Rápido e BO Completo, com gravidade e equipe obrigatórias; o Completo inclui sete etapas, envolvidos, assinatura manuscrita opcional e anexos opcionais. A persistência usa RPC e sessão autenticada/RLS. As assinaturas manuscritas ficam em tabela privada sem leitura direta por clientes autenticados, e os anexos permanecem no bucket privado existente (limite server-side de 1 MiB por arquivo). A interface operacional não expõe dados pessoais de envolvidos na listagem. Na aba Boletins do painel inicial, “Ver completo” abre um modal responsivo com o registro, assinaturas e carrossel autenticado de anexos; a ação PDF exporta o documento no padrão visual oficial do BO Mobile. Pessoas e Veículos permanecem sem essas ações nesta iteração.

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` apontam para a URL e a chave **publishable** do Supabase, próprias para uso no navegador com RLS habilitada. Nenhuma chave administrativa/service-role é incluída. O fluxo de primeiro acesso continua consultando `public.usuarios` e exige complementação cadastral quando o perfil sinaliza primeiro acesso.

## GitHub Pages

O endereço publicado é:

<https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/>

O deploy é automático a cada push na branch `main`, pelo workflow em `.github/workflows/deploy-pages.yml`.

## Teste local

```bash
npm ci
npm run dev
```

Abra <http://localhost:3000>.

Se aparecer `injectQuery` em `@vite/client`, existe outro Vite antigo ocupando a porta 3000. No PowerShell, execute `netstat -ano | findstr :3000`, finalize o PID com `Stop-Process -Id NUMERO_DO_PID -Force` e rode `npm run dev` novamente.
