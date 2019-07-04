import { RednomicConstants } from "../options/RednomicConstants";

export class RednomicUnitIdChecker {
  static async check(unitId, redisClient) {
    let keys = await new Promise((resolve, reject) => {
      redisClient.keys(`${RednomicConstants.key.unitId}-${unitId}`, (e, keys) => {
        if (e) {
          reject(e);
        } else {
          resolve(keys);
        }
      });
    });
    return !keys.length;
  }
}
