import stream from "stream";

const freeze = function*(data) {
  for (let i = 0; i < data.length; i++) {
    yield data[i];
  }
};

export class RednomicPhoenixStream extends stream.Duplex {
  constructor() {
    super();
    this._savedChunks = [];
  }

  _write(chunk, enc, next) {
    this._savedChunks.push(chunk);
    next();
  }

  _read() {
    this.push(this._savedChunks.next().value || null);
  }

  end() {
    console.log("stream ends", this._savedChunks);
  }

  riseAgain() {
    this._savedChunks = freeze(this._savedChunks);
    return this;
  }
}
