import { RednomicErrors } from './RednomicErrors';

const RednomicUnitOptions = {
  server: {
    type: 'object',
    error: RednomicErrors.options.InvalidRedisServerConfiguration
  },
  timeout: {
    type: 'number',
    error: RednomicErrors.options.InvalidTimeoutConfiguration
  },
  service: {
    type: 'function',
    error: RednomicErrors.options.InvalidServiceConfiguration
  },
  unitId: {
    type: 'string',
    error: RednomicErrors.options.InvalidUnitIdConfiguration
  }
};

export {RednomicUnitOptions};
