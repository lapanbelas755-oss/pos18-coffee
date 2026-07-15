# Tahap 1: Build aplikasi React/Vite
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json dan install dependency
COPY package*.json ./
RUN npm install

# Copy seluruh file dan jalankan build
COPY . .
RUN npm run build

# Tahap 2: Setup server Nginx untuk melayani file static
FROM nginx:alpine

# Hapus konfigurasi default Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copy konfigurasi custom Nginx kita
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy hasil build dari tahap 1 ke folder Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
