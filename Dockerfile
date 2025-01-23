FROM node:18-slim

# Установка необходимых зависимостей
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      xvfb x11vnc xauth libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 \
      libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 \
      libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0 libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Установка Xvfb
RUN printf '#!/bin/sh\nXvfb :99 -screen 0 1024x768x16 &\nexport DISPLAY=:99\n' > /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копирование остальных файлов
COPY . .

# Установка переменных окружения
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV DISPLAY=:99

# Открытие порта
EXPOSE 10000

# Запуск приложения через entrypoint скрипт
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
