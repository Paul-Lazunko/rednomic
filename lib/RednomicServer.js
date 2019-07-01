import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicServerOptions } from "./options/RednomicServerOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicWriteStream } from "./streams/RednomicWriteStream";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicHealthChecker } from "./RednomicHealthChecker";

export class RednomicServer {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicServerOptions);
    this.queue = [];
    this.units = options.units;
    this.adapter = new RednomicUnitAdapter({
      server: options.server,
      timeout: options.timeout
    });
    this.healthChecker = new RednomicHealthChecker({
      observer: this.adapter.observer,
      units: this.units,
      pingTimeout: options.timeout
    });
    this.healthChecker.run();
  }

  async use(unitId, data, req, next) {
    let id = RednomicQueueId(),
      ctx = { req, next, id };
    this.queue.push(ctx);
    if (req.rednomic.files) {
      req.rednomic.files.map((file, index) => {
        let pub = this.adapter.observer.publisher;
        pub.publish(`${unitId}-${RednomicConstants.key.streamPrepare}-${index}-${id}`, JSON.stringify(file));
        this.adapter.observer.subscriber.subscribe(
          `${unitId}-${RednomicConstants.key.streamReady}-${index}-${id}`,
          async ready => {
            if (index === req.rednomic.files.length - 1) {
              await this.resolver(unitId, id, data);
            }
          }
        );
        let streamOptions = {
          pub,
          startKey: `${unitId}-${RednomicConstants.key.streamData}-${index}-${id}`,
          endKey: `${unitId}-${RednomicConstants.key.streamEnds}-${index}-${id}`
        };
        let stream = new RednomicWriteStream(streamOptions);
        file.stream.pipe(stream);
      });
    } else {
      await this.resolver(unitId, id, data);
    }
  }

  async resolver(unitId, id, data) {
    let successResult, errorResult;
    try {
      successResult = await this.adapter.call(`${unitId}-${RednomicConstants.key.input}-${id}`, data);
      successResult = JSON.parse(successResult);
    } catch (e) {
      errorResult = e;
    }
    let index = this.queue.findIndex(item => item.id === id);
    if (index >= 0) {
      let ctx = this.queue[index];
      ctx.req.rednomic = { successResult, errorResult };
      ctx.next();
      this.queue.splice(index, 1);
    }
  }

  isAlive(unitId) {
    let unit = this.units.filter(unit => unit.unitId === unitId)[0];
    return unit && unit.isAlive;
  }

  getHealthStatuses() {
    return this.units;
  }
}
