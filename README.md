# Caronas Sonhar Acordado

App para organizar caronas entre voluntários e participantes da ONG Sonhar Acordado.
Funciona no navegador do celular e pode ser instalado na tela inicial, sem loja de aplicativos.

## O que o app faz

- **Caronas:** lista das próximas caronas por dia, com busca e reserva de vaga.
- **Oferecer:** o motorista publica dia, horário, saída, destino e número de vagas.
- **Pedir:** quem não achou carona manda um pedido para a coordenação.
- **Minhas:** vagas reservadas, caronas oferecidas e pedidos feitos.
- **Confirmação no dia:** na véspera e no dia, o passageiro confirma se vai mesmo ou libera a vaga.
- **WhatsApp:** botões que abrem o WhatsApp no número da pessoa com a mensagem pronta (atraso, pedir confirmação, cancelamento).
- **Coordenação:** pedidos para encaixar, confirmações pendentes, ocupação dos carros, resumo para colar no grupo e gestão de quem é da coordenação.
- Atualiza sozinho quando alguém reserva, confirma ou avisa atraso.

## Como colocar no ar (uma vez só, cerca de 30 minutos)

Tudo abaixo usa planos gratuitos.

### 1. Criar o banco de dados (Supabase)

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project**. Escolha a região **South America (São Paulo)**.
2. No menu da esquerda, abra **SQL Editor**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication > Sign In / Providers > Email**, desligue **Confirm email**.
   Assim as pessoas entram logo depois de criar a conta, sem depender de e-mail de confirmação.
   (O envio de e-mails do plano gratuito é bem limitado. Se um dia quiserem confirmação por e-mail ou "esqueci minha senha", configurem um SMTP próprio em **Authentication > Emails**.)
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**. Elas vão no passo 2.

### 2. Publicar o site (Vercel)

1. Crie uma conta em [vercel.com](https://vercel.com) entrando com o GitHub.
2. Clique em **Add New > Project** e escolha o repositório **CARONA**.
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = a Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = a chave anon public
4. Clique em **Deploy**. Em um minuto o app estará num endereço como `carona.vercel.app`.
5. Volte ao Supabase, em **Authentication > URL Configuration**, e coloque esse endereço em **Site URL**.

### 3. Virar coordenação

1. Abra o app, crie sua conta e preencha o cadastro.
2. No Supabase, em **SQL Editor**, rode (trocando o e-mail):

   ```sql
   update public.profiles set is_coord = true
     where id = (select id from auth.users where email = 'seu-email@exemplo.com');
   ```

3. Recarregue o app: a aba **Coordenação** aparece. A partir daí, você mesmo pode tornar outras pessoas coordenação pelo app, em "Ver pessoas cadastradas".

### 4. Instalar no celular

Abra o endereço do app no celular.
- **Android (Chrome):** menu ⋮ > **Adicionar à tela inicial**.
- **iPhone (Safari):** botão Compartilhar > **Adicionar à Tela de Início**.

## Privacidade (LGPD)

No primeiro acesso, cada pessoa autoriza o uso de nome, celular e bairro para organizar as caronas.
Esses dados só aparecem para quem tem conta no app. Os pedidos de carona só são vistos pela própria pessoa e pela coordenação.
Para apagar os dados de alguém, a coordenação pode remover o usuário em **Supabase > Authentication > Users** (o perfil e as reservas são apagados juntos).

## Para quem for mexer no código

Feito com [React](https://react.dev) + [Vite](https://vite.dev) e [Supabase](https://supabase.com) (banco Postgres, login e atualização ao vivo).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # abre em http://localhost:5173
npm run build                # gera a versão de produção em dist/
```

Organização:

- `supabase/schema.sql`: tabelas, regras de acesso (quem pode ver e mudar o quê) e validações, como não reservar carona lotada.
- `src/App.jsx`: login, carregamento dos dados e abas.
- `src/pages/`: uma tela por aba.
- `src/components/RideCard.jsx`: o cartão de carona, com reserva, confirmação e botões de WhatsApp.
- `src/lib.js`: datas, telefones e links do WhatsApp.

### Próximos passos possíveis

- Lembretes automáticos pelo WhatsApp (exige a API oficial do WhatsApp Business, que é paga por conversa).
- Caronas de volta e caronas que se repetem toda semana.
- Login com Google.
