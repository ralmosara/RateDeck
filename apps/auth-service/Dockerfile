FROM node:20-alpine
WORKDIR /app
# Mock dockerfile for auth service
COPY apps/auth-service/package.json ./
RUN npm install
COPY apps/auth-service ./
RUN npm run build
CMD ["npm", "run", "start"]
