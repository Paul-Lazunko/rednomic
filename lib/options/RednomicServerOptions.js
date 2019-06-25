import { RednomicErrors } from "./RednomicErrors";

const RednomicServerOptions = {
  server: {
    type: "object",
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  timeout: {
    type: "number",
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  }
};

export { RednomicServerOptions };
