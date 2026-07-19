# Tahap 1: Build aplikasi React/Vite
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Tahap 2: Jalankan Node backend server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js ./

# Gunakan port 80 secara default agar Dokploy tidak perlu diubah konfigurasinya
ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
