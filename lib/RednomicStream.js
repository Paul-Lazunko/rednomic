import stream from "stream";
import os from "os";

let getRednomicStream = (redisPublisher, startKey, endKey) => {
  let RednomicStream = new stream.Writable();
  RednomicStream._write = (chunk, enc, next) => {
    redisPublisher.publish(startKey, JSON.stringify(chunk));
    next();
  };
  RednomicStream.end = e => {
    redisPublisher.publish(endKey, endKey);
  };
  return RednomicStream;
};

const setRednomicStream = chunks => {
  const readable = new stream.Readable();
  readable._read = () => {};
  chunks.map(chunk => {
    readable.push(chunk);
  });
  readable.push(os.EOL);
  return readable;
};

export { getRednomicStream, setRednomicStream };
