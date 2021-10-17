import { Octokit } from "@octokit/rest";

interface FileInfo {
    owner: string;
    repo: string;
    path: string;
}

interface RepoFileOptions extends FileInfo {
    token: string;
    userAgent: string;
    defaultContent: string;
}

export class RepoFile {
    public content: string;
    private sha?: string;
    private readonly octo: Octokit;
    private readonly fileInfo: Readonly<FileInfo>;

    constructor({
        token: auth,
        userAgent,
        defaultContent,
        owner,
        repo,
        path,
    }: RepoFileOptions) {
        this.octo = new Octokit({
            auth,
            userAgent,
        });
        this.fileInfo = { owner, repo, path };
        this.content = defaultContent;
    }

    private async getDecodedFile(): Promise<{
        content: string;
        sha: string;
    } | null> {
        try {
            const content = await this.octo.rest.repos.getContent(
                this.fileInfo
            );

            const { data } = content;
            if (!("content" in data))
                throw new Error(
                    "No content found or path is not a file: " +
                        JSON.stringify(content, undefined, 2)
                );

            const buff = Buffer.from(data.content, "base64");

            return {
                content: buff.toString(),
                sha: data.sha,
            };
        } catch (e: any) {
            if ("status" in e && e.status === 404) return null;
            throw e;
        }
    }

    async pull() {
        const res = await this.getDecodedFile();

        if (res !== null) {
            const { content, sha } = res;
            this.content = content;
            this.sha = sha;
            return true;
        } else {
            this.sha = undefined;
            return false;
        }
    }

    async pullShaOnly() {
        const res = await this.getDecodedFile();
        this.sha = res?.sha;
        return res !== null;
    }

    async push(message: string = "", pullSha: boolean = false) {
        const buff = Buffer.from(this.content);
        if (pullSha) await this.pullShaOnly();

        try {
            await this.octo.rest.repos.createOrUpdateFileContents({
                ...this.fileInfo,
                sha: this.sha,
                content: buff.toString("base64"),
                message: message,
            });
            return true;
        } catch (e: any) {
            // Conflict error
            if ("status" in e && e.status === 409) return false;
            throw e;
        }
    }
}

type Reviver = NonNullable<Parameters<typeof JSON.parse>[1]>;

interface RepoJsonOptions extends Omit<RepoFileOptions, "defaultContent"> {
    defaultObj?: any;
    reviver?: Reviver;
}

export class RepoJson {
    public obj: any;
    private readonly file: RepoFile;
    private readonly reviver?: Reviver;

    constructor(options: RepoJsonOptions) {
        this.reviver = options.reviver;

        const { defaultObj = {} } = options;
        this.obj = { ...defaultObj };

        const defaultContent = JSON.stringify(defaultObj);
        this.file = new RepoFile({
            ...options,
            defaultContent,
        });
    }

    async pull() {
        const success = await this.file.pull();
        if (success) this.obj = JSON.parse(this.file.content, this.reviver);
        return success;
    }

    pullShaOnly = () => this.file.pullShaOnly();

    push(...args: Parameters<RepoFile["push"]>) {
        this.file.content = JSON.stringify(this.obj);
        return this.file.push(...args);
    }
}
