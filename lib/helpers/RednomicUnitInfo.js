import process from "process";
import fs from "fs";
import os from "os";

let platform = os.platform();
let ip = os.networkInterfaces().enp3s0 && os.networkInterfaces().enp3s0[0] && os.networkInterfaces().enp3s0[0].address;
let pid = process.pid;

const file = "/proc/self/cgroup";

const RednomicUnitInfo = () => {
  let info = {};
  if (fs.existsSync(file)) {
    let id = fs.readFileSync(file, "utf8");
    id = id && id.split("\n");
    id = id[0] && id[0].split("/");
    id = id && id[2];
    id = id && id.substr(0, 12);
    info.isDockerCantainer = !!id;
    if (info.isDockerCantainer) {
      info.containerId = id;
    }
  }
  if (ip) {
    info.ip = ip;
  }
  info.platform = platform;
  info.pid = pid;
  return info;
};

export { RednomicUnitInfo };
