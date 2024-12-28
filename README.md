# Contributors README Chart Generator
A GitHub Action that generates a HTML chart of the repository or organization contributors and places it in your README.

> [!note]
> This is still a Beta version of the Action, currently in preview. If you have suggestions please refer to [contributing](CONTRIBUTING.md)

![Example 1](docs/example1.png)

### Support

| runner         | support |
| -------------- | ------- |
| windows-latest | ✅     |
| ubuntu-latest  |         |
| macos-latest   |         |

### Usage
1. In the desired repository, update the README markdown with these two (2) comments:
```markdown
<!-- contributors -->
<!-- /contributors -->
```
> [!important]
> The comments are used to mark where the action should place the generated chart. Without them, the action will fail.

2. Create the GitHub Actions workflow. You need to provide a `GitHub Token` with **write** permissions

```yaml
jobs:
  generate-chart:
      runs-on: windows-latest
      name: Create or update contributors chart
      permissions:
        contents: write
      steps:
        - uses: salgado2004/contributors-chart-action@main
          with:
            token: ${{ secrets.GITHUB_TOKEN }}
```

3. (**Optional**) You can provide the following optional inputs for your workflow:
- `contributions` ["repo", "org"]
  
  Allows you to choose if you want to gather the contributors for the current repository or the organization

  _Default_: "repo"

> [!warning]
> If you choose "org", the action needs to run in a repository that belongs to an organization.
>
> **Also**: It only shows public members of the organization.

- `include-bots` [true, false]

  Allows you to choose whether you want the action to include bot contributors (dependabot, github-actions bot, etc.) or not.

  _Default_: true

### License
The scripts and documentation in this project are released under the [MIT License](LICENSE)

![Example 2](docs/example2.png)

---

**&copy; Salgado2004**