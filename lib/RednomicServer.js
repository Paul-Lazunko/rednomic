import redis from "redis";
import { RednomicUnitAdapter } from "./RednomicUnitAdapter";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicServerOptions } from "./options/RednomicServerOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicWriteStream } from "./streams/RednomicWriteStream";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicHealthChecker } from "./RednomicHealthChecker";
import { RednomicLogger } from "./RednomicLogger";
import { RednomicManager } from "./options/RednomicManager";
import { RednomicPhoenixStream } from "./streams/RednomicPhoenixStream";
import { RednomicKeyParser } from "./helpers/RednomicKeyParser";

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
    let bsp = `*-${RednomicConstants.key.backStreamPrepare}-*-*`;
    let bsd = `*-${RednomicConstants.key.backStreamData}-*-*`;
    let bse = `*-${RednomicConstants.key.backStreamEnds}-*-*`;
    this.adapter.observer.psubscribe(bsp, this.handleStreamPrepare.bind(this));
    this.adapter.observer.psubscribe(bsd, this.handleStreamData.bind(this));
    this.adapter.observer.psubscribe(bse, this.handleStreamEnd.bind(this));
    this.healthChecker.run();
  }

  manager(unitId) {
    return this._manager[unitId];
  }

  handleStreamData(data, key) {
    let { fileIndex, id } = RednomicKeyParser(key);
    data = JSON.parse(data);
    data = Buffer.from(data.data);
    let ctx = this.queue.filter(item => item.id === id)[0];
    if (ctx) {
      ctx.req.rednomic.files.push(data);
      let stream = ctx.req.rednomic.files.filter(file => file.index === fileIndex)[0].stream;
      stream.write(data);
    }
  }

  handleStreamPrepare(data, key) {
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    data = JSON.parse(data);
    data.unitId = unitId;
    data.index = fileIndex;
    data.stream = new RednomicPhoenixStream();
    let ctx = this.queue.filter(item => item.id === id)[0];
    if (ctx) {
      ctx.req.rednomic = ctx.req.rednomic || { files: [] };
      ctx.req.rednomic.files.push(data);
    }
  }

  handleStreamEnd(key) {
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    let ctx = this.queue.filter(item => item.id === id)[0];
    if (ctx) {
      ctx.req.rednomic.files.filter(file => file.index === fileIndex)[0].stream.riseAgain();
      this.adapter.observer.publish(`${unitId}-${RednomicConstants.key.backStreamReady}-${fileIndex}-${id}`, {});
    }
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
      if (ctx.req.rednomic) {
        ctx.req.rednomic.successResult = successResult;
        ctx.req.rednomic.errorResult = errorResult;
      } else {
        ctx.req.rednomic = { successResult, errorResult };
      }
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
