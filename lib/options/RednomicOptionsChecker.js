const schemas = require("./options");
import { RednomicErrors } from "./RednomicErrors";

export class RednomicOptionsChecker {
  static checkOptions(options, source) {
    if (schemas[source]) {
      let checking = schemas[source].validate(options);
      if (checking.error) {
        throw new Error(checking.error.message);
      }
    } else {
      throw new Error(RednomicErrors.options.InvalidSchema);
    }
  }
}
