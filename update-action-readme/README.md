# update-action-readme

This is a GitHub Action to create changeset for Renovate.

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
      - uses: YutaUra/actions/update-action-readme@0.0.5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

```

### Inputs

| Name             | Default | Description           |
| ---------------- | ------- | --------------------- |
| `cwd`            | `.`     | The working directory |
| `token`          |         | The GitHub token      |
| `setup-git-user` | `true`  | Setup git user        |

### Outputs

## Development

### Keep consistency of generated files

If a pull request needs to be fixed by Prettier, an additional commit to fix it will be added by GitHub Actions.
See https://github.com/int128/update-generated-files-action for details.

### Dependency update

You can enable Renovate to update the dependencies.
This repository is shipped with the config https://github.com/int128/typescript-action-renovate-config.
