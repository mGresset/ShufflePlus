FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
RUN mkdir -p /app/data/spaces
ENV PORT=8787 HOST=0.0.0.0 SHUFFLEPLUS_DATA_DIR=/app/data
EXPOSE 8787
CMD ["node", "server.js"]
