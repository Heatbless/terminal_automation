# STAGE 1: Build the React Application
FROM node:20-alpine as BUILD_IMAGE

WORKDIR /app

# Copy package files and install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the Vite app (creates /dist folder)
RUN npm run build

# STAGE 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output from the previous stage
COPY --from=BUILD_IMAGE /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (created in step 2)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
