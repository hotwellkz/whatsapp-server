import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { webhookRouter } from './routes/webhook';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Маршруты для webhook
app.use('/api/webhook', webhookRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
