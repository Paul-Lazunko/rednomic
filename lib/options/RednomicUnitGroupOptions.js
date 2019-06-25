import { RednomicErrors } from "./RednomicErrors";

const RednomicUnitGroupOptions = {
  server: {
    type: "object",
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  timeout: {
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
