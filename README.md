# Guarda Municipal — Front-end interno

Novo front-end mobile-first da Guarda Municipal de Pitangueiras/PR. Este projeto é separado do aplicativo antigo, que continua em uso durante a evolução das telas operacionais.

A aplicação usa o projeto Supabase existente da GM e contém autenticação, recuperação de senha, painel inicial e a central de Ocorrências (`#/ocorrencias`). A lista é paginada e filtra os resultados conforme o perfil autenticado, continua sujeita à RLS existente, evita dados pessoais de envolvidos e usa anexos privados; esta entrega não altera políticas ou dados do banco. A criação continua no fluxo operacional existente até a implementação da etapa de criação/edição.

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
