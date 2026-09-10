# Telegram Bot Foundation

Modular starter structure for a Telegram bot built with `node-telegram-bot-api`.

## Features

- Mock JSON database for users
- `/start` flow with language selection
- Arabic main menu with reply keyboard
- Admin-only placeholder commands
- Service placeholders for all main menu buttons

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example`

3. Start the bot:

```bash
npm start
```

## Environment Variables

- `BOT_TOKEN`: Telegram bot token
- `ADMIN_IDS`: Comma-separated Telegram user IDs for admins
- `GRIZZLY_API_KEY`: Grizzly SMS API key
- `HERO_SMS_API_KEY`: Hero SMS API key

## Deploy On Render (Free Web Service)

1. In Render, create a new service from this repo using `Blueprint` (it reads `render.yaml` automatically).
2. Open the service page, then go to:
   - `Environment` -> `Environment Variables`
3. Add these keys exactly:
   - `BOT_TOKEN`
   - `ADMIN_IDS`
   - `GRIZZLY_API_KEY`
   - `HERO_SMS_API_KEY` (or `HERO_API_KEY`)
   - `HERO_BASE_URL` (optional if you use default)
   - `LOG_CHANNEL_ID` (optional)
   - `ACTIVATIONS_CHANNEL_ID` (optional)
4. Keep SMM disabled for now by leaving:
   - `SMM_API_URL` empty
   - `SMM_API_KEY` empty
5. Deploy service.

Health URL after deploy:
- `https://YOUR-SERVICE.onrender.com/`
- It should return: `I am alive`
