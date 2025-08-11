require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, "src", "commands");
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] Command in file ${file} is missing "data" or "execute".`
      );
    }
  }

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(`⏳ Registering ${commands.length} commands...`);

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );

    console.log("✅ Successfully registered slash commands.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
    throw error;
  }
}

module.exports = deployCommands;
