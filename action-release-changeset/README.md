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

      - uses: YutaUra/actions/action-release-changeset@0.0.7
        env:
          # if auto-merge is true, you need to set GITHUB_TOKEN
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

```

### Inputs

<!-- update-action-readme:inputs:start -->
<!-- update-action-readme:inputs:end -->

### Outputs

<!-- update-action-readme:outputs:start -->
<!-- update-action-readme:outputs:end -->

## Development

### Keep consistency of generated files

If a pull request needs to be fixed by Prettier, an additional commit to fix it will be added by GitHub Actions.
See https://github.com/int128/update-generated-files-action for details.

### Dependency update

You can enable Renovate to update the dependencies.
This repository is shipped with the config https://github.com/int128/typescript-action-renovate-config.
