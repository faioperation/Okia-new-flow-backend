import cron from 'node-cron';
import { qualityCheckServices } from '../modules/qualityCheck/qualityCheck.service';

const setupQualityCheckSync = () => {
  // Run every 12 hours: '0 */12 * * *'
  cron.schedule('0 */12 * * *', async () => {
    console.log('[Cron] Running 12-hour Quality Check Sync...');
    await qualityCheckServices.syncAllPendingChecks();
  });

  console.log('[Cron] Quality Check Sync scheduled (Every 12 hours)');
};

export const cronJobs = {
  setupQualityCheckSync,
};
