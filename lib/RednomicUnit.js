import Observer from "nodejs-redis-observer";
import { RednomicUnitConnector } from "./RednomicUnitConnector";
import { RednomicUnitOptions } from "./RednomicUnitOptions";
import { RednomicOptionsChecker } from "./RednomicOptionsChecker";

import { setRednomicStream } from "./RednomicStream";

export class RednomicUnit {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitOptions);
    this.options = options;
    this.streams = {};
    this.observer = new Observer({ server: options.server });
    this.connector = new RednomicUnitConnector({ server: options.server, timeout: this.options.timeout });
    this.inputKey = `${this.options.unitId}-input-*`;
    this.streamKey = `${this.options.unitId}-streamStart-*`;
    this.endKey = `${this.options.unitId}-streamEnd-*`;
    this.observer.psubscribe(this.inputKey, this.handler.bind(this));
    this.observer.psubscribe(this.streamKey, this.streamer.bind(this));
    this.observer.psubscribe(this.endKey, this.end.bind(this));
  }

  async handler(data, key) {
    let id = key.replace(`${this.options.unitId}-input-`, "");
    let context = {
      call: this.connector.call.bind(this.connector, [data, key])
    };
    if (this.options.service.constructor.name === "AsyncFunction") {
      try {
        let result = await this.options.service.apply(context, [data, key]);
        this.resolver(result, key);
      } catch (e) {
        this.resolver(e, key);
      }
    } else {
      let result = this.options.service.apply(context, [data, key]);
      this.resolver(result, key);
    }
  }

  streamer(data, key) {
    let id = key.replace(`${this.options.unitId}-streamStart-`, "");
    data = JSON.parse(data);
    this.streams[id] = this.streams.id || { chunks: [], stream: null };
    this.streams[id].chunks.push(new Buffer(data.data));
    this.streams[id].encoding = data.encoding;
  }

  end(key) {
    let id = key.replace(`${this.options.unitId}-streamEnd-`, "");
    this.streams[id].stream = setRednomicStream(this.streams[id].chunks);
    this.observer.publish(`${this.options.unitId}-streamReady-${id}`, {});
  }

  resolver(data, key) {
    key = key.replace("-input-", "-output-");
    this.observer.publish(key, JSON.stringify(data));
  }
}
