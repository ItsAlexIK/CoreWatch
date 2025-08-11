require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { getSystemStats } = require("./src/utils/status");
const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");
const deployCommands = require("./deploy-commands");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

deployCommands()
  .then(() => {
    console.log("✅ Slash commands deployed!");
  })
  .catch((err) => {
    console.error("❌ Failed to deploy commands:", err);
  });

const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

let statusMessage = null;
let isRateLimited = false;
let lastStats = null;
let channel = null;

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

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
            name: "🧠 RAM Memory",
            value: `\`\`\`yaml\n${stats.memory}\n\`\`\``,
            inline: true,
          },
          {
            name: "🔥 CPU Temperature",
            value:
              stats.temperature === "N/A"
                ? "`No data`"
                : `\`\`\`fix\n${stats.temperature} °C\n\`\`\``,
            inline: true,
          },
          {
            name: "⚙️ CPU Load",
            value: `\`\`\`css\n${stats.cpuUsage} %\n\`\`\``,
            inline: true,
          },
          {
            name: "💾 Disk",
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
        console.error("Error:", error);
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
    console.log("Channel has been cleared.");
  } catch (err) {
    console.error("Error while clearing channel:", err);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error("Command error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ An error occurred while executing the command.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "❌ An error occurred while executing the command.",
        ephemeral: true,
      });
    }
  }
});

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  await clearChannelMessages(channel);

  updateLoop();
});

client.login(process.env.DISCORD_TOKEN);
