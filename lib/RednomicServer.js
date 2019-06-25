import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicServerOptions } from "./options/RednomicServerOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicWriteStream } from "./streams/RednomicWriteStream";

export class RednomicServer {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicServerOptions);
    this.queue = [];
    this.adapter = new RednomicUnitAdapter({
      server: options.server,
      timeout: options.timeout
    });
  }

  async use(unitId, data, req, next) {
    let id = RednomicQueueId(),
      ctx = { req, next, id };
    this.queue.push(ctx);
    if (req.files) {
      req.files.map((file, index) => {
        let pub = this.adapter.observer.publisher;
        pub.publish(`${unitId}-streamPrepare-${index}-${id}`, JSON.stringify(file));
        this.adapter.observer.subscriber.subscribe(`${unitId}-streamReady-${index}-${id}`, async ready => {
          console.log("stream ready", index);
          if (index === req.files.length - 1) {
            await this.resolver(unitId, id, data);
          }
        });
        let streamOptions = {
          pub,
          startKey: `${unitId}-streamData-${index}-${id}`,
          endKey: `${unitId}-streamEnds-${index}-${id}`
        };
        let stream = new RednomicWriteStream(streamOptions);
        file.stream.pipe(stream);
      });
    } else {
      await this.resolver(unitId, id, data);
    }
  }

  async resolver(unitId, id, data) {
    let successResult, errorResult;
    try {
      successResult = await this.adapter.call(`${unitId}-input-${id}`, data);
      successResult = JSON.parse(successResult);
    } catch (e) {
      errorResult = e;
    }
    let index = this.queue.findIndex(item => item.id === id);
    if (index >= 0) {
      let ctx = this.queue[index];
      ctx.req.rednomic = { successResult, errorResult };
      ctx.next();
      this.queue.splice(index, 1);
    }
  }
}
