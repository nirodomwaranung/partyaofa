import { io, type Socket } from 'socket.io-client';

// Single shared Socket.IO connection (client-only).
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const socket: Socket = io(config.public.socketUrl as string, {
    transports: ['websocket'],
    autoConnect: true,
  });

  return {
    provide: { socket },
  };
});
