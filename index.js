require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { getSystemStats } = require("./src/utils/status");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let statusMessage = null;
let isRateLimited = false;
let lastStats = null;
let channel = null;

function hasStatsChanged(newStats, oldStats) {
  if (!oldStats) return true;
  return (
    newStats.cpuUsage !== oldStats.cpuUsage ||
    newStats.memory !== oldStats.memory ||
    newStats.temperature !== oldStats.temperature ||
    newStats.diskUsage !== oldStats.diskUsage ||
    newStats.uptime !== oldStats.uptime
  );
}

async function updateLoop() {
  const start = Date.now();

  if (!isRateLimited) {
    try {
      const stats = await getSystemStats();

      if (!hasStatsChanged(stats, lastStats)) {
        scheduleNext(start);
        return;
      }

      lastStats = stats;

      const embed = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setAuthor({
          name: "📡 Status",
          iconURL: "https://cdn-icons-png.flaticon.com/512/2920/2920346.png",
        })
        .addFields(
          {
            name: "🧠 Pamięć RAM",
            value: `\`\`\`yaml\n${stats.memory}\n\`\`\``,
            inline: true,
          },
          {
            name: "🔥 Temperatura CPU",
            value:
              stats.temperature === "N/A"
                ? "`Brak danych`"
                : `\`\`\`fix\n${stats.temperature} °C\n\`\`\``,
            inline: true,
          },
          {
            name: "⚙️ Obciążenie CPU",
            value: `\`\`\`css\n${stats.cpuUsage} %\n\`\`\``,
            inline: true,
          },
          {
            name: "💾 Dysk",
            value: `\`\`\`yaml\n${stats.diskUsage}\n\`\`\``,
            inline: true,
          },
          {
            name: "⏱️ Uptime",
            value: `\`\`\`diff\n+ ${stats.uptime}\n\`\`\``,
            inline: true,
          }
        )
        .setFooter({
          text: `Monitoring • ${new Date().toLocaleString()}`,
          iconURL: "https://cdn-icons-png.flaticon.com/512/2698/2698993.png",
        })
        .setTimestamp();

      if (!statusMessage) {
        statusMessage = await channel.send({ embeds: [embed] });
      } else {
        await statusMessage.edit({ embeds: [embed] });
      }
    } catch (error) {
      if (
        error.code === 20028 ||
        error.code === 50013 ||
        error.httpStatus === 429
      ) {
        console.warn("Rate limit hit!");
        isRateLimited = true;
        setTimeout(() => {
          isRateLimited = false;
        }, 5000);
      } else {
        console.error("Błąd:", error);
      }
    }
  }

  scheduleNext(start);
}

function scheduleNext(startTime) {
  const elapsed = Date.now() - startTime;
  const delay = Math.max(1000 - elapsed, 0);
  setTimeout(updateLoop, delay);
}

async function clearChannelMessages(channel) {
  try {
    let fetched;
    do {
      fetched = await channel.messages.fetch({ limit: 100 });
      const deletable = fetched.filter((msg) => msg.deletable);
      if (deletable.size > 0) {
        await channel.bulkDelete(deletable, true);
      }
    } while (fetched.size >= 2);
    console.log("Kanał został wyczyszczony.");
  } catch (err) {
    console.error("Błąd podczas czyszczenia kanału:", err);
  }
}

client.once("ready", async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  await clearChannelMessages(channel);

  updateLoop();
});

client.login(process.env.DISCORD_TOKEN);
