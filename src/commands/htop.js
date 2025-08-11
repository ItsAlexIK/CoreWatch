const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const si = require("systeminformation");

const ALLOWED_USER_ID = "123456789012345678"; // REPLACE WITH YOUR USER ID

function getUniqueProcessesByName(processList) {
  const map = new Map();

  for (const proc of processList) {
    if (!map.has(proc.name)) {
      map.set(proc.name, proc);
    } else {
      const existing = map.get(proc.name);
      if (proc.cpu + proc.mem > existing.cpu + existing.mem) {
        map.set(proc.name, proc);
      }
    }
  }

  return [...map.values()];
}

function generateEmbed(processes, page, pageSize) {
  const totalPages = Math.ceil(processes.length / pageSize);
  const start = page * pageSize;
  const current = processes.slice(start, start + pageSize);

  const fields = current.map((proc, i) => {
    const name =
      proc.name.length > 20 ? proc.name.slice(0, 17) + "…" : proc.name;
    return {
      name: `🔹 #${start + i + 1} • **${name}**`,
      value: `PID: \`${proc.pid}\`\nCPU: \`${proc.cpu.toFixed(
        1
      )}%\`\nMEM: \`${proc.mem.toFixed(1)}%\`\n────────────`,
      inline: true,
    };
  });

  return new EmbedBuilder()
    .setTitle("📄 List of Active Processes")
    .addFields(fields)
    .setColor(0x2b2d31)
    .setFooter({
      text: `Page ${
        page + 1
      } of ${totalPages} • ${new Date().toLocaleString()}`,
      iconURL: "https://cdn-icons-png.flaticon.com/512/2920/2920346.png",
    })
    .setTimestamp();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("htop")
    .setDescription("📊 Displays a list of unique processes like `htop`."),

  async execute(interaction) {
    if (interaction.user.id !== ALLOWED_USER_ID) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const { list } = await si.processes();
      const unique = getUniqueProcessesByName(list);
      const sorted = unique.sort((a, b) => b.cpu - a.cpu);
      const pageSize = 9;
      let page = 0;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setEmoji("⬅️")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("next")
          .setEmoji("➡️")
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = generateEmbed(sorted, page, pageSize);
      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        time: 90_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "prev" && page > 0) page--;
        if (i.customId === "next" && (page + 1) * pageSize < sorted.length)
          page++;

        const newEmbed = generateEmbed(sorted, page, pageSize);
        await i.update({ embeds: [newEmbed], components: [row] });
      });

      collector.on("end", async () => {
        const disabledRow = new ActionRowBuilder().addComponents(
          row.components.map((btn) => btn.setDisabled(true))
        );
        await message.edit({ components: [disabledRow] });
      });
    } catch (err) {
      console.error("Błąd komendy /htop:", err);
      await interaction.editReply(
        "❌ Wystąpił błąd podczas pobierania procesów."
      );
    }
  },
};
