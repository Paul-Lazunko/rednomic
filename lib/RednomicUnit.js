import Observer from "nodejs-redis-observer";
import { RednomicUnitConnector } from "./RednomicUnitConnector";
import { RednomicUnitOptions } from "./options/RednomicUnitOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicPhoenixStream } from "./streams/RednomicPhoenixStream";

export class RednomicUnit {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitOptions);
    this.options = options;
    this.files = {};
    this.observer = new Observer({ server: options.server });
    this.connector = new RednomicUnitConnector({ server: options.server, timeout: this.options.timeout });
    this.inputKey = `${this.options.unitId}-input-*`;
    this.dataStreamKey = `${this.options.unitId}-streamData-*`;
    this.prepareStreamKey = `${this.options.unitId}-streamPrepare-*`;
    this.endStreamKey = `${this.options.unitId}-streamEnds-*`;
    this.observer.psubscribe(this.inputKey, this.handler.bind(this));
    this.observer.psubscribe(this.prepareStreamKey, this.handleStreamPrepare.bind(this));
    this.observer.psubscribe(this.dataStreamKey, this.handleStreamData.bind(this));
    this.observer.psubscribe(this.endStreamKey, this.handleStreamEnd.bind(this));
  }

  async handler(data, key) {
    let id = key.replace(`${this.options.unitId}-input-`, "");
    let context = {
      call: this.connector.call.bind(this.connector, [data, key]),
      files: this.files[id]
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

  handleStreamData(data, key) {
    let str = key.replace(`${this.options.unitId}-streamData-`, "").split("-");
    let fileId = str[0],
      id = str[1];
    data = JSON.parse(data);
    data = Buffer.from(data.data);
    let stream = this.files[id].filter(file => file.id === fileId)[0].stream;
    stream.write(data);
  }

  handleStreamPrepare(data, key) {
    let str = key.replace(`${this.options.unitId}-streamPrepare-`, "").split("-");
    let fileId = str[0],
      id = str[1];
    data = JSON.parse(data);
    data.id = fileId;
    data.stream = new RednomicPhoenixStream();
    this.files[id] = this.files[id] || [];
    this.files[id].push(data);
  }

  handleStreamEnd(key) {
    let str = key.split("-");
    let fileId = str[str.length - 2],
      id = str[str.length - 1];
    if (this.files.hasOwnProperty(id)) {
      this.files[id].filter(file => file.id === fileId)[0].stream.riseAgain();
      this.observer.publish(`${this.options.unitId}-streamReady-${fileId}-${id}`, { fileId });
    }
  }

  resolver(data, key) {
    key = key.replace("-input-", "-output-");
    this.observer.publish(key, JSON.stringify(data));
    let str = key.split("-");
    let id = str[str.length - 1];
    if (this.files.hasOwnProperty(id)) {
      delete this.files[id];
    }
  }
}
