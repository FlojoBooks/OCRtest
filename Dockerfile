# Gebruik Node 18 als base image
FROM node:18 as build

# Maak werkdirectory
WORKDIR /app

# Kopieer hele monorepo
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Controleer of de build map bestaat
RUN if [ ! -d /app/frontend/build ]; then echo "Frontend build is niet gelukt!"; exit 1; fi

# Kopieer frontend build naar backend
RUN rm -rf /app/backend-node/build && cp -r /app/frontend/build /app/backend-node/build

# Installeer backend dependencies
WORKDIR /app/backend-node
RUN npm install --production

# Start backend
CMD ["npm", "start"] 