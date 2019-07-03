import { RednomicConstants } from "./options/RednomicConstants";
import moment from "moment";

const normalize = t => {
  if (t) {
    t = t.toString();
    t = t.length < 2 ? "0" + t : t;
  }
  return t;
};

export class RednomicLogger {
  constructor(options) {
    this.redisClient = options.redisClient;
    this.expireKeys = options.expireKeys;
  }

  write(unitId, type, data) {
    if (RednomicConstants.types.logger.includes(type)) {
      let dateTime = moment().format("YYYY-MM-DD/HH:mm:ss");
      data = JSON.stringify(data);
      let key = `${unitId}-${type}-${dateTime}`;
      this.redisClient.set(key, data, "EX", this.expireKeys);
    }
  }

  async read(
    type = "*",
    unitId = "*",
    year = "????",
    month = "??",
    day = "??",
    hour = "??",
    minute = "??",
    second = "??"
  ) {
    month = normalize(month);
    day = normalize(day);
    hour = normalize(hour);
    minute = normalize(minute);
    second = normalize(second);
    let keyPattern = `${unitId}-${type}-${year}-${month}-${day}/${hour}:${minute}:${second}`;
    let keys = await new Promise((resolve, reject) => {
        this.redisClient.keys(keyPattern, (e, keys) => {
          if (e) {
            reject(e);
          } else {
            resolve(keys);
          }
        });
      }),
      d = [];
    await Promise.all(
      keys.map(async key => {
        let line = {};
        let value = await new Promise((resolve, reject) => {
          this.redisClient.get(key, (e, value) => {
            if (e) {
              reject(e);
            } else {
              resolve(value);
            }
          });
        });
        let regExpr = new RegExp(`^${unitId === "*" ? ".+" : unitId}\\-${type === "*" ? ".+" : type}\\-`);
        key = key.replace("/", " ").replace(regExpr, "");
        line[key] = JSON.parse(value);
        d.push(line);
      })
    );
    return d.sort((a, b) => {
      let dateA = Date.parse(Object.keys(a)[0]);
      let dateB = Date.parse(Object.keys(b)[0]);
      return dateA > dateB ? -1 : 1;
    });
  }
}
