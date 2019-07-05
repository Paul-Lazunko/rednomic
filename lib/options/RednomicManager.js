import { RednomicConstants } from "./RednomicConstants";
import { RednomicErrors } from "./RednomicErrors";

export class RednomicManager {
  constructor(options, ctx) {
    for (let i = 0; i < RednomicConstants.managerMethods.length; i++) {
      let methodName = RednomicConstants.managerMethods[i];
      if (!options[methodName] || typeof options[methodName] !== "function") {
        throw new Error(RednomicErrors.options.InvalidManagerOptions + methodName);
      } else {
        this[methodName] = options[methodName].bind(ctx);
      }
    }
  }
}
