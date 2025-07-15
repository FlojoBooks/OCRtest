# Gebruik Node 18 als base image
FROM node:18 as build

# Maak werkdirectory
WORKDIR /app

# Kopieer hele monorepo
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Kopieer frontend build naar backend
RUN rm -rf /app/backend-node/build && cp -r /app/frontend/build /app/backend-node/build

# Installeer backend dependencies
WORKDIR /app/backend-node
RUN npm install --production

# Start backend
CMD ["npm", "start"] 