import { Router } from 'express';
import { db } from '../db';

const router = Router();

// Get conversations for a user
router.get('/conversations/:email', (req, res) => {
  try {
    const { email } = req.params;
    
    // Get all unique conversations (both as sender and recipient)
    const conversations = db.prepare(`
      SELECT 
        CASE 
          WHEN senderEmail = ? THEN recipientEmail
          ELSE senderEmail
        END as otherEmail,
        CASE 
          WHEN senderEmail = ? THEN recipientName
          ELSE senderName
        END as otherName,
        CASE 
          WHEN senderEmail = ? THEN recipientRole
          ELSE senderRole
        END as otherRole,
        MAX(createdAt) as lastMessageTime,
        (SELECT content FROM messages 
         WHERE (senderEmail = ? AND recipientEmail = CASE WHEN senderEmail = ? THEN recipientEmail ELSE senderEmail END)
            OR (recipientEmail = ? AND senderEmail = CASE WHEN senderEmail = ? THEN recipientEmail ELSE senderEmail END)
         ORDER BY createdAt DESC LIMIT 1) as lastMessage,
        COUNT(CASE WHEN recipientEmail = ? AND read = 0 THEN 1 END) as unreadCount
      FROM messages
      WHERE senderEmail = ? OR recipientEmail = ?
      GROUP BY otherEmail, otherName, otherRole
      ORDER BY lastMessageTime DESC
    `).all(email, email, email, email, email, email, email, email, email, email);
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages between two users
router.get('/messages/:email/:otherEmail', (req, res) => {
  try {
    const { email, otherEmail } = req.params;
    
    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE (senderEmail = ? AND recipientEmail = ?)
         OR (senderEmail = ? AND recipientEmail = ?)
      ORDER BY createdAt ASC
    `).all(email, otherEmail, otherEmail, email);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', (req, res) => {
  try {
    const {
      senderEmail,
      senderName,
      senderRole,
      recipientEmail,
      recipientName,
      recipientRole,
      content
    } = req.body;
    
    if (!senderEmail || !senderName || !senderRole || !recipientEmail || !recipientName || !recipientRole || !content) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const createdAt = new Date().toISOString();
    
    const result = db.prepare(`
      INSERT INTO messages (senderEmail, senderName, senderRole, recipientEmail, recipientName, recipientRole, content, read, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(senderEmail, senderName, senderRole, recipientEmail, recipientName, recipientRole, content, createdAt);
    
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/mark-read/:email/:otherEmail', (req, res) => {
  try {
    const { email, otherEmail } = req.params;
    
    db.prepare(`
      UPDATE messages
      SET read = 1
      WHERE recipientEmail = ? AND senderEmail = ? AND read = 0
    `).run(email, otherEmail);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

export default router;
