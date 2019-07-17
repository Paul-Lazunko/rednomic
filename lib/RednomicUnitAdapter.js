import Observer from "nodejs-redis-observer";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicErrors } from "./options/RednomicErrors";

export class RednomicUnitAdapter {
  constructor(options) {
    this.options = options;
    this.observer = new Observer({ server: options.server });
  }

  call(inputKey, data) {
    let outputKey = inputKey.replace(`-${RednomicConstants.key.input}-`, `-${RednomicConstants.key.output}-`);
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject({ message: `${RednomicErrors.service.timeout} ${inputKey}` });
      }, this.options.timeout);
      try {
        this.observer.subscribe(outputKey, data => {
          try {
            data = JSON.parse(data);
          } catch (e) {}
          resolve(data);
          clearTimeout(timeout);
        });
        this.observer.publish(inputKey, JSON.stringify(data));
      } catch (e) {
        reject(e);
        clearTimeout(timeout);
      }
    });
  }

  resolve(data) {
    try {
      data = JSON.parse(data);
    } catch (e) {}
    return data;
  }
}
