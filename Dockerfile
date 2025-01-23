FROM ghcr.io/puppeteer/puppeteer:21.7.0

USER root

# Установка дополнительных зависимостей
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    xauth \
    && rm -rf /var/lib/apt/lists/*

# Установка Xvfb
RUN printf '#!/bin/sh\nXvfb :99 -screen 0 1024x768x16 &\nexport DISPLAY=:99\n' > /docker-entrypoint.sh \
    && chmod +x /docker-entrypoint.sh

# Установка рабочей директории
WORKDIR /app

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm install

# Копирование остальных файлов
COPY . .

# Установка переменных окружения
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV DISPLAY=:99

# Открытие порта
EXPOSE 10000

# Запуск приложения через entrypoint скрипт
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
