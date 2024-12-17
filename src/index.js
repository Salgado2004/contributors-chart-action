const core = require('@actions/core');
const github = require('@actions/github');
const utils = require("./utils");

async function run() {
    try {
        const token = core.getInput('token');
        const octokit = github.getOctokit(token);

        core.info("Request README data");

        const readme = await octokit.rest.repos.getReadme({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        });

        const content = Buffer.from(readme.data.content, 'base64').toString();

        const contributors = await octokit.rest.repos.listContributors({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        });

        core.info("Gather contributors list");

        const contributorsList = contributors.data.map(contributor => [contributor.login, contributor.avatar_url, contributor.html_url]);

        const contributorsChart = utils.createChart(contributorsList);

        const indexes = utils.findIndexes(content);

        core.info("Update README content");

        const newContent = content.slice(0, indexes[0]) + "\n" + contributorsChart + "\n" + content.slice(indexes[1]);

        const contentEncoded = Buffer.from(newContent).toString('base64');

        core.info("Commit updates");

        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            path: "README.md",
            sha: readme.data.sha,
            message: "docs: create or update contributors chart",
            content: contentEncoded
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();