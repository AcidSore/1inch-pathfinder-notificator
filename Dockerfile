FROM node:10

RUN apt-get update -y && apt-get upgrade -y

WORKDIR /bot

COPY src/ /bot/

RUN npm i;

ENTRYPOINT ["/bin/sh", "-c", "node /bot/bot.js"]