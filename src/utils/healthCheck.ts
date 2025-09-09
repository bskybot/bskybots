import { Logger } from "./logger";

export interface HealthStatus {
  healthy: boolean;
  timestamp: number;
  checks: Record<string, boolean>;
  metrics: Record<string, number>;
  details?: Record<string, unknown>;
}

export interface HealthCheckOptions {
  interval?: number; // milliseconds
  timeout?: number; // milliseconds
  retries?: number;
}

/**
 * Health monitoring system for bot components.
 * Provides health checks and basic metrics collection.
 */
export class HealthMonitor {
  private checks = new Map<string, () => Promise<boolean>>();
  private metrics = new Map<string, number>();
  private lastCheckResults = new Map<string, boolean>();
  private checkInterval: NodeJS.Timeout | null = null;
  private options: Required<HealthCheckOptions>;

  constructor(options: HealthCheckOptions = {}) {
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      timeout: options.timeout || 5000, // 5 seconds
      retries: options.retries || 2,
    };
  }

  /**
   * Register a health check function.
   * @param name - Unique name for the health check
   * @param checkFn - Function that returns true if healthy
   */
  registerHealthCheck(name: string, checkFn: () => Promise<boolean>) {
    this.checks.set(name, checkFn);
    Logger.debug(`Registered health check: ${name}`);
  }

  /**
   * Remove a health check.
   * @param name - Name of the health check to remove
   */
  unregisterHealthCheck(name: string) {
    this.checks.delete(name);
    this.lastCheckResults.delete(name);
    Logger.debug(`Unregistered health check: ${name}`);
  }

  /**
   * Set a metric value.
   * @param name - Metric name
   * @param value - Metric value
   */
  setMetric(name: string, value: number) {
    this.metrics.set(name, value);
  }

  /**
   * Increment a counter metric.
   * @param name - Metric name
   * @param increment - Value to add (default: 1)
   */
  incrementMetric(name: string, increment = 1) {
    const current = this.metrics.get(name) || 0;
    this.metrics.set(name, current + increment);
  }

  /**
   * Get current metric value.
   * @param name - Metric name
   * @returns Current value or 0 if not found
   */
  getMetric(name: string): number {
    return this.metrics.get(name) || 0;
  }

  /**
   * Get all current metrics.
   * @returns Object with all metrics
   */
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Run a single health check with timeout and retries.
   * @private
   */
  private async runHealthCheck(name: string, checkFn: () => Promise<boolean>): Promise<boolean> {
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const result = await this.withTimeout(checkFn(), this.options.timeout);
        if (result) {
          return true;
        }
      } catch (error) {
        Logger.debug(
          `Health check "${name}" failed (attempt ${attempt + 1}/${this.options.retries + 1}):`,
          { error: error.message }
        );
      }
    }
    return false;
  }

  /**
   * Wrap a promise with a timeout.
   * @private
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Run all health checks and return the current health status.
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = Date.now();
    const checkResults: Record<string, boolean> = {};
    const details: Record<string, unknown> = {};

    // Run all health checks
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      const result = await this.runHealthCheck(name, checkFn);
      checkResults[name] = result;
      this.lastCheckResults.set(name, result);

      if (!result) {
        details[`${name}_last_failure`] = new Date().toISOString();
      }

      return result;
    });

    await Promise.allSettled(checkPromises);

    // Determine overall health
    const healthy = Object.values(checkResults).every(result => result);

    // Get current metrics
    const metrics = this.getAllMetrics();

    return {
      healthy,
      timestamp,
      checks: checkResults,
      metrics,
      details,
    };
  }

  /**
   * Start periodic health monitoring.
   */
  start() {
    if (this.checkInterval) {
      this.stop();
    }

    Logger.info(`Starting health monitor with ${this.options.interval}ms interval`);

    this.checkInterval = setInterval(async () => {
      try {
        const status = await this.getHealthStatus();

        if (!status.healthy) {
          const failedChecks = Object.entries(status.checks)
            .filter(([, healthy]) => !healthy)
            .map(([name]) => name);

          Logger.warn(`Health check failed`, {
            operation: "health_check",
            failed_checks: failedChecks,
            metrics: status.metrics,
          });
        } else {
          Logger.debug("Health check passed", {
            operation: "health_check",
            metrics: status.metrics,
          });
        }
      } catch (error) {
        Logger.error("Error during health check:", { error: error.message });
      }
    }, this.options.interval);
  }

  /**
   * Stop periodic health monitoring.
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      Logger.info("Stopped health monitor");
    }
  }

  /**
   * Get a summary of the last health check results.
   */
  getLastCheckSummary(): Record<string, boolean> {
    return Object.fromEntries(this.lastCheckResults);
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();
