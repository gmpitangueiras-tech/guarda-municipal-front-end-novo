# Guarda Municipal — Front-end interno

Novo front-end mobile-first da Guarda Municipal de Pitangueiras/PR. Este projeto é separado do aplicativo antigo, que continua em uso pelos guardas durante a evolução desta versão.

A aplicação usa o mesmo projeto Supabase do sistema atual e contém apenas a interface de login nesta primeira etapa. A chave incluída em `.env.production` é uma chave publicável, própria para uso no navegador; nenhuma chave de serviço foi incluída.

## GitHub Pages

Após o primeiro deploy, o endereço será:

<https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/>

O deploy é automático a cada push na branch `main`, pelo workflow em `.github/workflows/deploy-pages.yml`.

## Teste local

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Se aparecer `injectQuery` em `@vite/client`, existe outro Vite antigo ocupando a porta 3000. No PowerShell, execute `netstat -ano | findstr :3000`, finalize o PID com `Stop-Process -Id NUMERO_DO_PID -Force` e rode `npm run dev` novamente.
