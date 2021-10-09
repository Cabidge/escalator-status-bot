import {
    SlashLeafOptions,
    SlashCommandLeaf,
    SlashBranchOptions,
    SlashCommandBranch,
    SlashCommandRoot,
    SlashRootOptions,
    SlashCommandType,
} from "./types";

export * from "./types";

export const slashLeaf = (options: SlashLeafOptions): SlashCommandLeaf => ({
    ...options,
    type: SlashCommandType.Leaf,
    toJson(type = 1) {
        const { name, description, options } = this;
        return {
            name,
            description,
            type,
            options,
        };
    },
});

export const slashBranch = (
    options: SlashBranchOptions
): SlashCommandBranch => ({
    ...options,
    type: SlashCommandType.Branch,
    toJson(type = 2) {
        const { name, description, commands } = this;
        const options = commands.map((command) => command.toJson());
        return {
            name,
            description,
            type,
            options,
        };
    },
});

export const slashRoot = (options: SlashRootOptions): SlashCommandRoot => ({
    ...options,
    type: SlashCommandType.Root,
    toJson(type = 1) {
        const { name, description, groups } = this;
        const options = groups.map((group) => group.toJson());
        return {
            name,
            description,
            type,
            options,
        };
    },
});
