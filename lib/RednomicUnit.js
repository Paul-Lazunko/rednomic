import Observer from "nodejs-redis-observer";
import process from "process";
import redis from "redis";
import { RednomicUnitConnector } from "./RednomicUnitConnector";
import { RednomicUnitOptions } from "./options/RednomicUnitOptions";
import { RednomicOptionsChecker } from "./options/RednomicOptionsChecker";
import { RednomicPhoenixStream } from "./streams/RednomicPhoenixStream";
import { RednomicConstants } from "./options/RednomicConstants";
import { RednomicLogger } from "./RednomicLogger";
import { RednomicUnitIdChecker } from "./helpers/RednomicUnitIdChecker";
import { RednomicErrors } from "./options/RednomicErrors";
import { RednomicWriteStream } from "./streams/RednomicWriteStream";
import { RednomicUnitInfo } from "./helpers/RednomicUnitInfo";
import { RednomicKeyParser } from "./helpers/RednomicKeyParser";

const info = RednomicUnitInfo();

export class RednomicUnit {
  constructor(options) {
    RednomicOptionsChecker.checkOptions(options, RednomicUnitOptions);
    this.options = options;
    this._redisClient = redis.createClient(this.options.redisServer);
    this.files = {};
    this.backStreams = {};
    this.observer = new Observer({ server: options.redisServer });
    this.logger = new RednomicLogger({
      redisClient: this._redisClient,
      expireKeys: options.logsExpire
    });
    this.connector = new RednomicUnitConnector({ server: options.redisServer, timeout: this.options.timeout });
    this.enabledKey = `${this.options.unitId}-${RednomicConstants.key.enabled}`;
    this.inputKey = `${this.options.unitId}-${RednomicConstants.key.input}-*`;
    this.dataStreamKey = `${this.options.unitId}-${RednomicConstants.key.streamData}-*`;
    this.prepareStreamKey = `${this.options.unitId}-${RednomicConstants.key.streamPrepare}-*`;
    this.endStreamKey = `${this.options.unitId}-${RednomicConstants.key.streamEnds}-*`;
    this.backStreamReadyKey = `${this.options.unitId}-${RednomicConstants.key.backStreamReady}-*-*`;
    this.pingKey = `${this.options.unitId}-${RednomicConstants.key.ping}-*`;
    this.observer.psubscribe(this.inputKey, this.handler.bind(this));
    this.observer.psubscribe(this.prepareStreamKey, this.handleStreamPrepare.bind(this));
    this.observer.psubscribe(this.dataStreamKey, this.handleStreamData.bind(this));
    this.observer.psubscribe(this.endStreamKey, this.handleStreamEnd.bind(this));
    this.observer.psubscribe(this.pingKey, this.handlePing.bind(this));
    this.observer.psubscribe(this.backStreamReadyKey, this.handleBackStreamReady.bind(this));
    this.checkUnitId();
  }

  async checkUnitId() {
    try {
      let uniqueness = await RednomicUnitIdChecker.check(this.options.unitId, this._redisClient);
      if (!uniqueness) {
        throw new Error(RednomicErrors.options.uniqueness);
      } else {
        this.observer.publish(this.enabledKey, JSON.stringify({ info }));
        this._redisClient.set(`${RednomicConstants.key.unitId}-${this.options.unitId}`, true);
      }
    } catch (e) {
      console.log(RednomicErrors.options.uniqueness);
      process.exit(1);
    }
  }

  handleBackStreamReady(data, key) {
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    if (this.backStreams[id]) {
      let index = this.backStreams[id].indexOf(item => item.index === fileIndex);
      this.backStreams[id].splice(index, 1);
    }
  }

  async handler(data, key) {
    let { id } = RednomicKeyParser(key);
    let context = {
      call: this.connector.call.bind(this.connector, [data, key]),
      log: (type, data) => {
        this.logger.write(this.options.unitId, type, data);
      },
      files: this.files[id],
      returnStream: (meta, stream) => {
        return this.setBackStream(stream, meta, key);
      }
    };
    if (this.options.service.constructor.name === RednomicConstants.types.asyncFunction) {
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
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    data = JSON.parse(data);
    data = Buffer.from(data.data);
    let stream = this.files[id].filter(file => file.id === fileIndex)[0].stream;
    stream.write(data);
  }

  handleStreamPrepare(data, key) {
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    data = JSON.parse(data);
    data.id = fileIndex;
    data.stream = new RednomicPhoenixStream();
    this.files[id] = this.files[id] || [];
    this.files[id].push(data);
  }

  handleStreamEnd(key) {
    let { unitId, fileIndex, id } = RednomicKeyParser(key);
    if (this.files.hasOwnProperty(id)) {
      this.files[id].filter(file => file.id === fileIndex)[0].stream.riseAgain();
      this.observer.publish(`${this.options.unitId}-${RednomicConstants.key.streamReady}-${fileIndex}-${id}`, {
        fileIndex
      });
    }
  }

  handlePing(data, key) {
    let { id } = RednomicKeyParser(key);
    this.observer.publish(`${this.options.unitId}-${RednomicConstants.key.pong}-${id}`, JSON.stringify({ info }));
  }

  resolver(data, key) {
    key = key.replace(`-${RednomicConstants.key.input}-`, `-${RednomicConstants.key.output}-`);
    this.observer.publish(key, JSON.stringify(data));
    let str = key.split("-");
    let id = str[str.length - 1];
    if (this.files.hasOwnProperty(id)) {
      delete this.files[id];
    }
  }

  setBackStream(stream, meta, key) {
    let { id } = RednomicKeyParser(key);
    this.backStreams[id] = this.backStreams[id] || [];
    let index = this.backStreams[id].length;
    let pub = this.connector.adapter.observer.publisher;
    pub.publish(
      `${this.options.unitId}-${RednomicConstants.key.backStreamPrepare}-${index}-${id}`,
      JSON.stringify(meta)
    );
    let streamOptions = {
      pub,
      startKey: `${this.options.unitId}-${RednomicConstants.key.backStreamData}-${index}-${id}`,
      endKey: `${this.options.unitId}-${RednomicConstants.key.backStreamEnds}-${index}-${id}`
    };
    let writeStream = new RednomicWriteStream(streamOptions);
    stream.pipe(writeStream);
    this.backStreams[id].push(meta);
  }
}
