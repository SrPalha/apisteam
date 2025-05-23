# Steam OAuth para Supabase (Vercel)

Este projeto permite que você vincule a conta Steam de um usuário ao perfil do Supabase usando login OAuth/OpenID, pronto para deploy no Vercel.

## Como funciona
- O usuário clica em "Vincular conta Steam" no seu site.
- É redirecionado para `/api/auth/steam` (Vercel), faz login Steam e autoriza.
- O backend salva o SteamID, nome e avatar no Supabase.
- O usuário é redirecionado de volta para o seu site.
- Não é possível desvincular pelo site, só removendo a autorização na Steam.

## Variáveis de ambiente necessárias (no Vercel)
- `SUPABASE_URL` = URL do seu projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = Service Role Key do Supabase (NUNCA exponha no frontend)
- `STEAM_API_KEY` = Sua Steam Web API Key
- `BASE_URL` = URL base do seu deploy Vercel (ex: https://steam-oauth-seuprojeto.vercel.app)

## Deploy
1. Faça upload da pasta `steam-oauth-vercel` para um novo projeto no Vercel.
2. Configure as variáveis de ambiente acima no painel do Vercel.
3. O endpoint de login será: `https://SEU-VERCEL/api/auth/steam?user_id=ID_DO_SUPABASE`

## Fluxo de uso
- No seu frontend, ao clicar em "Vincular conta Steam", redirecione para o endpoint acima, passando o `user_id` do Supabase logado.
- Após login, o usuário será redirecionado para `/profile` já com a Steam vinculada.

## Segurança
- O Service Role Key só é usado no backend (Vercel), nunca exponha no frontend.
- O usuário só pode vincular uma vez. Para desvincular, só removendo a autorização do app na Steam. 