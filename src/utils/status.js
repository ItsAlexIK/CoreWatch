const si = require("systeminformation");

async function getSystemStats() {
  const [cpu, mem, temp, disk, uptime] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
    si.fsSize(),
    si.time(),
  ]);

  return {
    cpuUsage: cpu.currentLoad.toFixed(1),
    memory: `${(mem.used / 1024 / 1024).toFixed(0)}MB / ${(
      mem.total /
      1024 /
      1024
    ).toFixed(0)}MB`,
    temperature:
      typeof temp.main === "number" && !isNaN(temp.main)
        ? temp.main.toFixed(1)
        : "N/A",
    diskUsage: `${(disk[0].used / 1024 / 1024 / 1024).toFixed(2)}GB / ${(
      disk[0].size /
      1024 /
      1024 /
      1024
    ).toFixed(2)}GB`,
    uptime: `${Math.floor(uptime.uptime / 3600)}h ${
      Math.floor(uptime.uptime / 60) % 60
    }min`,
  };
}

module.exports = { getSystemStats };
