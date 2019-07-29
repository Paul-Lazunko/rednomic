const RednomicErrors = {
  options: {
    InvalidSchema: "Invalid validation schema name was provided",
    InvalidUnitsCount: "The list of units should contains at least two units",
    uniqueness: "this unitId is in use already"
  },
  service: {
    timeout: "Timeout requesting to microservice was exceeded, unitId: "
  }
};
export { RednomicErrors };
