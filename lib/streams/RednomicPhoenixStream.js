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
    this._frozenChunks = {
      next: () => {
        return { value: null };
      }
    };
  }

  _write(chunk, enc, next) {
    this._savedChunks.push(chunk);
    next();
  }

  _read() {
    this.push(this._frozenChunks.next().value || null);
  }

  riseAgain() {
    this._frozenChunks = freeze(this._savedChunks);
    this._savedChunks = [];
    return this;
  }
}
