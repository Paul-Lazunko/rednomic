const RednomicConstants = {
  key: {
    ping: "ping",
    pong: "pong",
    enabled: "enabled",
    input: "input",
    output: "output",
    streamData: "streamData",
    backStreamData: "backStreamData",
    streamEnds: "streamEnd",
    backStreamEnds: "backStreamEnd",
    streamReady: "streamReady",
    backStreamReady: "backStreamReady",
    streamPrepare: "streamPrepare",
    backStreamPrepare: "backStreamPrepare",
    unitId: "unitId"
  },
  types: {
    asyncFunction: "AsyncFunction",
    logger: ["info", "error"]
  },
  managerMethods: ["start", "restart", "stop"]
};

export { RednomicConstants };
