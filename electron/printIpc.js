import net from 'net';
import { ipcMain } from 'electron';

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const PRINT_TIMEOUT_MS = 15000;

function validatePrintTarget({ host, port }) {
  const trimmedHost = String(host || '').trim();
  if (!trimmedHost) {
    throw new Error('Printer host is required');
  }
  if (!IPV4_RE.test(trimmedHost) && !HOSTNAME_RE.test(trimmedHost)) {
    throw new Error('Invalid printer host');
  }
  const numericPort = Number(port) || 9100;
  if (numericPort < 1 || numericPort > 65535) {
    throw new Error('Invalid printer port');
  }
  return { host: trimmedHost, port: numericPort };
}

function sendRawToPrinter(host, port, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (err, result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(result);
    };

    socket.setTimeout(PRINT_TIMEOUT_MS);

    socket.on('timeout', () => {
      finish(new Error(`Printer connection timed out (${host}:${port})`));
    });

    socket.on('error', (err) => {
      finish(new Error(err?.message || 'Printer connection failed'));
    });

    socket.connect(port, host, () => {
      socket.write(Buffer.from(data), (writeErr) => {
        if (writeErr) {
          finish(new Error(writeErr.message || 'Failed to write to printer'));
          return;
        }
        socket.end();
        finish(null, { success: true, host, port });
      });
    });
  });
}

export function registerPrintIpc() {
  ipcMain.handle('pos:print-raw', async (_event, payload) => {
    try {
      const { host, port } = validatePrintTarget(payload || {});
      const dataBase64 = payload?.dataBase64;

      if (!dataBase64 || typeof dataBase64 !== 'string') {
        throw new Error('Print data is required');
      }

      const buffer = Buffer.from(dataBase64, 'base64');
      if (!buffer.length) {
        throw new Error('Print data is empty');
      }

      const result = await sendRawToPrinter(host, port, buffer);
      return { success: true, ...result };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Print failed',
      };
    }
  });
}
