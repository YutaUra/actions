# renovate-changeset

This is a GitHub Action to create changeset for Renovate.

## Specification

To run this action, create a workflow as follows:

```yaml
# .github/workflows/renovate-changeset.yaml
name: create changeset for PR created by Renovate

on:
  pull_request:
    branches:
      - main

jobs:
  update-changeset:
    runs-on: ubuntu-latest
    if: startsWith(github.head_ref, 'renovate/') && github.event.pull_request.user.login == 'renovate[bot]' && github.actor == 'renovate[bot]'
    steps:
      - uses: actions/checkout@v4
      - uses: YutaUra/actions/renovate-changeset
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