FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev --no-audit --no-fund
COPY server.js ./
COPY lib ./lib
USER node
ENV HOST=0.0.0.0 PORT=8788 ENABLE_CARRIER_OPERATIONS=false
EXPOSE 8788
CMD ["node", "server.js"]
