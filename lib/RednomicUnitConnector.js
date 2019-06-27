import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicConstants } from "./options/RednomicConstants";

export class RednomicUnitConnector {
  constructor(options) {
    this.adapter = new RednomicUnitAdapter({ server: options.server, timeout: options.timeout });
  }

  async call(unitId, data) {
    let id = RednomicQueueId();
    return await this.adapter.call(`${unitId}-${RednomicConstants.key.input}-${id}`, data);
  }
}
