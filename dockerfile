FROM node:14-alpine

RUN apk --no-cache add curl

USER node
ENV NODE_ENV development
WORKDIR /home/node/app
