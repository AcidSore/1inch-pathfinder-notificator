# 1inch pathfinder notificator
### Description

The telegram bot which allows users to get notifications about token prices from 1inch pathfinder service.

If user waits for the pair rate then user gets notification from the bot instead of check it himself.

Stand with bot example: `@pathfinder_notificator_bot` - https://t.me/pathfinder_notificator_bot

### Start bot
1. Create database, it may be empty (without any tables)
2. Create `.env` file, see example file: `.env.example`
3. You can start bot with docker or docker-compose: 
   ```
   # docker-compose up -d
   ```
   or start it with nodejs:
   ```
   # source .env
   # cd src
   # npm i
   # node bot.js
   ```

### Commands
The following bot commands are available:
- `/start` - start bot and getting the greeting
- `/stop` - stop bot
- `/list` - list all tasks for notifications which are added in the chat, also user can delete a task
- `/add` - add task for notification<br>
   Syntax: `/add <from_token> <to_token> <amount> <min_result>`<br>
   **from_token** - token address or symbol which you want to exchange<br>
   **to_token** - token address or symbol which you want to recieve<br>
   **amount** - amount of from_token which you want to exchange<br>
   **min_result** - minimum amount of to_token which you want to recieve<br>
   Examples:<br>
   - `/add eth usdt 1.5 1000`
   - `/add 0x6b175474e89094c44da98b954eedeac495271d0f usdt 1 1.2`
- `/help` - print commands and descriptions
  
