# Build bosqichi
FROM node:20.19-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# React/Vite loyihani build qilish
RUN npm run build

# Xizmat ko'rsatish bosqichi (Nginx)
FROM nginx:1.25.3-alpine

# Nginx konfiguratsiyasini o'rnatamiz
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build natijasini Nginx public katalogiga o'tkazish
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
