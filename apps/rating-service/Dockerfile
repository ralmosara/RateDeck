FROM node:20-alpine
WORKDIR /app
# Mock dockerfile for rating service
COPY apps/rating-service/package.json ./
RUN npm install
COPY apps/rating-service ./
RUN npm run build
CMD ["npm", "run", "start"]
