# Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY frontend ./frontend

WORKDIR /app/frontend

RUN npm install && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
