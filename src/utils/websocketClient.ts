import WebSocket from "ws";
import { Logger } from "./logger";
import { healthMonitor } from "./healthCheck";

interface WebSocketClientOptions {
  /** The URL of the WebSocket server to connect to. */
  service: string | string[];
  /** The interval in milliseconds to wait before attempting to reconnect when the connection closes. Default is 5000ms. */
  reconnectInterval?: number;
  /** The interval in milliseconds for sending ping messages (heartbeats) to keep the connection alive. Default is 10000ms. */
  pingInterval?: number;
  /** Maximum number of consecutive reconnection attempts per service. Default is 3. */
  maxReconnectAttempts?: number;
  /** Maximum delay between reconnection attempts in milliseconds. Default is 30000ms (30 seconds). */
  maxReconnectDelay?: number;
  /** Exponential backoff factor for reconnection delays. Default is 1.5. */
  backoffFactor?: number;
  /** Maximum number of attempts to cycle through all services before giving up. Default is 2. */
  maxServiceCycles?: number;
}

/**
 * A WebSocket client that automatically attempts to reconnect upon disconnection
 * and periodically sends ping messages (heartbeats) to ensure the connection remains alive.
 *
 * Extend this class and override the protected `onOpen`, `onMessage`, `onError`, and `onClose` methods
 * to implement custom handling of WebSocket events.
 */
export class WebSocketClient {
  private service: string | string[];
  private reconnectInterval: number;
  private pingInterval: number;
  private ws: WebSocket | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private serviceIndex = 0;
  private reconnectAttempts = 0;
  private serviceCycles = 0;
  private maxReconnectAttempts: number;
  private maxServiceCycles: number;
  private maxReconnectDelay: number;
  private backoffFactor: number;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private messageCount = 0;
  private lastMessageTime = 0;
  private healthCheckName: string;

  /**
   * Creates a new instance of `WebSocketClient`.
   *
   * @param options - Configuration options for the WebSocket client, including URL, reconnect interval, and ping interval.
   */
  constructor(options: WebSocketClientOptions) {
    this.service = options.service;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.pingInterval = options.pingInterval || 10000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 3;
    this.maxServiceCycles = options.maxServiceCycles || 2;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.backoffFactor = options.backoffFactor || 1.5;

    // Generate unique health check name
    this.healthCheckName = `websocket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      // Register health check
      healthMonitor.registerHealthCheck(this.healthCheckName, async () => {
        return this.getConnectionState() === "CONNECTED";
      });

      // Initialize metrics
      healthMonitor.setMetric(`${this.healthCheckName}_messages_received`, 0);
      healthMonitor.setMetric(`${this.healthCheckName}_reconnect_attempts`, 0);
    } catch (error) {
      Logger.error("Error initializing health monitoring:", error);
    }

    this.run();
  }

  /**
   * Initiates a WebSocket connection to the specified URL.
   *
   * This method sets up event listeners for `open`, `message`, `error`, and `close` events.
   * When the connection opens, it starts the heartbeat mechanism.
   * On close, it attempts to reconnect after a specified interval.
   */
  private run() {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const currentService = Array.isArray(this.service)
      ? this.service[this.serviceIndex]
      : this.service;

    try {
      Logger.info(`Attempting to connect to WebSocket: ${currentService}`);
      this.ws = new WebSocket(currentService);

      this.ws.on("open", () => {
        try {
          Logger.info("WebSocket connected successfully", {
            service: this.getCurrentService(),
            serviceIndex: this.serviceIndex,
          });
          this.isConnecting = false;
          this.reconnectAttempts = 0; // Reset on successful connection
          this.serviceCycles = 0; // Reset cycles on successful connection
          try {
            healthMonitor.setMetric(
              `${this.healthCheckName}_reconnect_attempts`,
              this.reconnectAttempts
            );
          } catch (healthError) {
            Logger.error("Error updating health metrics:", healthError);
          }
          this.startHeartbeat();
          this.onOpen();
        } catch (error) {
          Logger.error("Error in WebSocket open handler:", error);
          this.isConnecting = false;
        }
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          this.messageCount++;
          this.lastMessageTime = Date.now();
          try {
            healthMonitor.incrementMetric(`${this.healthCheckName}_messages_received`);
          } catch (healthError) {
            Logger.debug("Error updating message count metric:", healthError);
          }
          this.onMessage(data);
        } catch (error) {
          Logger.error("Error processing WebSocket message:", error);
        }
      });

      this.ws.on("error", error => {
        Logger.error("WebSocket error:", error);
        this.isConnecting = false;
        try {
          this.onError(error);
        } catch (handlerError) {
          Logger.error("Error in WebSocket error handler:", handlerError);
        }
      });

      this.ws.on("close", (code, reason) => {
        try {
          Logger.info(`WebSocket disconnected. Code: ${code}, Reason: ${reason.toString()}`);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.onClose();

          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        } catch (error) {
          Logger.error("Error in WebSocket close handler:", error);
          this.isConnecting = false;
        }
      });
    } catch (error) {
      Logger.error("Error creating WebSocket connection:", error);
      this.isConnecting = false;

      // Schedule reconnect on connection creation failure
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Attempts to reconnect to the WebSocket server after the specified `reconnectInterval`.
   * It clears all event listeners on the old WebSocket and initiates a new connection.
   */
  private scheduleReconnect() {
    this.reconnectAttempts++;
    try {
      healthMonitor.setMetric(`${this.healthCheckName}_reconnect_attempts`, this.reconnectAttempts);
    } catch (error) {
      Logger.debug("Error updating reconnect attempts metric:", error);
    }

    // Check if we should try the next service
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.shouldTryNextService()) {
        this.moveToNextService();
        return; // Try next service immediately
      } else {
        Logger.error("All services exhausted after maximum cycles", {
          totalServices: Array.isArray(this.service) ? this.service.length : 1,
          maxServiceCycles: this.maxServiceCycles,
          serviceCycles: this.serviceCycles,
        });
        return; // Give up entirely
      }
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(this.backoffFactor, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    Logger.info(
      `Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} for service`,
      {
        service: this.getCurrentService(),
        serviceIndex: this.serviceIndex,
        delay: `${delay}ms`,
      }
    );

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.cleanup();
      this.run();
    }, delay);
  }

  /**
   * Check if we should try the next service in the array.
   */
  private shouldTryNextService(): boolean {
    if (!Array.isArray(this.service)) {
      return false; // Single service, can't switch
    }

    return this.serviceCycles < this.maxServiceCycles;
  }

  /**
   * Move to the next service in the array and reset reconnection attempts.
   */
  private moveToNextService() {
    if (!Array.isArray(this.service)) {
      return;
    }

    const previousIndex = this.serviceIndex;
    this.serviceIndex = (this.serviceIndex + 1) % this.service.length;

    // If we've gone through all services once, increment the cycle counter
    if (this.serviceIndex === 0) {
      this.serviceCycles++;
    }

    this.reconnectAttempts = 0; // Reset attempts for the new service

    Logger.info("Switching to next service", {
      previousService: this.service[previousIndex],
      previousIndex,
      newService: this.getCurrentService(),
      newIndex: this.serviceIndex,
      serviceCycle: this.serviceCycles,
    });

    // Try the new service immediately
    this.cleanup();
    this.run();
  }

  private cleanup() {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Starts sending periodic ping messages to the server.
   *
   * This function uses `setInterval` to send a ping at the configured `pingInterval`.
   * If the WebSocket is not open, pings are not sent.
   */
  private startHeartbeat() {
    this.pingTimeout = setInterval(() => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.ping();
        }
      } catch (error) {
        Logger.error("Error sending WebSocket ping:", error);
      }
    }, this.pingInterval);
  }

  /**
   * Stops sending heartbeat pings by clearing the ping interval.
   */
  private stopHeartbeat() {
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout);
      this.pingTimeout = null;
    }
  }

  /**
   * Called when the WebSocket connection is successfully opened.
   *
   * Override this method in a subclass to implement custom logic on connection.
   */
  protected onOpen() {
    // Custom logic for connection open
  }

  /**
   * Called when a WebSocket message is received.
   *
   * @param data - The data received from the WebSocket server.
   *
   * Override this method in a subclass to implement custom message handling.
   */
  protected onMessage(_data: WebSocket.Data) {
    // Custom logic for handling received messages
  }

  /**
   * Called when a WebSocket error occurs.
   *
   * @param error - The error that occurred.
   *
   * Override this method in a subclass to implement custom error handling.
   * Note: Service switching is now handled in the reconnection logic, not here.
   */
  protected onError(_error: Error) {
    // Custom logic for handling errors - override in subclasses
    // Service switching is handled automatically in scheduleReconnect()
  }

  /**
   * Called when the WebSocket connection is closed.
   *
   * Override this method in a subclass to implement custom logic on disconnection.
   */
  protected onClose() {
    // Custom logic for handling connection close
  }

  /**
   * Sends data to the connected WebSocket server, if the connection is open.
   *
   * @param data - The data to send.
   * @returns true if the message was sent successfully, false otherwise.
   */
  public send(data: string | Buffer | ArrayBuffer | Buffer[]): boolean {
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(data);
        return true;
      } else {
        Logger.debug("Cannot send message: WebSocket not connected", {
          readyState: this.ws?.readyState,
          service: this.getCurrentService(),
        });
        return false;
      }
    } catch (error) {
      Logger.error("Error sending WebSocket message:", error);
      return false;
    }
  }

  /**
   * Closes the WebSocket connection gracefully.
   */
  public close() {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        Logger.error("Error closing WebSocket:", error);
      }
    }

    // Unregister health check when closing
    try {
      healthMonitor.unregisterHealthCheck(this.healthCheckName);
    } catch (error) {
      Logger.error("Error unregistering health check:", error);
    }
  }

  public getConnectionState(): string {
    if (!this.ws) return "DISCONNECTED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "CONNECTED";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "DISCONNECTED";
      default:
        return "UNKNOWN";
    }
  }

  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  public getServiceCycles(): number {
    return this.serviceCycles;
  }

  public getServiceIndex(): number {
    return this.serviceIndex;
  }

  public getAllServices(): string[] {
    return Array.isArray(this.service) ? [...this.service] : [this.service];
  }

  public getCurrentService(): string {
    return Array.isArray(this.service) ? this.service[this.serviceIndex] : this.service;
  }

  public getMessageCount(): number {
    return this.messageCount;
  }

  public getLastMessageTime(): number {
    return this.lastMessageTime;
  }

  public getHealthCheckName(): string {
    return this.healthCheckName;
  }
}
