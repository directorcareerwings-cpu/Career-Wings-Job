"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All chat routes require authentication
router.use(auth_1.authenticateToken);
router.get('/conversations', chat_controller_1.getConversations);
router.get('/conversations/:conversationId/messages', chat_controller_1.getMessages);
router.post('/conversations/:conversationId/messages', chat_controller_1.sendMessage);
router.post('/start', chat_controller_1.startConversation);
router.patch('/conversations/:conversationId/read', chat_controller_1.markConversationRead);
router.get('/candidates', chat_controller_1.getAvailableCandidates);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map