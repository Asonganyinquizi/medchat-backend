FROM node:22-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 4003

# Start the application
# CMD ["npm", "start"]

# This runs migrations to create tables BEFORE starting your app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]