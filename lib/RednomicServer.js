import { RednomicUnitAdapter } from './RednomicUnitAdapter';
import { RednomicQueueId } from './RednomicQueueId';

export class RednomicServer {
  constructor(options) {
    this.resolve = options.resolve;
    this.reject = options.reject;
    this.queue = [];
    this.adapter = new RednomicUnitAdapter({server: options.server, timeout: options.timeout});
  }

  add (unitId, data, res) {
    let id = RednomicQueueId(), ctx = { res, id };
    this.queue.push(ctx);
    this.resolver(unitId, id, data);
  }

  async resolver (unitId, id,  data) {

    try {
      let result = await this.adapter.call(`${unitId}-input-${id}`, data);
      let index = this.queue.findIndex(item => item.id === id);
      if ( index >= 0) {
        let res = this.queue[index].res;
        this.resolve(res, result);
        this.queue.splice(index,1);
      }
    } catch(e) {
      let index = this.queue.findIndex(item => item.id === id);
      if ( index >= 0) {
        let res = this.queue[index].res;
        this.reject(res, e);
        this.queue.splice(index,1);
      }
    }
  }
}