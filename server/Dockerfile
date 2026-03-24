# Wrapper Dockerfile para estrutura canônica server/
# Imagem oficial continua definida em Dockerfile.backend na raiz.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm ci
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
