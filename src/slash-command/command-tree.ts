import { CommandInteraction } from "discord.js";
import { SlashCommand, SlashCommandExecute, SlashCommandType } from ".";

export function commandBranches({ commandName, options }: CommandInteraction) {
    const branches = [commandName];

    const group = options.getSubcommandGroup(false);
    if (group) branches.push(group);

    const subcommand = options.getSubcommand(false);
    if (subcommand) branches.push(subcommand);

    return branches;
}

export function navigateTree(tree: CommandTree, branches: string[]) {
    let head: CommandTree | SlashCommandExecute = tree;
    for (let branch of branches) {
        if (head instanceof Function) {
            return;
        }

        head = head[branch];
        if (!head) {
            return;
        }
    }

    if (head instanceof Function) {
        return head;
    }
}

export interface CommandTree {
    [key: string]: SlashCommandExecute | CommandTree;
}

export function createTree(commands: SlashCommand[]) {
    const tree: CommandTree = {};

    commands.forEach((command) => {
        let treeValue: CommandTree[""];
        switch (command.type) {
            case SlashCommandType.Root:
                treeValue = createTree(command.groups ?? []);
                break;
            case SlashCommandType.Branch:
                treeValue = createTree(command.commands);
                break;
            case SlashCommandType.Leaf:
                treeValue = command.execute;
        }

        tree[command.name] = treeValue;
    });
    return tree;
}
