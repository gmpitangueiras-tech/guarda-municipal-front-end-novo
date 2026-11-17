# Autenticação — Guarda Municipal de Pitangueiras

## Como o login funciona

O usuário entra com **CPF + data de nascimento** (`DDMMAAAA`). Quem criou uma **senha pessoal** entra com CPF + senha.

O front-end não usa `signInWithPassword` direto: ele chama a Edge Function `legacy-login`, que
confere o segredo no banco (`gm_verify_login_secret`), garante a conta no Supabase Auth e devolve a sessão.

| Etapa | Onde acontece |
| --- | --- |
| Validação do CPF e do segredo | RPC `gm_verify_login_secret` (bcrypt ou data de nascimento) |
| Rate limit por CPF e por IP | RPC `gm_record_login_attempt` / `gm_clear_login_attempt` |
| Emissão da sessão | Edge Function `legacy-login` (`signInWithPassword` interno) |
| Perfil funcional | RPC `gm_my_profile` |

## Primeiro acesso

`#/primeiro-acesso` → RPC `gm_complete_first_access_profile`. O usuário informa nome, CPF, **data de nascimento** e **e-mail**
(o e-mail é obrigatório porque é para ele que o link de redefinição vai) e escolhe:

- **Usar minha data de nascimento** → `senha_hash = bcrypt(DDMMAAAA)`, `senha_personalizada = false`;
- **Criar uma senha pessoal** → `senha_hash = bcrypt(senha)`, `senha_personalizada = true`.

A tela é aberta automaticamente quando `precisa_primeiro_acesso` volta `true`
(`data_nascimento` nula, `primeiro_acesso = true` ou e-mail ausente/inválido).

## Redefinição de senha

`#/redefinir` → CPF + e-mail cadastrado → Edge Function `password-reset-request`:

1. valida CPF (11 dígitos) e formato do e-mail;
2. aplica rate limit por CPF e por IP;
3. exige que o e-mail digitado **seja igual** ao do cadastro (mensagem única, sem revelar se o CPF existe);
4. garante a conta no Auth com o e-mail real;
5. envia o link e devolve `{ success: true, delivery: "supabase" | "custom" }`.

`#/redefinir-senha?token_hash=...` consome o token (`verifyOtp`), grava a nova senha
(RPC `gm_set_my_password` + `auth.updateUser`) e volta para o login.

### Modo A — envio pelo Supabase (padrão, sem chave extra)

Usa `resetPasswordForEmail`. O conteúdo do e-mail é o **template do painel**, então é preciso colar
[`email-templates/reset-password.html`](./email-templates/reset-password.html) em
**Authentication → Emails → Reset Password** e trocar o assunto para
`Redefinição de senha — Guarda Municipal de Pitangueiras`.

Checklist do painel (Authentication → URL Configuration):

- **Site URL**: `https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/`
- **Redirect URLs**: a mesma URL + `https://gmpitangueiras-tech.github.io/guarda-municipal-front-end-novo/#/redefinir-senha`

Sem esse ajuste o link do e-mail cai em `http://localhost:3000` (Site URL padrão do projeto).
O SMTP embutido do Supabase também limita o envio a poucos e-mails por hora
(`429: email rate limit exceeded`) — para uso real, configure SMTP próprio (Resend, SendGrid, Gmail etc.).

### Modo B — e-mail com identidade visual própria (recomendado)

Defina o secret `RESEND_API_KEY` no projeto (Edge Functions → Secrets). A função passa a:

- gerar o link com `generateLink` (`token_hash`), sem depender de `redirect_to`;
- montar o HTML de [`password-reset-request/email-template.ts`](./functions/password-reset-request/email-template.ts)
  (brasão, verde institucional `#123b35`, dourado `#efa94b`, aviso de segurança e versão texto);
- enviar pela API do Resend com o remetente de `MAIL_FROM` (padrão `Guarda Municipal de Pitangueiras <nao-responda@gm-pitangueiras.invalid>`).

Variáveis opcionais: `MAIL_FROM`, `SITE_URL` (padrão: a URL do Pages).

## Funções e RPCs publicadas

- `legacy-login` (v7) — login por CPF; devolve `session` + `usuario.precisa_primeiro_acesso`.
- `password-reset-request` (v2) — pedido de redefinição com rate limit e envio do e-mail.
- `gm_verify_login_secret(cpf, segredo)` — service_role apenas.
- `gm_set_my_password(senha)` — authenticated.
- `gm_complete_first_access_profile(...)` — authenticated, uma única vez por perfil.
- `gm_my_profile()` — authenticated, inclui `data_nascimento` e `senha_personalizada`.
