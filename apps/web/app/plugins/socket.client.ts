import { io, type Socket } from 'socket.io-client';

// Single shared Socket.IO connection (client-only).
// Sends the stored admin JWT in the handshake so the server can authorize
// admin:* events and send the full (unredacted) state to the Game Master.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const token = import.meta.client ? localStorage.getItem('aofa_token') || '' : '';
  const socket: Socket = io(config.public.socketUrl as string, {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token },
  });

  return {
    provide: { socket },
  };
});
