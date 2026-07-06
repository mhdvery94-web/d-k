const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Store connected clients
const clients = new Map();

// SSE endpoint for real-time notifications
router.get('/stream', authMiddleware.verifyToken, authMiddleware.isAdmin, (req, res) => {
  const adminId = req.user.id;
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`);
  
  // Add client to map
  clients.set(adminId, res);
  
  // Remove client on disconnect
  req.on('close', () => {
    clients.delete(adminId);
    console.log(`Admin ${adminId} disconnected from notification stream`);
  });
  
  console.log(`Admin ${adminId} connected to notification stream`);
});

// Broadcast notification to all connected admins
function broadcastNotification(data) {
  clients.forEach((client, adminId) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Export broadcast function for use in other modules
module.exports.broadcastNotification = broadcastNotification;
module.exports.router = router;
