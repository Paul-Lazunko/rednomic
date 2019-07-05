const process = require("process");
const mac = require("macaddress");
let { pid } = process;
let Mac;

try {
  Mac = parseInt(mac.all().enp3s0.mac, 16);
} catch (e) {
  Mac = Math.round(Math.random() * 1000);
}

const RednomicQueueId = () => {
  let ts = new Date().getTime();
  let rnd;
  while (!rnd || rnd < 100) {
    rnd = Math.round(Math.random() * 1000);
  }
  return [Mac.toString(16), pid.toString(16), ts.toString(16), rnd.toString(16)].join("");
};

export { RednomicQueueId };
