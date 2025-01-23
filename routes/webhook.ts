import express from 'express';
import { handleIncomingMessage } from '../services/whatsappService';

const router = express.Router();

// Токен верификации для webhook
const VERIFY_TOKEN = 'your_verification_token';

// GET запрос для верификации webhook
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// POST запрос для получения уведомлений
router.post('/', async (req, res) => {
  const { body } = req;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from;
      const messageBody = body.entry[0].changes[0].value.messages[0].text.body;

      try {
        await handleIncomingMessage(phoneNumberId, from, messageBody);
        res.sendStatus(200);
      } catch (error) {
        console.error('Error handling message:', error);
        res.sendStatus(500);
      }
    } else {
      res.sendStatus(200);
    }
  } else {
    res.sendStatus(404);
  }
});

export const webhookRouter = router;
