import { CommandInteraction, GuildManager, GuildMember } from "discord.js";

export type CommandGuard = (interaction: CommandInteraction) => string | null;

export const guildOnly: CommandGuard = (interaction) =>
    interaction.inGuild()
        ? null
        : "This command can't be used outside of a guild!";

export const adminOnly: CommandGuard = (interaction) => {
    const notInGuild = guildOnly(interaction);
    if (notInGuild) return notInGuild;

    const member = interaction.member!;

    if (!(member instanceof GuildMember)) {
        console.log("APIMember:", member);
        return "An error ocurred attempting this command.";
    }

    return member.permissions.has("ADMINISTRATOR")
        ? null
        : "This command can only be used by administrators";
};
