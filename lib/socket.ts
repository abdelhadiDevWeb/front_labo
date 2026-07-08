import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "./api-config";

/**
 * Same-origin Socket.io connection (proxied via Next.js in production).
 * Failures are non-fatal — realtime notifications are optional.
 */
export const connectSocket = (): Socket => {
  const socket = io(getSocketUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 3,
  });

  socket.on("connect_error", () => {
    // Avoid unhandled rejections; polling/API still works without socket.
  });

  return socket;
};
