FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

COPY docker/entrypoint.sh ./entrypoint.sh 

RUN chmod +x ./entrypoint.sh

RUN npm install

COPY . .

EXPOSE 5500

CMD ["npm", "run", "start:dev"]
