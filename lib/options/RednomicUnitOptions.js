import { RednomicErrors } from "./RednomicErrors";

const RednomicUnitOptions = {
  redisServer: {
    type: "object",
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  requestTimeout: {
    type: "number",
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  service: {
    type: "function",
    error: RednomicErrors.options.InvalidServiceConfiguration
  },
  unitId: {
    type: "string",
    error: RednomicErrors.options.InvalidUnitIdConfiguration
  },
  logsExpire: {
    type: "number",
    error: RednomicErrors.options.InvalidLogsExpireConfiguration
  }
};

export { RednomicUnitOptions };
