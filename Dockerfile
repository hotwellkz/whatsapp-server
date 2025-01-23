FROM ghcr.io/puppeteer/puppeteer:21.7.0

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "whatsapp-server.js"]
