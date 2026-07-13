const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Store connected clients
const clients = new Map();

// SSE endpoint for real-time notifications
router.get('/stream', authMiddleware.verifyToken, authMiddleware.isAdmin, (req, res) => {
  const adminId = req.user.id;
  const clientId = `${adminId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`);
  const heartbeat = setInterval(() => {
    if (res.destroyed || res.writableEnded) return;
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25000);
  
  // Add client to map
  clients.set(clientId, res);
  
  // Remove client on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    if (!res.writableEnded) res.end();
    console.log(`Admin ${adminId} disconnected from notification stream`);
  });
  
  console.log(`Admin ${adminId} connected to notification stream`);
});

// Broadcast notification to all connected admins
function broadcastNotification(data) {
  clients.forEach((client, clientId) => {
    if (client.destroyed || client.writableEnded) {
      clients.delete(clientId);
      return;
    }

    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      clients.delete(clientId);
    }
  });
}

// Export broadcast function for use in other modules
module.exports.broadcastNotification = broadcastNotification;
module.exports.router = router;
