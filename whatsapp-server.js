const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'WhatsApp Server is running' });
});

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    }
});

let qrCodeData = '';
let clientState = 'DISCONNECTED';

client.on('qr', async (qr) => {
    console.log('QR Code received');
    try {
        qrCodeData = await qrcode.toDataURL(qr);
        clientState = 'DISCONNECTED';
    } catch (err) {
        console.error('Error generating QR code:', err);
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
    clientState = 'CONNECTED';
    qrCodeData = '';
});

client.on('authenticated', () => {
    console.log('Client is authenticated!');
    clientState = 'CONNECTED';
    qrCodeData = '';
});

client.on('auth_failure', (err) => {
    console.error('Authentication failed:', err);
    clientState = 'DISCONNECTED';
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    clientState = 'DISCONNECTED';
    client.initialize().catch(err => {
        console.error('Failed to reinitialize client:', err);
    });
});

client.on('message', msg => {
    console.log('Message received:', msg.body);
});

app.get('/qr', (req, res) => {
    console.log('QR code requested. Status:', clientState, 'QR data exists:', !!qrCodeData);
    if (qrCodeData) {
        res.json({ qr: qrCodeData });
    } else {
        if (clientState === 'DISCONNECTED') {
            client.initialize().catch(err => {
                console.error('Failed to initialize client:', err);
            });
        }
        res.status(404).json({ error: 'QR Code not available yet, please try again in a few seconds' });
    }
});

app.get('/status', (req, res) => {
    console.log('Status requested:', clientState);
    res.json({ 
        status: clientState
    });
});

app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
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

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
