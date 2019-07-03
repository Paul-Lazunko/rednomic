import stream from "stream";

export class RednomicWriteStream extends stream.Writable {
  constructor(options) {
    super();
    this.pub = options.pub;
    this.startKey = options.startKey;
    this.endKey = options.endKey;
  }

  _write(chunk, enc, next) {
    this.pub.publish(this.startKey, JSON.stringify(chunk));
    next();
  }

  end() {
    this.pub.publish(this.endKey, this.endKey);
  }
}
