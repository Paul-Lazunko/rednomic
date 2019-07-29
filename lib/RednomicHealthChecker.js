import { RednomicQueueId } from "./helpers/RednomicQueueId";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicUnitInfo } from "./helpers/RednomicUnitInfo";

const info = RednomicUnitInfo();

export class RednomicHealthChecker {
  constructor(options) {
    this.observer = options.observer;
    this.redisClient = options.redisClient;
    this.units = options.units;
    this.timeout = options.pingTimeout;
    this.units.forEach(unit => {
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
      if (this.units.filter(u => u.unitId === unitId).length) {
        try {
          let { units, info } = JSON.parse(unit);
          if (units) {
            this.units.filter(unit => unit.unitId === unitId)[0].units = units;
          }
          if (info) {
            this.units.filter(unit => unit.unitId === unitId)[0].info = info;
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
      this.beforeRestart(unit.unitId);
    }, this.timeout);
    this.observer.subscribe(keyToSub, this.handleCheckHealth.bind(this));
    this.observer.subscribe(keyToSub, this.handleCheckHealth.bind(this, unit, keyToSub, timeout));
    this.observer.publish(keyToPub, 1);
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

  beforeRestart(unitId) {
    this.redisClient.del(`${RednomicConstants.key.unitId}-${unitId}`);
  }

  handleEnable(data, key) {
    let unitId = key.split("-")[0];
    let unit = this.units.filter(unit => unit.unitId === unitId)[0];
    if (unit) {
      let index = this.units.indexOf(unit);
      if (index >= 0) {
        let { info } = data;
        this.units[index].info = info;
      }
      this.checkHealthOne(unit);
    }
  }

  run() {
    this.units.forEach(unit => {
      this.checkHealthOne(unit);
    });
  }

  handlePing(data, key) {
    if (this.unitId) {
      let str = key.split("-"),
        id = str[str.length - 1];
      this.observer.publish(
        `${this.unitId}-${RednomicConstants.key.pong}-${id}`,
        JSON.stringify({ units: this.units, info })
      );
    }
  }
}
