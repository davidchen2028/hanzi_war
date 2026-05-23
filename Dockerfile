# 构建阶段
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 运行阶段：Nginx 静态站，监听 Zeabur 注入的 PORT（默认 8080）
FROM nginx:1.27-alpine

# 本地 docker run 默认值；Zeabur 部署时会用控制台/平台注入的 PORT 覆盖
ENV PORT=8080

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /custom-entrypoint.sh
RUN chmod +x /custom-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1'

ENTRYPOINT ["/custom-entrypoint.sh"]
