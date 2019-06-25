export class RednomicOptionsChecker {
  static checkOptions(options, source) {
    for (let property in source) {
      if (typeof options[property] !== source[property].type || !options[property]) {
        throw source[property].error;
      }
    }
  }
}
