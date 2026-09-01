FROM node:22-slim

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm install
RUN npm install --prefix frontend

COPY . .

RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
