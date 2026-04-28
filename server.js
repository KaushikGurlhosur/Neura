import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initWebSocketServer } from "./lib/websocket.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

// Initialize Next.js in development or production mode
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 1. Create the standard Node.js HTTP Server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Allow Next.js to handle all standard HTTP/API requests
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // 2. Attach the WebSocket engine to this server
  // This shares the same port (3000) for both Web and Sockets
  initWebSocketServer(server);

  // 3. Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(
      `> Neura Engine Started` +
      `\n> Mode: ${dev ? "Development" : "Production"}` +
      `\n> Local: http://${hostname}:${port}`
    );
  });
});