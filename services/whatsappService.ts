import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const handleIncomingMessage = async (
  phoneNumberId: string,
  from: string,
  messageBody: string
) => {
  try {
    // Сохраняем входящее сообщение в Firebase
    await addDoc(collection(db, 'whatsapp_messages'), {
      phoneNumberId,
      from,
      message: messageBody,
      timestamp: serverTimestamp(),
      type: 'incoming'
    });

    // Здесь можно добавить логику для автоматических ответов
    console.log('Incoming message saved:', {
      phoneNumberId,
      from,
      messageBody
    });
  } catch (error) {
    console.error('Error saving incoming message:', error);
    throw error;
  }
};
