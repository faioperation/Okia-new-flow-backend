import cron from 'node-cron';
import { qualityCheckServices } from '../modules/qualityCheck/qualityCheck.service';

const setupQualityCheckSync = () => {
  // Run every 12 hours: '0 */12 * * *'
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Running every minute Quality Check Sync...');
    await qualityCheckServices.syncAllPendingChecks();
  });

  console.log('[Cron] Quality Check Sync scheduled (Every minute)');
};

export const cronJobs = {
  setupQualityCheckSync,
};
