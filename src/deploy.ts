import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";

import { commands } from "./commands";
import { TOKEN } from "./token";

const clientId = "896193119727550485";
const guildId = "896193605125935245";

const rest = new REST({ version: "9" }).setToken(TOKEN);

const commandData = {
    body: commands.map((command) => command.toJson(1)),
};

rest.put(Routes.applicationGuildCommands(clientId, guildId), commandData)
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
