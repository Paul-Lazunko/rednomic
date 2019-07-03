import { RednomicErrors } from "./RednomicErrors";

const RednomicUnitGroupOptions = {
  redisServer: {
    type: "object",
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  pingTimeout: {
    type: "number",
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  units: {
    type: "object",
    error: RednomicErrors.options.InvalidUnitsListConfiguration
  },
  unitId: {
    type: "string",
    error: RednomicErrors.options.InvalidUnitIdConfiguration
  }
};

export { RednomicUnitGroupOptions };
