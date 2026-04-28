import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initWebSocketServer } from "./lib/websocket.js";

// 'dev' is a boolean (true/false) telling Next.js if we are in development mode
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";

/**
 * PORT CONFIGURATION
 * process.env.PORT: The port provided by your hosting provider (like Railway/AWS)
 * "3000": The fallback if no environment variable exists
 * 10: The 'radix'. Ensures the string is parsed as a Base-10 decimal number.
 */
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize the Next.js application instance
const app = next({ dev, hostname, port });

// The 'handle' function is what Next.js uses to render your pages and API routes
const handle = app.getRequestHandler();

/**
 * app.prepare() starts the Next.js compiler/builder.
 * This is an 'Async' operation, so we use .then() to wait for it to finish.
 */
app.prepare()
  .then(() => {
    // 1. Create the base Node.js HTTP Server
    // This server will receive EVERY request (Web pages, APIs, and WebSockets)
    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        
        // Hand the request over to Next.js to do its magic
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("❌ Error occurred handling", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });

    /**
     * 2. INITIALIZE WEBSOCKETS
     * We pass the 'server' instance into our socket logic.
     * This allows the WebSocket server to 'hijack' the HTTP connection
     * when it sees a 'Upgrade: websocket' header.
     */
    initWebSocketServer(server);

    /**
     * 3. SERVER ERROR HANDLING
     * We listen for the 'error' event on the server itself.
     * This catches issues like 'EADDRINUSE' (Port 3000 is already taken).
     */
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use. Please close the other app.`);
      } else {
        console.error("❌ Server Error:", err);
      }
      process.exit(1); // Shut down the process safely
    });

    /**
     * 4. START LISTENING
     * This is the moment your app actually goes live on your computer.
     */
    server.listen(port, () => {
      console.log(
        `\n🚀 Neura Engine Online` +
        `\n------------------------` +
        `\nMode:  ${dev ? "Development" : "Production"}` +
        `\nURL:   http://${hostname}:${port}` +
        `\nSocket: ${dev ? "ws" : "wss"}://${hostname}:${port}\n`
      );
    });
  })
  .catch((err) => {
    // This catches errors that happen DURING the app.prepare() stage
    console.error("💥 Failed to start Neura server:", err);
    process.exit(1);
  });