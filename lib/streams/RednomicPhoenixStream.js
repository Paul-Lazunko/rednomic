import stream from "stream";

export class RednomicPhoenixStream extends stream.Duplex {
  constructor() {
    super();
    this._savedChunks = [];
  }

  _write(chunk, enc, next) {
    this._savedChunks.push(chunk);
    next();
  }

  _read() {}

  riseAgain() {
    for (let i = 0; i < this._savedChunks.length; i++) {
      this.push(this._savedChunks[i]);
    }
    return this;
  }
}
