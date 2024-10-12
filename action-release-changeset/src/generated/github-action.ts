// @ts-ignore
import * as core from "@actions/core";
import { Prettify, InputOptions, InputsValues } from "github-action-yaml"

export const raw = {
  "name": "Yutaura/actions/action-release-changeset",
  "author": "Yutaura",
  "description": "A GitHub Action to release changesets",
  "inputs": {
    "cwd": {
      "description": "The working directory to run the action in",
      "required": false,
      "default": "."
    },
    "commit-message": {
      "description": "The commit message to use when committing the changeset",
      "required": false
    },
    "pr-title": {
      "description": "The title of the pull request",
      "required": false
    },
    "token": {
      "description": "The GitHub token to use for authentication",
      "required": true
    },
    "setup-git-user": {
      "description": "Whether to set up the git user",
      "required": false,
      "default": "true"
    },
    "auto-merge": {
      "description": "Whether to automatically merge the pull request",
      "required": false,
      "default": "false"
    },
    "pre-tag-script": {
      "description": "A script to run before tagging the release",
      "required": false
    }
  },
  "outputs": {
    "pr-number": {
      "description": "The number of the pull request that was created"
    },
    "published": {
      "description": "Whether the changeset was published"
    }
  },
  "runs": {
    "using": "node20",
    "main": "dist/main.cjs"
  }
} as const;

export type Inputs<T extends InputOptions<typeof raw> = InputOptions<typeof raw>, V extends InputsValues<typeof raw, T> = InputsValues<typeof raw,T>> = {
  /**
   * The working directory to run the action in
   * 
   * @default .
    */
  'cwd': V["cwd"];
  /**
   * The commit message to use when committing the changeset
   * 
    */
  'commit-message'?: V["commit-message"];
  /**
   * The title of the pull request
   * 
    */
  'pr-title'?: V["pr-title"];
  /**
   * The GitHub token to use for authentication
   * 
    */
  'token': V["token"];
  /**
   * Whether to set up the git user
   * 
   * @default true
    */
  'setup-git-user': V["setup-git-user"];
  /**
   * Whether to automatically merge the pull request
   * 
   * @default false
    */
  'auto-merge': V["auto-merge"];
  /**
   * A script to run before tagging the release
   * 
    */
  'pre-tag-script'?: V["pre-tag-script"];
}

export type Outputs = {
  /**
   * The number of the pull request that was created
   * 
   */
  'pr-number'?: string;
  /**
   * Whether the changeset was published
   * 
   */
  'published'?: string;
}

const getInput = {
  string: core.getInput,
  boolean: core.getBooleanInput,
  multiline: core.getMultilineInput,
};

export const parseInputs = <T extends InputOptions<typeof raw>>(options?: T): Prettify<Inputs<T>> => {
  return {
    "cwd": getInput[options?.["cwd"]?.type ?? "string"]("cwd", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "commit-message": getInput[options?.["commit-message"]?.type ?? "string"]("commit-message", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "pr-title": getInput[options?.["pr-title"]?.type ?? "string"]("pr-title", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "token": getInput[options?.["token"]?.type ?? "string"]("token", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "setup-git-user": getInput[options?.["setup-git-user"]?.type ?? "string"]("setup-git-user", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "auto-merge": getInput[options?.["auto-merge"]?.type ?? "string"]("auto-merge", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "pre-tag-script": getInput[options?.["pre-tag-script"]?.type ?? "string"]("pre-tag-script", {trimWhitespace: options?.cwd?.trimWhitespace}),
  } as Inputs<T>;
}

export const dumpOutputs = (outputs: Partial<Outputs>) => {
  for (const [name, value] of Object.entries(outputs)) {
    core.setOutput(name, value)
  }
}
