import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicConstants } from "./options/RednomicConstants";

export class RednomicHealthChecker {
  constructor(options) {
    this.observer = options.observer;
    this.redisClient = options.redisClient;
    this.manager = options.manager;
    this.units = options.units;
    this.timeout = options.pingTimeout;
    this.units.map(unit => {
      this.observer.subscribe(`${unit.unitId}-${RednomicConstants.key.enabled}`, this.handleEnable.bind(this));
    });
    if (options.unitId) {
      this.unitId = options.unitId;
      this.pingKey = `${options.unitId}-${RednomicConstants.key.ping}-*`;
      this.observer.psubscribe(this.pingKey, this.handlePing.bind(this));
      this.observer.publish(`${options.unitId}-${RednomicConstants.key.enabled}`, {});
    }
  }

  getCheckHealthKeys(unit) {
    let operationId = RednomicQueueId();
    let keyToPub = `${unit.unitId}-${RednomicConstants.key.ping}-${operationId}`;
    let keyToSub = `${unit.unitId}-${RednomicConstants.key.pong}-${operationId}`;
    return { keyToPub, keyToSub };
  }

  handleCheckHealth(unit, key, timeout) {
    if (timeout) {
      this.observer.unsubscribe(key);
      clearTimeout(timeout);
      this.setAlive(unit.unitId, true);
      let t = setTimeout(() => {
        clearTimeout(t);
        this.checkHealthOne(unit);
      }, this.timeout);
    } else {
      let keyData = key.split("-");
      let unitId = keyData[0];
      if (this.units.filter(unit => unit.unitId === unitId).length) {
        try {
          let { units } = JSON.parse(unit);
          if (units) {
            this.units.filter(unit => unit.unitId === unitId)[0].units = units;
          }
        } catch (e) {}
      }
    }
  }

  checkHealthOne(unit) {
    let { keyToPub, keyToSub } = this.getCheckHealthKeys(unit);
    let timeout = setTimeout(() => {
      this.observer.unsubscribe(keyToSub);
      clearTimeout(timeout);
      this.setAlive(unit.unitId, false);
      this.tryRestart(unit.unitId);
    }, this.timeout);
    this.observer.subscribe(keyToSub, this.handleCheckHealth.bind(this));
    this.observer.subscribe(keyToSub, this.handleCheckHealth.bind(this, unit, keyToSub, timeout));
    this.observer.publish(keyToPub, {});
  }

  setAlive(unitId, value) {
    let index = this.units.findIndex(unit => unit.unitId === unitId);
    if (index >= 0) {
      this.units[index].isAlive = !!value;
      if (!value) {
        this.redisClient.del(`${RednomicConstants.key.unitId}-${unitId}`);
      }
    }
  }

  tryRestart(unitId) {
    if (
      this.manager &&
      this.manager[unitId] &&
      this.manager[unitId].restart &&
      typeof this.manager[unitId].restart === "function"
    ) {
      this.manager[unitId].restart();
    }
  }

  handleEnable(data, key) {
    let unitId = key.split("-")[0];
    let unit = this.units.filter(unit => unit.unitId === unitId)[0];
    if (unit) {
      this.checkHealthOne(unit);
    }
  }

  run() {
    this.units.map(unit => {
      this.checkHealthOne(unit);
    });
  }

  handlePing(data, key) {
    if (this.unitId) {
      let str = key.split("-"),
        id = str[str.length - 1];
      this.observer.publish(
        `${this.unitId}-${RednomicConstants.key.pong}-${id}`,
        JSON.stringify({ units: this.units })
      );
    }
  }
}
