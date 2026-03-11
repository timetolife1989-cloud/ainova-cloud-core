// =====================================================
// Ainova Cloud Intelligence - Structured Logger
// =====================================================
// Purpose: Centralised, environment-aware, secure logging
// Features: Log levels, structured JSON output, sensitive data sanitization
// =====================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Strip sensitive values from a log context object before writing.
 */
function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;

  const sanitized: LogContext = {};
  const sensitiveKeys = [
    'password', 'token', 'secret', 'apikey', 'api_key',
    'sessionid', 'hash', 'credential',
  ];

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private configuredLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  private readonly levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  private isLevelEnabled(level: LogLevel): boolean {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.configuredLevel);
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizeContext(context),
    };
  }

  private output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // Human-readable format for local development
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;

      switch (entry.level) {
        case 'error':
          console.error(`${prefix} ${entry.message}${contextStr}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${entry.message}${contextStr}`);
          break;
        default:
          console.log(`${prefix} ${entry.message}${contextStr}`);
      }
    } else {
      // Production: structured JSON for log aggregators (ELK, Datadog, CloudWatch, etc.)
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('debug')) {
      this.output(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('info')) {
      this.output(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('warn')) {
      this.output(this.formatEntry('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.isLevelEnabled('error')) {
      this.output(this.formatEntry('error', message, context));
    }
  }

  /**
   * Audit log entry — always written regardless of log level.
   * Use for critical business events: user changes, permission changes, data deletion.
   */
  audit(action: string, context: LogContext): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `[AUDIT] ${action}`,
      context: { ...sanitizeContext(context), _audit: true },
    });
  }
}

export const logger = new Logger();
