import Observer from "nodejs-redis-observer";
import { RednomicUnitGroupOptions } from "./options/RednomicUnitGroupOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicErrors } from "./options/RednomicErrors";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicHealthChecker } from "./RednomicHealthChecker";

const proxyOutComingKeys = [RednomicConstants.key.streamReady, RednomicConstants.key.output];

const notProxyKeys = [RednomicConstants.key.ping, RednomicConstants.key.pong, RednomicConstants.key.enabled];

export class RednomicUnitGroup {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitGroupOptions);
    this.options = options;
    this.unitQueue = RednomicUnitGroup.createQueue(options.units);
    this.operationsQueue = {};
    this.observer = new Observer({ server: options.server });
    this.proxyKey = `${this.options.unitId}-*`;
    options.units.map(unit => {
      proxyOutComingKeys.map(key => {
        this.observer.psubscribe(`${unit.unitId}-${key}-*`, this.proxyOutputKeyHandler.bind(this));
      });
    });
    this.observer.psubscribe(this.proxyKey, this.proxyInputKeyHandler.bind(this));
    this.healthChecker = new RednomicHealthChecker({
      observer: this.observer,
      units: this.unitQueue,
      pingTimeout: this.options.timeout,
      unitId: this.options.unitId
    });
    this.healthChecker.run();
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
