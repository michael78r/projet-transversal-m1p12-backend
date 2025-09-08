
// This service will handle real-time notifications using Socket.io

let io;

const init = (httpServer) => {
  io = require('socket.io')(httpServer);
  
  io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
  
  return io;
};

const sendNotification = (userId, event, data) => {
  if (io) {
    io.to(userId).emit(event, data);
  }
};

module.exports = {
  init,
  sendNotification,
};
