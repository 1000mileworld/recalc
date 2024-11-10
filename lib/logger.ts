// Define a more specific type for log data
type LogData = unknown | Record<string, unknown> | null | undefined;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  message: string;
  data?: LogData;
  timestamp: string;
  level: LogLevel;
}

class Logger {
  private logs: LogMessage[] = [];
  private readonly maxLogs = 1000;

  private createLogMessage(level: LogLevel, message: string, data?: LogData): LogMessage {
    console.debug('[Logger] Creating log message', { level, message });
    return {
      message,
      data,
      timestamp: new Date().toISOString(),
      level,
    };
  }

  private log(level: LogLevel, message: string, data?: LogData) {
    const logMessage = this.createLogMessage(level, message, data);
    
    // Add to internal logs array
    this.logs.push(logMessage);
    
    // Trim logs if they exceed maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const consoleMessage = `[${logMessage.timestamp}] ${message}`;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'error':
        console.error(consoleMessage, data || '');
        break;
    }
  }

  debug(message: string, data?: LogData) {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogData) {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogData) {
    this.log('warn', message, data);
  }

  error(message: string, data?: LogData) {
    this.log('error', message, data);
  }

  getLogs(): LogMessage[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger(); 