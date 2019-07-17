import { RednomicErrors } from "./RednomicErrors";

const RednomicServerOptions = {
  redisServer: {
    type: "object",
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  requestTimeout: {
    type: "number",
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  pingTimeout: {
    type: "number",
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  units: {
    type: "object",
    error: RednomicErrors.options.InvalidUnitsListConfiguration
  }
};

export { RednomicServerOptions };
