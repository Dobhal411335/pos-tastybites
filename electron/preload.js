import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronPOS', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
  printRaw: (payload) => ipcRenderer.invoke('pos:print-raw', payload),
});
