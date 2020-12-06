# 1inch pathfinder notificator
### Description

The telegram bot which allows users to get notifications about token prices from 1inch pathfinder service.

If user waits for the pair rate then user gets notification from the bot instead of check it himself.

Stand with bot example: `@exampleBot` - https://t.me/exampleBot

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
   Syntax: `/list`
- `/add` - add task for notification
   Syntax: `/add <from_token> <to_token> <amount> <min_result>`
   **from_token** - token address or symbol which you want to exchange
   **to_token** - token address or symbol which you want to recieve
   **amount** - amount of from_token which you want to exchange
   **min_result** - minimum amount of to_token which you want to recieve
- `/help` - print commands and descriptions
  
