import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  markConversationRead,
  getAvailableCandidates,
} from '../controllers/chat.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/start', startConversation);
router.patch('/conversations/:conversationId/read', markConversationRead);
router.get('/candidates', getAvailableCandidates);

export default router;
