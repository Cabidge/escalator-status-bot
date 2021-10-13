type AsyncTask = () => Promise<void>;

export class AsyncTaskQueue {
    private lastPromise = Promise.resolve();

    enqueue(fn: AsyncTask) {
        return (this.lastPromise = this.lastPromise.then(fn));
    }
}
