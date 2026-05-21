import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthSession } from '../utils/storage';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let currentSocket: Socket | null = null;
    let currentToken: string | null = null;

    const checkConnection = () => {
      const session = getAuthSession();
      const token = session?.token;

      // If user logged out but socket is connected
      if (!token && currentSocket) {
        currentSocket.disconnect();
        currentSocket = null;
        setSocket(null);
        currentToken = null;
        return;
      }

      // If user logged in and token changed
      if (token && token !== currentToken) {
        if (currentSocket) {
          currentSocket.disconnect();
        }
        
        currentToken = token;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        currentSocket = io(apiUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        setSocket(currentSocket);
      }
    };

    checkConnection();
    const intervalId = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(intervalId);
      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
