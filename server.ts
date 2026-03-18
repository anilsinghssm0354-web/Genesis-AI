import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Public Chat Logic
  const publicMessages: any[] = [];
  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_public_chat", (userData) => {
      activeUsers.set(socket.id, { ...userData, id: socket.id });
      socket.emit("previous_messages", publicMessages);
      io.emit("user_count_update", activeUsers.size);
      io.emit("system_message", {
        id: Date.now().toString(),
        role: "system",
        content: `${userData.name} joined the chat`,
        timestamp: new Date(),
      });
    });

    socket.on("send_public_message", (messageData) => {
      const newMessage = {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date(),
        reactions: {},
      };
      publicMessages.push(newMessage);
      if (publicMessages.length > 100) publicMessages.shift();
      io.emit("new_public_message", newMessage);
    });

    socket.on("typing_status", (isTyping) => {
      const user = activeUsers.get(socket.id);
      if (user) {
        socket.broadcast.emit("user_typing", {
          userId: socket.id,
          userName: user.name,
          isTyping
        });
      }
    });

    socket.on("add_reaction", ({ messageId, reaction }) => {
      const message = publicMessages.find(m => m.id === messageId);
      if (message) {
        if (!message.reactions) message.reactions = {};
        if (!message.reactions[reaction]) message.reactions[reaction] = [];
        
        const user = activeUsers.get(socket.id);
        if (user && !message.reactions[reaction].includes(user.name)) {
          message.reactions[reaction].push(user.name);
          io.emit("reaction_updated", { messageId, reactions: message.reactions });
        }
      }
    });

    socket.on("disconnect", () => {
      const user = activeUsers.get(socket.id);
      if (user) {
        io.emit("system_message", {
          id: Date.now().toString(),
          role: "system",
          content: `${user.name} left the chat`,
          timestamp: new Date(),
        });
        activeUsers.delete(socket.id);
        io.emit("user_count_update", activeUsers.size);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
