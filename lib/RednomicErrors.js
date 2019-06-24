const RednomicErrors = {
  options: {
    InvalidRedisServerConfiguration: 'Redis server configuration should be an object which contains host and port properties',
    InvalidTimeoutConfiguration: 'Timeout should be a number',
    InvalidServiceConfiguration: 'Service should be a function',
    InvalidUnitIdConfiguration: 'UnitId should be a string',
    InvalidResolveConfiguration: 'Resolve parameter should be a function',
    InvalidRejectConfiguration: 'Reject parameter should be a function',
    InvalidUnitsListConfiguration: 'Units list should be an array of strings',
    InvalidStreamsMaxAge: 'streamsMaxAge should be a number',
  },
  service: {
    timeout: 'Timeout requesting to microservice was exceeded'
  }
};
 export { RednomicErrors };
