export class Logger {
  private static enabled = false;

  static enableLogging(enable: boolean) {
    Logger.enabled = enable;
  }

  static log(...args: any[]) {
    if (Logger.enabled) {
      console.log("[PowerCodeValidator]", ...args);
    }
  }

  static info(...args: any[]) {
    if (Logger.enabled) {
      console.info("[PowerCodeValidator]", ...args);
    }
  }

  static warn(...args: any[]) {
    if (Logger.enabled) {
      console.warn("[PowerCodeValidator]", ...args);
    }
  }
}