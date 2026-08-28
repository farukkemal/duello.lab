import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
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
  ensureConnected: () => Promise<signalR.HubConnection | null>;
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
  const tokenRef = useRef<string | null>(null);
  const reconnectingRef = useRef(false);

  // Keep token in a ref so callbacks always see the latest value
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const getHubUrl = useCallback(() => {
    const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
    let apiBase = rawApiUrl.replace(/\/$/, '');
    if (!apiBase && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      apiBase = 'http://localhost:5000';
    }
    return `${apiBase}/hubs/duello`;
  }, []);

  const buildAndStartConnection = useCallback(async (): Promise<signalR.HubConnection | null> => {
    const currentToken = tokenRef.current;
    if (!currentToken) return null;

    // Stop any existing connection first
    const oldConn = connectionRef.current;
    if (oldConn) {
      try { await oldConn.stop(); } catch { /* ignore */ }
      connectionRef.current = null;
    }

    const hubUrl = getHubUrl();

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => tokenRef.current || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

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

    newConnection.onreconnected((newConnId) => {
      console.log('✅ [SignalR] Reconnected with ID:', newConnId);
      setStatus('connected');
      if (newConnId) setConnectionId(newConnId);
    });

    newConnection.onclose((error) => {
      console.log('🛑 [SignalR] Connection closed:', error);
      setStatus('disconnected');
      setConnectionId(null);
    });

    // Start
    setStatus('connecting');
    await newConnection.start();
    console.log('🚀 [SignalR] Connection established successfully.');
    setStatus('connected');

    connectionRef.current = newConnection;
    setConnection(newConnection);

    // Initial ping & stats
    try {
      pingStartRef.current = performance.now();
      await newConnection.invoke('Ping');
      const currentStats = await newConnection.invoke<OnlineStats>('GetStats');
      if (currentStats) setStats(currentStats);
    } catch (e) {
      console.warn('Initial ping/stats fetch warning:', e);
    }

    return newConnection;
  }, [getHubUrl]);

  // Main effect: connect on mount when token is available
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

    let cancelled = false;

    const connect = async () => {
      try {
        const conn = await buildAndStartConnection();
        if (cancelled && conn) {
          conn.stop();
        }
      } catch (err) {
        console.error('❌ [SignalR] Initial connection failed:', err);
        if (!cancelled) {
          setStatus('disconnected');
        }
      }
    };

    connect();

    // Periodic heartbeat / ping & auto-reconnect every 5 seconds
    const interval = setInterval(async () => {
      if (cancelled) return;
      const conn = connectionRef.current;

      if (conn && conn.state === signalR.HubConnectionState.Connected) {
        // Healthy — just ping
        pingStartRef.current = performance.now();
        conn.invoke('Ping').catch(() => {});
      } else if (tokenRef.current && !reconnectingRef.current) {
        // Dead or no connection — rebuild from scratch
        reconnectingRef.current = true;
        console.log('🔄 [SignalR] Connection dead, rebuilding...');
        try {
          await buildAndStartConnection();
        } catch (e) {
          console.warn('Auto-reconnect rebuild failed:', e);
          setStatus('disconnected');
        } finally {
          reconnectingRef.current = false;
        }
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [token, user?.id, buildAndStartConnection]);

  const ensureConnected = useCallback(async (): Promise<signalR.HubConnection | null> => {
    // Already connected? Return current connection.
    const conn = connectionRef.current;
    if (conn && conn.state === signalR.HubConnectionState.Connected) {
      return conn;
    }

    // Not connected — build a fresh connection
    if (!tokenRef.current) return null;

    try {
      const newConn = await buildAndStartConnection();
      if (newConn && newConn.state === signalR.HubConnectionState.Connected) {
        return newConn;
      }
      return null;
    } catch (err) {
      console.error('ensureConnected failed:', err);
      return null;
    }
  }, [buildAndStartConnection]);

  const ping = useCallback(async (): Promise<number | null> => {
    const conn = connectionRef.current;
    if (conn && conn.state === signalR.HubConnectionState.Connected) {
      pingStartRef.current = performance.now();
      await conn.invoke('Ping');
      return latency;
    }
    return null;
  }, [latency]);

  return (
    <SignalRContext.Provider value={{ connection, status, connectionId, latency, stats, ping, ensureConnected }}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  const context = useContext(SignalRContext);
  if (!context) throw new Error('useSignalR must be used within SignalRProvider');
  return context;
}
