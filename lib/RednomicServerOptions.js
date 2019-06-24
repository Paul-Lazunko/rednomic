import { RednomicErrors } from './RednomicErrors';

const RednomicServerOptions = {
  server: {
    type: 'object',
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  timeout: {
    type: 'number',
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  resolve: {
    type: 'function',
    error: RednomicErrors.options.InvalidResolveConfiguration
  },
  reject: {
    type: 'function',
    error: RednomicErrors.options.InvalidRejectConfiguration
  }
};

export { RednomicServerOptions };
