import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../lib/response';
import { AppError } from '../lib/errors';
import { AuthenticatedRequest } from '../middleware/auth';
import { createNotification } from '../services/notification.service';

/**
 * Get all conversations for the authenticated user (Employer or Candidate)
 */
export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let whereClause: any = {};
    if (role === 'EMPLOYER') {
      const employer = await prisma.employer.findUnique({ where: { userId } });
      if (!employer) throw new AppError('Employer profile not found', 404);
      whereClause = { employerId: employer.id };
    } else if (role === 'CANDIDATE') {
      const candidate = await prisma.candidate.findUnique({ where: { userId } });
      if (!candidate) throw new AppError('Candidate profile not found', 404);
      whereClause = { candidateId: candidate.id };
    } else if (role === 'ADMIN') {
      whereClause = {}; // Admins can see all if needed
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        employer: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phone: true,
            designation: true,
            company: {
              select: {
                id: true,
                name: true,
                logo: true,
                industry: true,
              },
            },
          },
        },
        candidate: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
            currentRole: true,
            currentCompany: true,
            currentLocation: true,
            totalExperience: true,
            phone: true,
            resumeFile: true,
            candidateSkills: {
              select: {
                skill: { select: { name: true } },
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            workMode: true,
            jobType: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Compute unread message counts per conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          id: conv.id,
          employerId: conv.employerId,
          candidateId: conv.candidateId,
          jobId: conv.jobId,
          employer: conv.employer,
          candidate: conv.candidate,
          job: conv.job,
          lastMessage: conv.lastMessage || (conv.messages[0]?.message ?? ''),
          lastMessageAt: conv.lastMessageAt || conv.updatedAt,
          unreadCount,
        };
      })
    );

    sendSuccess(res, formatted);
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages inside a conversation and mark unread messages as read
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        employer: true,
        candidate: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Permission check
    if (
      req.user!.role !== 'ADMIN' &&
      conversation.employer.userId !== userId &&
      conversation.candidate.userId !== userId
    ) {
      throw new AppError('Unauthorized to view this conversation', 403);
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark unread messages sent by the other party as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    sendSuccess(res, {
      conversation,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new AppError('Message text is required', 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        employer: true,
        candidate: true,
      },
    });

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Permission check
    if (
      role !== 'ADMIN' &&
      conversation.employer.userId !== userId &&
      conversation.candidate.userId !== userId
    ) {
      throw new AppError('Unauthorized to post in this conversation', 403);
    }

    const trimmed = message.trim();

    // Create the message and update last message timestamp
    const [newMessage] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          senderRole: role,
          message: trimmed,
          isRead: false,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: trimmed,
          lastMessageAt: new Date(),
        },
      }),
    ]);

    // Send in-app notification to the other party
    const recipientUserId =
      userId === conversation.employer.userId
        ? conversation.candidate.userId
        : conversation.employer.userId;

    const senderName =
      role === 'EMPLOYER'
        ? `${conversation.employer.firstName} (${conversation.employer.designation || 'Recruiter'})`
        : `${conversation.candidate.firstName} ${conversation.candidate.lastName}`;

    createNotification(
      recipientUserId,
      'SYSTEM',
      `New message from ${senderName}`,
      trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed,
      role === 'EMPLOYER' ? '/employer/chat' : '/messages'
    ).catch(console.error);

    sendSuccess(res, newMessage, 'Message sent successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Start or get an existing conversation with a candidate (for employers)
 */
export const startConversation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { candidateId, jobId, initialMessage } = req.body;

    if (!candidateId) {
      throw new AppError('Candidate ID is required', 400);
    }

    const employer = await prisma.employer.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!employer) {
      throw new AppError('Employer profile not found', 404);
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }

    // Check if conversation already exists
    let conversation = await prisma.conversation.findUnique({
      where: {
        employerId_candidateId: {
          employerId: employer.id,
          candidateId: candidate.id,
        },
      },
    });

    const initialText = initialMessage?.trim();

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          employerId: employer.id,
          candidateId: candidate.id,
          jobId: jobId || null,
          lastMessage: initialText || 'Conversation started',
          lastMessageAt: new Date(),
        },
      });

      if (initialText) {
        await prisma.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: userId,
            senderRole: 'EMPLOYER',
            message: initialText,
          },
        });
      }
    } else if (initialText) {
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          senderRole: 'EMPLOYER',
          message: initialText,
        },
      });
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: initialText,
          lastMessageAt: new Date(),
          ...(jobId ? { jobId } : {}),
        },
      });
    }

    sendSuccess(res, conversation, 'Conversation ready');
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markConversationRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    sendSuccess(res, { success: true }, 'Conversation marked as read');
  } catch (error) {
    next(error);
  }
};

/**
 * Get potential candidates for initiating chat (applicants & platform candidates)
 */
export const getAvailableCandidates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const employer = await prisma.employer.findUnique({ where: { userId } });
    if (!employer) throw new AppError('Employer not found', 404);

    // Candidates who applied to any job of this employer
    const applications = await prisma.application.findMany({
      where: {
        job: { employerId: employer.id },
        deletedAt: null,
      },
      include: {
        candidate: {
          include: {
            candidateSkills: { include: { skill: true } },
          },
        },
        job: {
          select: { id: true, title: true },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 50,
    });

    // Also fetch recent candidates from the general pool
    const poolCandidates = await prisma.candidate.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        candidateSkills: { include: { skill: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const candidateMap = new Map();

    for (const app of applications) {
      if (app.candidate && !candidateMap.has(app.candidate.id)) {
        candidateMap.set(app.candidate.id, {
          ...app.candidate,
          appliedJob: app.job,
        });
      }
    }

    for (const c of poolCandidates) {
      if (!candidateMap.has(c.id)) {
        candidateMap.set(c.id, {
          ...c,
          appliedJob: null,
        });
      }
    }

    sendSuccess(res, Array.from(candidateMap.values()));
  } catch (error) {
    next(error);
  }
};
