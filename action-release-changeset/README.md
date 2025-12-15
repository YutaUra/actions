# action-release-changeset

This action is a github action release manager using changeset.

## Specification

To run this action, create a workflow as follows:

```yaml
# .github/workflows/release.yaml
name: release

on:
  push:
    branches:
      - main

jobs:
  tag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4.1.7

      # build your github action
      # - run: pnpm build

      - uses: YutaUra/actions/action-release-changeset@0.0.68
        env:
          # if auto-merge is true, you need to set GITHUB_TOKEN
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

```

### Inputs

<!-- update-action-readme:inputs:start -->
| Name           | Default | Description                                             |
| -------------- | ------- | ------------------------------------------------------- |
| cwd            | .       | The working directory to run the action in              |
| commit-message |         | The commit message to use when committing the changeset |
| pr-title       |         | The title of the pull request                           |
| token          |         | The GitHub token to use for authentication              |
| setup-git-user | true    | Whether to set up the git user                          |
| auto-merge     | false   | Whether to automatically merge the pull request         |
| pre-tag-script |         | A script to run before tagging the release              |
<!-- update-action-readme:inputs:end -->

### Outputs

<!-- update-action-readme:outputs:start -->
| Name      | Description                                     |
| --------- | ----------------------------------------------- |
| pr-number | The number of the pull request that was created |
| published | Whether the changeset was published             |
<!-- update-action-readme:outputs:end -->

## Development

### Keep consistency of generated files

If a pull request needs to be fixed by Prettier, an additional commit to fix it will be added by GitHub Actions.
See https://github.com/int128/update-generated-files-action for details.

### Dependency update

You can enable Renovate to update the dependencies.
This repository is shipped with the config https://github.com/int128/typescript-action-renovate-config.
