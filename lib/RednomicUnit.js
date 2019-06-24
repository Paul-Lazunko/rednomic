import Observer from "nodejs-redis-observer";
import { RednomicUnitConnector } from "./RednomicUnitConnector";
import { RednomicUnitOptions } from "./RednomicUnitOptions";
import { RednomicOptionsChecker } from "./RednomicOptionsChecker";

export class RednomicUnit {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitOptions);
    this.options = options;
    this.observer = new Observer({ server: options.server });
    this.connector = new RednomicUnitConnector({ server: options.server, timeout: this.options.timeout });
    this.inputKey = `${this.options.unitId}-input-*`;
    this.observer.psubscribe(this.inputKey, this.handler.bind(this));
  }

  async handler(data, key) {
    if (this.options.service.constructor.name === "AsyncFunction") {
      try {
        let result = await this.options.service.apply(this.connector, [data, key]);
        this.resolver(result, key);
      } catch (e) {
        this.resolver(e, key);
      }
    } else {
      let result = await this.options.service.apply(this.connector, [data, key]);
      this.resolver(result, key);
    }
  }

  resolver(data, key) {
    key = key.replace("-input-", "-output-");
    this.observer.publish(key, JSON.stringify(data));
  }
}
