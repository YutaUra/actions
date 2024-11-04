// @ts-ignore
import * as core from "@actions/core";
import { Prettify, InputOptions, InputsValues } from "github-action-yaml"

export const raw = {
  "name": "Yutaura/actions/update-action-readme",
  "author": "Yutaura",
  "description": "A GitHub Action to update the README of an action",
  "inputs": {
    "cwd": {
      "description": "The working directory to run the action in",
      "required": false,
      "default": "."
    },
    "token": {
      "description": "The GitHub token to use for authentication",
      "required": true
    },
    "setup-git-user": {
      "description": "Whether to set up the git user",
      "required": false,
      "default": "true"
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
}

export type Outputs = {

}

const getInput = {
  string: core.getInput,
  boolean: core.getBooleanInput,
  multiline: core.getMultilineInput,
};

export const parseInputs = <T extends InputOptions<typeof raw>>(options?: T): Prettify<Inputs<T>> => {
  return {
    "cwd": getInput[options?.["cwd"]?.type ?? "string"]("cwd", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "token": getInput[options?.["token"]?.type ?? "string"]("token", {trimWhitespace: options?.cwd?.trimWhitespace}),
    "setup-git-user": getInput[options?.["setup-git-user"]?.type ?? "string"]("setup-git-user", {trimWhitespace: options?.cwd?.trimWhitespace}),
  } as Inputs<T>;
}

export const dumpOutputs = (outputs: Partial<Outputs>) => {
  for (const [name, value] of Object.entries(outputs)) {
    core.setOutput(name, value)
  }
}
