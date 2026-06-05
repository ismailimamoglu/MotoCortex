import RNFS from 'react-native-fs';

const FILE_NAME = 'motocortex_rolling.log';
const FILE_PATH = `${RNFS.CachesDirectoryPath}/${FILE_NAME}`;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

let logBuffer: string[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
let isFlushing = false;

/**
 * Formats a Date object to YYYY-MM-DD HH:mm:ss.SSS format.
 */
function formatTimestamp(date: Date): string {
    const pad = (num: number, size: number = 2) => {
        let s = num.toString();
        while (s.length < size) s = '0' + s;
        return s;
    };
    const yyyy = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${ms}`;
}

/**
 * Appends a log line to the RAM buffer.
 * Automatically flushes if buffer size >= 200 or after 2 seconds.
 */
export function log(tag: string, message: string): void {
    const timestamp = formatTimestamp(new Date());
    const cleanMessage = message.replace(/[\r\n]+/g, ' ').trim();
    const logLine = `[${timestamp}] [${tag}] ${cleanMessage}`;
    logBuffer.push(logLine);

    if (logBuffer.length >= 200) {
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }
        // Run flush asynchronously
        flush().catch((err) => console.error('[Logger] Async flush failed:', err));
    } else if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
            flushTimeout = null;
            flush().catch((err) => console.error('[Logger] Interval flush failed:', err));
        }, 2000);
    }
}

/**
 * Smart file writer that manages file size to stay under 5 MB.
 * If size limit is exceeded, truncates the older half of the content.
 */
async function writeLogsToFile(newLogsStr: string) {
    try {
        const fileExists = await RNFS.exists(FILE_PATH);
        if (fileExists) {
            const stat = await RNFS.stat(FILE_PATH);
            const size = Number(stat.size);
            
            // Check if appending new log chunk will exceed 5MB
            if (size + newLogsStr.length > MAX_FILE_SIZE) {
                const existingContent = await RNFS.readFile(FILE_PATH, 'utf8');
                const combined = existingContent + '\n' + newLogsStr;
                // Keep the last 2.5 MB of data
                const halfSize = Math.floor(MAX_FILE_SIZE / 2);
                if (combined.length > halfSize) {
                    let truncated = combined.substring(combined.length - halfSize);
                    const firstNewline = truncated.indexOf('\n');
                    if (firstNewline !== -1) {
                        truncated = truncated.substring(firstNewline + 1);
                    }
                    await RNFS.writeFile(FILE_PATH, truncated, 'utf8');
                } else {
                    await RNFS.writeFile(FILE_PATH, combined, 'utf8');
                }
            } else {
                await RNFS.appendFile(FILE_PATH, '\n' + newLogsStr, 'utf8');
            }
        } else {
            await RNFS.writeFile(FILE_PATH, newLogsStr, 'utf8');
        }
    } catch (error) {
        console.error('[Logger] Failed to write logs to disk', error);
    }
}

/**
 * Flushes the current buffer to the file system.
 */
export async function flush(): Promise<void> {
    if (logBuffer.length === 0 || isFlushing) return;

    isFlushing = true;
    const itemsToWrite = [...logBuffer];
    logBuffer = [];

    try {
        const newLogsStr = itemsToWrite.join('\n');
        await writeLogsToFile(newLogsStr);
    } catch (error) {
        console.error('[Logger] Error in flush:', error);
        // Put the items back at the beginning of the buffer to avoid losing them
        logBuffer = [...itemsToWrite, ...logBuffer];
    } finally {
        isFlushing = false;
        // Check if more items accumulated during flush
        if (logBuffer.length >= 200) {
            await flush();
        } else if (logBuffer.length > 0 && !flushTimeout) {
            flushTimeout = setTimeout(() => {
                flushTimeout = null;
                flush().catch((err) => console.error('[Logger] Post-flush interval failed:', err));
            }, 2000);
        }
    }
}

/**
 * Reads and returns the complete log content.
 * Automatically flushes the active buffer first.
 */
export async function getLogContent(): Promise<string> {
    try {
        await flush();
        const fileExists = await RNFS.exists(FILE_PATH);
        if (!fileExists) return 'No logs recorded yet.';
        return await RNFS.readFile(FILE_PATH, 'utf8');
    } catch (error) {
        return `Error reading log file: ${error}`;
    }
}

/**
 * Clears both the in-memory buffer and the log file on disk.
 */
export async function clearLogs(): Promise<void> {
    try {
        logBuffer = [];
        if (flushTimeout) {
            clearTimeout(flushTimeout);
            flushTimeout = null;
        }
        const fileExists = await RNFS.exists(FILE_PATH);
        if (fileExists) {
            await RNFS.unlink(FILE_PATH);
        }
    } catch (error) {
        console.error('[Logger] Failed to clear logs:', error);
    }
}

/**
 * Returns the URI pointing to the log file on disk.
 */
export function getLogFileUri(): string {
    return FILE_PATH;
}
