import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./RednomicQueueId";
import { RednomicServerOptions } from "./RednomicServerOptions";
import { RednomicOptionsChecker } from "./RednomicOptionsChecker";
import { getRednomicStream } from "./RednomicStream";

export class RednomicServer {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicServerOptions);
    this.resolve = options.resolve;
    this.reject = options.reject;
    this.streamsMaxAge = options.streamsMaxAge;
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
    await this.resolver(unitId, id, data);
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
