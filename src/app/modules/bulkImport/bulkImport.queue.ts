import PQueue from 'p-queue';

// Process 1 CV at a time to manage memory and CPU usage
export const cvProcessingQueue = new PQueue({ concurrency: 1 });

cvProcessingQueue.on('active', () => {
  console.log(`Working on CV.  Size: ${cvProcessingQueue.size}  Pending: ${cvProcessingQueue.pending}`);
});

cvProcessingQueue.on('idle', () => {
  console.log('CV Processing Queue is done✅.');
});
