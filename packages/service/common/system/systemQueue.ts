// queue.js
import PQueue from "p-queue"

// Queue for file reading.
export const fileQueue = new PQueue({ concurrency: 2 ,interval: 3000});

