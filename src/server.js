const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let client = null;
let qrCodeData = '';
let isInitialized = false;
let initializationError = null;
let initializationStarted = false;

// Инициализация WhatsApp клиента
const initializeWhatsAppClient = async () => {
    if (initializationStarted) return;
    initializationStarted = true;

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: './whatsapp-auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-software-rasterizer',
                '--ignore-certificate-errors',
                '--disable-infobars'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            defaultViewport: {
                width: 1280,
                height: 720
            }
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR Code received');
        try {
            qrCodeData = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error('Error generating QR code:', err);
        }
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        isInitialized = true;
        initializationError = null;
    });

    client.on('auth_failure', (err) => {
        console.error('Authentication failed:', err);
        isInitialized = false;
        initializationError = err.message;
    });

    client.on('disconnected', (reason) => {
        console.log('Client was disconnected:', reason);
        isInitialized = false;
        initializationError = reason;
        // Попытка переподключения через 5 секунд
        setTimeout(() => {
            initializeWhatsAppClient();
        }, 5000);
    });

    try {
        console.log('Starting WhatsApp client initialization...');
        await client.initialize();
        console.log('WhatsApp client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
        initializationError = error.message;
        // Попытка переинициализации через 5 секунд
        setTimeout(() => {
            initializationStarted = false;
            initializeWhatsAppClient();
        }, 5000);
    }
};

// Endpoints
app.get('/qr', (req, res) => {
    if (qrCodeData) {
        res.json({ qr: qrCodeData });
    } else {
        res.status(404).json({ 
            error: 'QR Code not available yet',
            isInitialized,
            initializationError 
        });
    }
});

app.get('/status', (req, res) => {
    res.json({ 
        status: isInitialized ? 'CONNECTED' : 'DISCONNECTED',
        error: initializationError,
        clientInitialized: !!client
    });
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    if (!client || !isInitialized) {
        return res.status(503).json({ 
            error: 'WhatsApp client not initialized',
            initializationError 
        });
    }

    try {
        const formattedNumber = number.replace(/\D/g, '') + '@c.us';
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        whatsapp: {
            initialized: isInitialized,
            error: initializationError,
            clientExists: !!client
        }
    });
});

const PORT = process.env.PORT || 10000;

// Запускаем сервер сразу
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Инициализируем WhatsApp клиент через 5 секунд после запуска сервера
setTimeout(() => {
    console.log('Starting delayed WhatsApp client initialization...');
    initializeWhatsAppClient();
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
