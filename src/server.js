const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
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

let qrCodeData = '';
let isInitialized = false;
let initializationError = null;

const initializeClient = async () => {
    try {
        console.log('Initializing WhatsApp client...');
        await client.initialize();
        isInitialized = true;
        initializationError = null;
        console.log('WhatsApp client initialized successfully');
    } catch (error) {
        console.error('Failed to initialize WhatsApp client:', error);
        isInitialized = false;
        initializationError = error.message;
        // Попытка переинициализации через 30 секунд
        setTimeout(initializeClient, 30000);
    }
};

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
});

client.on('message', msg => {
    console.log('Message received:', msg.body);
});

client.on('auth_failure', (err) => {
    console.error('Authentication failed:', err);
    isInitialized = false;
    // Попытка переинициализации при ошибке аутентификации
    setTimeout(initializeClient, 30000);
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    isInitialized = false;
    // Попытка переподключения при разрыве соединения
    setTimeout(initializeClient, 30000);
});

// Инициализируем клиент при старте
initializeClient();

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
        error: initializationError
    });
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    if (!isInitialized) {
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
            error: initializationError
        }
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
