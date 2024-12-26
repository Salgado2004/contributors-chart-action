const utils = require('./utils');
const core = require('@actions/core');

async function run() {
    try {
        core.info("Setting up environment");
        const token = core.getInput('token');
        const octokit = github.getOctokit(token);
        const env = await utils.setUpEnvironment(octokit);

        core.info("Request README data");
        const readme = await octokit.rest.repos.getReadme({ owner: env.owner, repo: env.repo });
        const content = Buffer.from(readme.data.content, 'base64').toString();

        core.info("Gather contributors list");
        const contributors = await octokit.rest.repos.listContributors({ owner: env.owner, repo: env.repo });
        const contributorsList = contributors.data.map(contributor => [contributor.login, contributor.avatar_url, contributor.html_url]);
        const contributorsChart = await utils.createChart(contributorsList);

        
        core.info("Update README content");
        const indexes = utils.findIndexes(content);
        const newContent = content.slice(0, indexes[0]) + "\n" + contributorsChart + "\n" + content.slice(indexes[1]);
        const contentEncoded = Buffer.from(newContent).toString('base64');

        core.info("Commit updates");

        /* await octokit.rest.repos.createOrUpdateFileContents({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            path: "README.md",
            sha: readme.data.sha,
            message: "docs: create or update contributors chart",
            content: contentEncoded,
            branch: "actionsbot/update-contributors"
        });

        await octokit.rest.pulls.create({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            head: "development",
            base: "actionsbot/update-contributors"
        }); */

    } catch (error) {
        core.setFailed("Action failed: ", error);
    }
}

run();