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
        console.log(content);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();