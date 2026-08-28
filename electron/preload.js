import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronPOS', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
  },
});
