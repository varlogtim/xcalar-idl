FROM node:boron
MAINTAINER Xcalar Inc. <support@xcalar.com>

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app
RUN npm install

COPY . /app
EXPOSE 12124

CMD [ "npm", "cache clean" ]
CMD [ "npm", "start" ]
