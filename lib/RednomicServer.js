import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicServerOptions } from "./options/RednomicServerOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicWriteStream } from "./streams/RednomicWriteStream";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicHealthChecker } from "./RednomicHealthChecker";
import redis from "redis";
import { RednomicLogger } from "./RednomicLogger";
import { RednomicManager } from "./options/RednomicManager";

export class RednomicServer {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicServerOptions);
    this.queue = [];
    this._manager = {};
    this._redisClient = redis.createClient(options.redisServer);
    this.attachUnits(options.units);
    this.adapter = new RednomicUnitAdapter({
      server: options.redisServer,
      timeout: options.requestTimeout
    });
    this.logger = new RednomicLogger({ redisClient: this._redisClient });
    this.getLogs = this.logger.read.bind(this.logger);
    this.healthChecker = new RednomicHealthChecker({
      manager: this._manager,
      redisClient: this._redisClient,
      observer: this.adapter.observer,
      units: this.units,
      pingTimeout: options.pingTimeout
    });
    this.healthChecker.run();
  }

  manager(unitId) {
    return this._manager[unitId];
  }

  attachUnits(units) {
    this.units = [];
    for (let i = 0; i < units.length; i++) {
      this.units.push({ unitId: units[i].unitId, description: units[i].description });
      if (units[i].manage) {
        this._manager[units[i].unitId] = new RednomicManager(units[i].manage, units[i]);
      }
    }
  }

  async use(unitId, data, req, next) {
    let id = RednomicQueueId(),
      ctx = { req, next, id };
    this.queue.push(ctx);
    if (req.rednomic && req.rednomic.files) {
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
