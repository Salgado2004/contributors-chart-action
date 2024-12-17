const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        // Get the README DATA from the README.md file in the repository who triggered the action
        const readme = github.context.payload.repository.readme;
        console.log(readme);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();