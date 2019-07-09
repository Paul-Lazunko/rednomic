import { RednomicServerProxyed } from "./RednomicServerProxyed";

export class RednomicServer {
  constructor(options) {
    let RS = new RednomicServerProxyed(options);
    this.getHealthStatuses = RS.getHealthStatuses.bind(RS);
    this.getLogs = RS.getLogs.bind(RS);
    this.use = RS.use.bind(RS);
    this.isAlive = RS.isAlive.bind(RS);
    this.manager = RS.manager.bind(RS);
  }
}
