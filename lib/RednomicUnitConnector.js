import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./RednomicQueueId";

export class RednomicUnitConnector {
  constructor(options) {
    this.adapter = new RednomicUnitAdapter({ server: options.server, timeout: options.timeout });
  }

  async call(unitId, data) {
    let id = RednomicQueueId();
    return await this.adapter.call(`${unitId}-input-${id}`, data);
  }
}
