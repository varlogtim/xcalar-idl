FROM node:argon
MAINTAINER Xcalar Inc. <support@xcalar.com>

RUN useradd -m -s /bin/bash node
RUN mkdir -p /app
WORKDIR /app

COPY package.json /app
RUN npm install

COPY . /app
EXPOSE 12124

USER node

CMD [ "npm", "cache clean" ]
CMD [ "npm", "start" ]
