import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface OnlineStats {
  connectedClientsCount: number;
  onlineUsersCount: number;
  activeRoomsCount: number;
  isRedisActive: boolean;
  serverTime: string;
}

interface SignalRContextType {
  connection: signalR.HubConnection | null;
  status: ConnectionStatus;
  connectionId: string | null;
  latency: number | null;
  stats: OnlineStats | null;
  ping: () => Promise<number | null>;
}

const SignalRContext = createContext<SignalRContextType | null>(null);

export function SignalRProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [stats, setStats] = useState<OnlineStats | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const pingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setConnection(null);
        setStatus('disconnected');
        setConnectionId(null);
      }
      return;
    }

    const hubUrl = '/hubs/duello';

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = newConnection;
    setConnection(newConnection);
    setStatus('connecting');

    // Setup event listeners
    newConnection.on('ConnectedAck', (data: { connectionId: string; userId: string; username: string; isRedisActive: boolean; serverTime: string }) => {
      console.log('⚡ [SignalR] ConnectedAck received:', data);
      setConnectionId(data.connectionId);
    });

    newConnection.on('StatsUpdated', (newStats: OnlineStats) => {
      console.log('📊 [SignalR] StatsUpdated:', newStats);
      setStats(newStats);
    });

    newConnection.on('Pong', () => {
      if (pingStartRef.current !== null) {
        const roundTrip = Math.round(performance.now() - pingStartRef.current);
        setLatency(roundTrip);
        pingStartRef.current = null;
      }
    });

    newConnection.on('LeftQueueAck', () => {
      // noop ack to prevent unhandled client method warning
    });

    newConnection.onreconnecting((error) => {
      console.warn('🔄 [SignalR] Reconnecting...', error);
      setStatus('reconnecting');
    });

    newConnection.onreconnected((newConnectionId) => {
      console.log('✅ [SignalR] Reconnected with ID:', newConnectionId);
      setStatus('connected');
      if (newConnectionId) setConnectionId(newConnectionId);
    });

    newConnection.onclose((error) => {
      console.log('🛑 [SignalR] Connection closed:', error);
      setStatus('disconnected');
      setConnectionId(null);
    });

    // Start connection
    newConnection
      .start()
      .then(async () => {
        console.log('🚀 [SignalR] WebSocket connection established successfully.');
        setStatus('connected');
        // Initial ping measurement
        try {
          pingStartRef.current = performance.now();
          await newConnection.invoke('Ping');
          const currentStats = await newConnection.invoke<OnlineStats>('GetStats');
          if (currentStats) setStats(currentStats);
        } catch (e) {
          console.warn('Initial ping/stats fetch warning:', e);
        }
      })
      .catch((err) => {
        console.error('❌ [SignalR] Connection Failed:', err);
        setStatus('disconnected');
      });

    // Periodic heartbeat / ping every 10 seconds
    const interval = setInterval(() => {
      if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
        pingStartRef.current = performance.now();
        connectionRef.current.invoke('Ping').catch(() => {});
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [token, user?.id]);

  const ping = async (): Promise<number | null> => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      pingStartRef.current = performance.now();
      await connection.invoke('Ping');
      return latency;
    }
    return null;
  };

  return (
    <SignalRContext.Provider value={{ connection, status, connectionId, latency, stats, ping }}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  const context = useContext(SignalRContext);
  if (!context) throw new Error('useSignalR must be used within SignalRProvider');
  return context;
}
