FROM node:latest

WORKDIR /src/app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node","app","--prod"]
