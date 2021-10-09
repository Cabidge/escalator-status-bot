import { APIApplicationCommandOption } from "discord-api-types";
import { CommandInteraction } from "discord.js";

export type SlashCommand =
    | SlashCommandLeaf
    | SlashCommandBranch
    | SlashCommandRoot;

export interface SlashCommandLeaf extends SlashLeafOptions, SlashCommandBase {
    type: SlashCommandType.Leaf;
}

export interface SlashCommandBranch
    extends SlashCommandBase,
        SlashBranchOptions {
    type: SlashCommandType.Branch;
}

export interface SlashCommandRoot extends SlashCommandBase, SlashRootOptions {
    type: SlashCommandType.Root;
}

interface SlashCommandBase {
    toJson(type?: number): APIApplicationCommandOption;
    type: SlashCommandType;
}

export enum SlashCommandType {
    Leaf,
    Branch,
    Root,
}

export interface SlashLeafOptions extends SlashOptionsBase {
    execute: SlashCommandExecute;
    options?: CommandOption[];
}

export interface SlashBranchOptions extends SlashOptionsBase {
    commands: SlashCommandLeaf[];
}

export interface SlashRootOptions extends SlashOptionsBase {
    groups: SlashCommandBranch[];
}

interface SlashOptionsBase {
    name: string;
    description: string;
}

export type SlashCommandExecute = (
    interaction: CommandInteraction
) => Promise<void>;

export interface CommandOption {
    type: OptionType;
    name: string;
    description: string;
    required?: boolean;
    choices?: CommandChoice[];
}

export enum OptionType {
    String = 3,
    Integer,
    Boolean,
    User,
    Channel,
    Role,
    Mentionable,
    Number,
}

export interface CommandChoice {
    name: string;
    value: string | number;
}
