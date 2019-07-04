const RednomicErrors = {
  options: {
    InvalidRedisServerConfiguration:
      "Redis server configuration should be an object which contains host and port properties",
    InvalidTimeoutConfiguration: "Timeout should be a positive integer",
    InvalidServiceConfiguration: "Service should be a function",
    InvalidUnitIdConfiguration: "UnitId should be a string",
    InvalidLogsExpireConfiguration: "logsExpire should be a positive integer",
    InvalidResolveConfiguration: "Resolve parameter should be a function",
    InvalidRejectConfiguration: "Reject parameter should be a function",
    InvalidUnitsListConfiguration: "Units list should be an array of strings",
    InvalidStreamsMaxAge: "streamsMaxAge should be a number",
    InvalidUnitsCount: "The list of units should contains at least two units",
    InvalidManagerOptions: "You should implement this method in unit.manage: ",
    uniqueness: "this unitId is in use already"
  },
  service: {
    timeout: "Timeout requesting to microservice was exceeded, unitId:"
  }
};
export { RednomicErrors };
