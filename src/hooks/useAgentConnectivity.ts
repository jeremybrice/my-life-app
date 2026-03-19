import { useState, useEffect, useCallback } from 'react';

interface AgentConnectivityState {
  isOnline: boolean;
  wasOfflineDuringSession: boolean;
  markApiFailure: () => void;
  markApiSuccess: () => void;
}

export function useAgentConnectivity(): AgentConnectivityState {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOfflineDuringSession, setWasOfflineDuringSession] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
      setWasOfflineDuringSession(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const markApiFailure = useCallback(() => {
    // API call failed due to network -- treat as offline
    setIsOnline(false);
    setWasOfflineDuringSession(true);
  }, []);

  const markApiSuccess = useCallback(() => {
    // API call succeeded -- we know we're online
    setIsOnline(true);
  }, []);

  return { isOnline, wasOfflineDuringSession, markApiFailure, markApiSuccess };
}
