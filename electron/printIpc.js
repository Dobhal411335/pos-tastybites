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

const PROBE_TIMEOUT_MS = 5000;

function probePrinter(host, port) {
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

    socket.setTimeout(PROBE_TIMEOUT_MS);

    socket.on('timeout', () => {
      finish(new Error(`Printer connection timed out (${host}:${port})`));
    });

    socket.on('error', (err) => {
      finish(new Error(err?.message || 'Printer connection failed'));
    });

    socket.connect(port, host, () => {
      finish(null, { success: true, host, port });
    });
  });
}

function probePrinterQuick(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host, () => finish(true));
  });
}

async function scanSubnet(payload = {}) {
  const prefix = String(payload.subnetPrefix || '')
    .trim()
    .replace(/\.$/, '');
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(prefix)) {
    throw new Error('Subnet must look like 192.168.1');
  }

  const port = Number(payload.port) || 9100;
  const fromHost = Math.max(1, Number(payload.fromHost) || 1);
  const toHost = Math.min(254, Number(payload.toHost) || 254);
  const concurrency = Math.max(1, Math.min(48, Number(payload.concurrency) || 32));
  const timeoutMs = Math.max(150, Number(payload.timeoutMs) || 400);

  const hosts = [];
  for (let i = fromHost; i <= toHost; i += 1) {
    hosts.push(`${prefix}.${i}`);
  }

  const found = [];
  const queue = [...hosts];

  const worker = async () => {
    while (queue.length) {
      const host = queue.shift();
      if (!host) return;
      const ok = await probePrinterQuick(host, port, timeoutMs);
      if (ok) found.push({ host, port });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  found.sort((a, b) => {
    const aa = Number(a.host.split('.').pop() || 0);
    const bb = Number(b.host.split('.').pop() || 0);
    return aa - bb;
  });
  return found;
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

  ipcMain.handle('pos:probe-printer', async (_event, payload) => {
    try {
      const { host, port } = validatePrintTarget(payload || {});
      const result = await probePrinter(host, port);
      return { success: true, ...result };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Probe failed',
      };
    }
  });

  ipcMain.handle('pos:scan-subnet', async (_event, payload) => {
    try {
      const printers = await scanSubnet(payload || {});
      return { success: true, printers };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Subnet scan failed',
        printers: [],
      };
    }
  });
}
