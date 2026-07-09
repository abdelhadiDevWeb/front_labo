import { io, type Socket } from "socket.io-client";
import { getBaseUrl } from "@/lib/api-config";

/** Socket.io client — failures are non-fatal (catalog still loads via REST). */
export const createAppSocket = (): Socket =>
  io(getBaseUrl(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 3,
    timeout: 10000,
  });
