const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs/promises");
const os = require("node:os");

const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID || "";
const ALLOWED_ROLE_ID = process.env.ALLOWED_ROLE_ID || "";
const execFileAsync = promisify(execFile);

if (!ALLOWED_USER_ID && !ALLOWED_ROLE_ID) {
  throw new Error(
    "PIDInfo command is disabled: ALLOWED_USER_ID and ALLOWED_ROLE_ID are not set."
  );
}

function truncate(text, max = 1000) {
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}

function formatEtime(etime) {
  // Handle common ps/busybox shapes; fall back to raw if unknown
  const patterns = [
    /^(?:(\d+)-)?(\d{1,2}):(\d{2}):(\d{2})$/, // dd-hh:mm:ss or hh:mm:ss
    /^(\d+)d(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/, // 2d03:04:09 or 2d03
    /^(\d+)d(\d{1,2})h(?:(\d{1,2})m)?(?:(\d{1,2})s)?$/, // 2d03h04m09s
    /^(\d{1,2}):(\d{2})$/,
    /^(\d+)d(\d{1,2})$/, // 2d03 (days + hours only)
  ];

  for (const re of patterns) {
    const m = etime.match(re);
    if (!m) continue;
    const [, d = "0", h = "0", m1 = "0", s = "0"] = m;
    const days = Number(d || 0);
    const hours = Number(h || 0);
    const mins = Number(m1 || 0);
    const secs = Number(s || 0);

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    if (mins || hours || days) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    return parts.join(" ");
  }

  return etime;
}

async function fetchPidInfo(pid) {
  try {
    const { stdout } = await execFileAsync("ps", [
      "-p",
      String(pid),
      "-o",
      "pid,ppid,user,%cpu,%mem,etime,cmd",
    ]);

    const lines = stdout.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("PID not found");
    }

    const line = lines[1].trim();
    const match = line.match(
      /^(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\S+)\s+(.+)$/
    );

    if (!match) {
      throw new Error("Unable to parse ps output");
    }

    const [, parsedPid, ppid, user, cpu, mem, etime, cmd] = match;

    return {
      pid: Number(parsedPid),
      ppid: Number(ppid),
      user,
      cpu: Number(cpu),
      mem: Number(mem),
      etime,
      cmd,
    };
  } catch (err) {
    const stderr = err?.stderr || "";
    const busyboxPs =
      /unrecognized option: p/i.test(stderr) || /BusyBox/i.test(stderr);
    if (!busyboxPs) throw err;
    return fetchPidInfoBusybox(pid);
  }
}

async function fetchPidInfoBusybox(pid) {
  // BusyBox ps lacks -p and has limited columns; pull all and filter
  const { stdout } = await execFileAsync("ps", [
    "-o",
    "pid,ppid,user,etime,time,stat,args",
  ]);

  const lines = stdout.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("PID not found");
  }

  const rows = lines.slice(1);
  const row = rows.find((line) => line.trim().startsWith(`${pid} `));
  if (!row) {
    throw new Error("PID not found");
  }

  const match = row
    .trim()
    .match(/^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);

  if (!match) {
    throw new Error("Unable to parse ps output");
  }

  const [, parsedPid, ppid, user, etime, cputime, _stat, cmd] = match;

  const { cpu, mem } = await readProcUsage(pid);

  return {
    pid: Number(parsedPid),
    ppid: Number(ppid),
    user,
    cpu,
    mem,
    etime,
    cmd,
  };
}

async function readProcUsage(pid) {
  const [cpu, mem] = await Promise.all([
    sampleCpuPercent(pid).catch(() => 0),
    sampleMemPercent(pid).catch(() => 0),
  ]);
  return { cpu, mem };
}

async function sampleCpuPercent(pid, delayMs = 250) {
  const [total1, proc1] = await Promise.all([
    readTotalJiffies(),
    readProcJiffies(pid),
  ]);
  await sleep(delayMs);
  const [total2, proc2] = await Promise.all([
    readTotalJiffies(),
    readProcJiffies(pid),
  ]);

  const totalDelta = total2.total - total1.total;
  const procDelta = proc2.total - proc1.total;
  if (totalDelta > 0 && procDelta >= 0) {
    const pct = (procDelta / totalDelta) * 100;
    if (pct > 0) return pct;
  }

  // Fallback to lifetime average if instantaneous delta is zero
  const uptime = await readUptimeSeconds();
  const procTicks = proc2.total;
  const startTicks = proc2.start;
  const clkTck = getClkTck();
  const elapsed = Math.max(0.01, uptime - startTicks / clkTck);
  return (procTicks / clkTck / elapsed) * 100;
}

async function sampleMemPercent(pid) {
  const status = await fs.readFile(`/proc/${pid}/status`, "utf8");
  const meminfo = await fs.readFile("/proc/meminfo", "utf8");

  const rssLine = status.split("\n").find((l) => l.startsWith("VmRSS:"));
  if (!rssLine) return 0;
  const rssKb = Number(rssLine.replace(/[^\d]/g, ""));
  if (!rssKb) return 0;

  const totalLine = meminfo.split("\n").find((l) => l.startsWith("MemTotal:"));
  if (!totalLine) return 0;
  const totalKb = Number(totalLine.replace(/[^\d]/g, ""));
  if (!totalKb) return 0;

  return (rssKb / totalKb) * 100;
}

async function readTotalJiffies() {
  const firstLine = (await fs.readFile("/proc/stat", "utf8")).split("\n")[0];
  const parts = firstLine.trim().split(/\s+/).slice(1);
  return { total: parts.reduce((sum, val) => sum + Number(val || 0), 0) };
}

async function readProcJiffies(pid) {
  const stat = await fs.readFile(`/proc/${pid}/stat`, "utf8");
  const parts = stat.trim().split(/\s+/);
  const utime = Number(parts[13] || 0);
  const stime = Number(parts[14] || 0);
  const start = Number(parts[21] || 0);
  return { total: utime + stime, start };
}

async function readUptimeSeconds() {
  const content = await fs.readFile("/proc/uptime", "utf8");
  const seconds = Number(content.split(/\s+/)[0] || 0);
  return seconds;
}

function getClkTck() {
  const env = Number(process.env.CLOCK_TICK_RATE || 0);
  if (env > 0) return env;
  const osTicks = os.constants?.clockTicks;
  if (typeof osTicks === "number" && osTicks > 0) return osTicks;
  return 100; // common default
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmbed(info) {
  return new EmbedBuilder()
    .setTitle(`ℹ️ Process ${info.pid}`)
    .addFields(
      { name: "PID", value: `${info.pid}`, inline: true },
      { name: "PPID", value: `${info.ppid}`, inline: true },
      { name: "User", value: info.user, inline: true },
      { name: "CPU %", value: info.cpu.toFixed(1), inline: true },
      { name: "MEM %", value: info.mem.toFixed(1), inline: true },
      { name: "Uptime", value: formatEtime(info.etime), inline: true },
      { name: "Command", value: truncate(info.cmd) }
    )
    .setColor(0x2b2d31)
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pidinfo")
    .setDescription("🔎 Show detailed info for a PID")
    .addIntegerOption((option) =>
      option
        .setName("pid")
        .setDescription("Process ID to inspect")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(2147483647)
    ),

  async execute(interaction) {
    const allowedByUser =
      ALLOWED_USER_ID && interaction.user.id === ALLOWED_USER_ID;

    const allowedByRole =
      ALLOWED_ROLE_ID &&
      interaction.inGuild() &&
      interaction.member?.roles?.cache.has(ALLOWED_ROLE_ID);

    if (!allowedByUser && !allowedByRole) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }
    const pid = interaction.options.getInteger("pid", true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const info = await fetchPidInfo(pid);
      const embed = buildEmbed(info);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Error in /pidinfo command:", err);
      const message =
        err?.message === "PID not found"
          ? "❌ No process found for that PID."
          : "❌ Failed to fetch PID info.";

      await interaction.editReply({ content: message });
    }
  },
};