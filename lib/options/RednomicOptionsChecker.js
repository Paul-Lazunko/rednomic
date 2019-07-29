const schemas = require("./options");
import { RednomicErrors } from "./RednomicErrors";

export class RednomicOptionsChecker {
  static checkOptions(options, source) {
    if (schemas[source]) {
      let checking = schemas[source].validate(options);
      if (checking.error) {
        throw new Error(RednomicErrors.options.InvalidSchema);
      }
    } else {
      throw new Error();
    }
  }
}
