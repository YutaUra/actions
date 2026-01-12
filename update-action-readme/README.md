# update-action-readme

This GitHub Action updates the README files of GitHub Actions.

## Specification

To run this action, create a workflow as follows:

```yaml
# .github/workflows/update-readme.yaml
name: update README

on:
  pull_request:
    branches:
      - main

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: YutaUra/actions/update-action-readme@0.0.73
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

```

### Inputs

<!-- update-action-readme:inputs:start -->
| Name           | Default | Description                                |
| -------------- | ------- | ------------------------------------------ |
| cwd            | .       | The working directory to run the action in |
| token          |         | The GitHub token to use for authentication |
| setup-git-user | true    | Whether to set up the git user             |
<!-- update-action-readme:inputs:end -->

### Outputs

<!-- update-action-readme:outputs:start -->
| Name | Description |
| ---- | ----------- |
<!-- update-action-readme:outputs:end -->

## Development

### Keep consistency of generated files

If a pull request needs to be fixed by Prettier, an additional commit to fix it will be added by GitHub Actions.
See https://github.com/int128/update-generated-files-action for details.

### Dependency update

You can enable Renovate to update the dependencies.
This repository is shipped with the config https://github.com/int128/typescript-action-renovate-config.
