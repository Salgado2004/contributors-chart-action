const core = require('@actions/core');
const github = require('@actions/github');



async function run() {
    try {
        const token = core.getInput('token');
        const octokit = github.getOctokit(token);

        const readme = await octokit.rest.repos.getReadme({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        });

        const content = Buffer.from(readme.data.content, 'base64').toString();

        const contributors = await octokit.rest.repos.listContributors({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        });

        const contributorsList = contributors.data.map(contributor => (contributor.login, contributor.avatar_url));

        console.log(contributorsList);

        const newContent = content + '\n\n' + "## New Content";

        const contentEncoded = Buffer.from(newContent).toString('base64');

        const { data } = await octokit.rest.repos.createOrUpdateFileContents({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            path: "README.md",
            sha: readme.data.sha,
            message: "docs: Add new content",
            content: contentEncoded
        });

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();