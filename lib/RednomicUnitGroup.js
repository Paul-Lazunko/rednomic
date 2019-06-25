import Observer from "nodejs-redis-observer";
import { RednomicUnitConnector } from "./RednomicUnitConnector";
import { RednomicUnitGroupOptions } from "./options/RednomicUnitGroupOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";

export class RednomicUnitGroup {
  constructor(options) {
    console.log(options);
    RednomicOptionsChecker.checkOptions(options, RednomicUnitGroupOptions);
    this.options = options;
    this.queue = this.createQueue(options.units);
    this.observer = new Observer({ server: options.server });
    this.connector = new RednomicUnitConnector({ server: options.server, timeout: this.options.timeout });
    this.inputKey = `${this.options.unitId}-input-*`;
    this.observer.psubscribe(this.inputKey, this.handler.bind(this));
  }

  async handler(data, key) {
    let unit = this.shiftUnitFromQueue();
    try {
      let result = await this.connector.call(unit.unitId, data);
      this.resolver(result, key);
    } catch (e) {
      this.resolver(e, key);
    }
    this.pushUnitToQueue(unit);
  }

  createQueue(units) {
    let queue = [];
    for (let i = 0; i < units.length; i++) {
      queue.push({
        unitId: units[i],
        isPending: false
      });
    }
    return queue;
  }

  shiftUnitFromQueue() {
    let unit = this.queue.shift();
    return unit;
  }

  pushUnitToQueue(unit) {
    this.queue.push(unit);
  }

  resolver(data, key) {
    key = key.replace("-input-", "-output-");
    this.observer.publish(key, JSON.stringify(data));
  }
}
