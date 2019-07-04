import Observer from "nodejs-redis-observer";
import { RednomicUnitGroupOptions } from "./options/RednomicUnitGroupOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicErrors } from "./options/RednomicErrors";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicHealthChecker } from "./RednomicHealthChecker";
import redis from "redis";
import { RednomicUnitIdChecker } from "./helpers/RednomicUnitIdChecker";

const proxyOutComingKeys = [RednomicConstants.key.streamReady, RednomicConstants.key.output];

const notProxyKeys = [RednomicConstants.key.ping, RednomicConstants.key.pong, RednomicConstants.key.enabled];

export class RednomicUnitGroup {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitGroupOptions);
    this.options = options;
    this._redisClient = redis.createClient(this.options.redisServer);
    this.unitQueue = RednomicUnitGroup.createQueue(options.units);
    this.operationsQueue = {};
    this.observer = new Observer({ server: options.redisServer });
    this.proxyKey = `${this.options.unitId}-*`;
    this.enabledKey = `${this.options.unitId}-${RednomicConstants.key.enabled}`;
    options.units.map(unit => {
      proxyOutComingKeys.map(key => {
        this.observer.psubscribe(`${unit.unitId}-${key}-*`, this.proxyOutputKeyHandler.bind(this));
      });
    });
    this.observer.psubscribe(this.proxyKey, this.proxyInputKeyHandler.bind(this));
    this.healthChecker = new RednomicHealthChecker({
      observer: this.observer,
      redisClient: this._redisClient,
      units: this.unitQueue,
      pingTimeout: this.options.pingTimeout,
      unitId: this.options.unitId
    });
    this.healthChecker.run();
    this.checkUnitId();
  }

  async checkUnitId() {
    try {
      let uniqueness = await RednomicUnitIdChecker.check(this.options.unitId, this._redisClient);
      if (!uniqueness) {
        throw new Error(RednomicErrors.options.uniqueness);
      } else {
        this.observer.publish(this.enabledKey, {});
        this._redisClient.set(`${RednomicConstants.key.unitId}-${this.options.unitId}`, true);
      }
    } catch (e) {
      console.log(RednomicErrors.options.uniqueness);
      process.exit(1);
    }
  }

  async proxyInputKeyHandler(data, key) {
    let unitId,
      keyData = key.split("-");
    let operationId = keyData[keyData.length - 1];
    if (!this.operationsQueue[operationId]) {
      let unit = this.shiftUnitFromQueue();
      unitId = unit.unitId;
      this.addToOperationsQueue(operationId, unitId);
      this.pushUnitToQueue(unit);
    } else {
      unitId = this.operationsQueue[operationId];
    }
    if (!proxyOutComingKeys.includes(keyData[1])) {
      this.enableUnitProxy(unitId, keyData, data);
    }
  }

  proxyOutputKeyHandler(data, key) {
    let keyData = key.split("-"),
      outputKey = keyData[1],
      operationId = keyData[keyData.length - 1];
    keyData[0] = this.options.unitId;
    key = keyData.join("-");
    this.observer.publish(key, data);
    if (outputKey === RednomicConstants.key.output) {
      this.removeFromOperationQueue(operationId);
    }
  }

  static createQueue(units) {
    if (
      !Array.isArray(units) ||
      units.length < 2 ||
      units.filter(u => {
        return !u || typeof u !== "object";
      }).length
    ) {
      throw new Error(RednomicErrors.options.InvalidUnitsCount);
    }
    let queue = [];
    for (let i = 0; i < units.length; i++) {
      queue.push({
        unitId: units[i].unitId
      });
    }
    return queue;
  }

  addToOperationsQueue(key, value) {
    this.operationsQueue[key] = value;
  }

  removeFromOperationQueue(key) {
    if (this.operationsQueue.hasOwnProperty(key)) {
      delete this.operationsQueue[key];
    }
  }

  enableUnitProxy(unitId, keyData, data) {
    if (!notProxyKeys.includes(keyData[1])) {
      keyData[0] = unitId;
      let key = keyData.join("-");
      this.observer.publish(key, data);
    }
  }

  shiftUnitFromQueue() {
    return this.unitQueue.shift();
  }

  pushUnitToQueue(unit) {
    this.unitQueue.push(unit);
  }
}
