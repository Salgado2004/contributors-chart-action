const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const token = core.getInput('token');
        const octokit = github.getOctokit(token);

        const readme = await octokit.repos.getReadme({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo
        });

        console.log(readme.data);

        const readmeContent = Buffer.from(readme.data.content, 'base64').toString();
        
        console.log(readmeContent);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();