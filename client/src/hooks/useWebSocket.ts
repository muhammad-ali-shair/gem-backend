import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          
          switch (update.type) {
            case "activity":
              // Invalidate leaderboard and activities queries
              queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
              queryClient.invalidateQueries({ queryKey: ["/api/activities/recent"] });
              break;
              
            case "blockchain":
              // Invalidate blockchain status
              queryClient.invalidateQueries({ queryKey: ["/api/blockchain/status"] });
              break;
              
            default:
              console.log("Unknown update type:", update.type);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            // Recursive call to reconnect
            useWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  return wsRef.current;
}
