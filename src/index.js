const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const repository = github.context.payload.repository;
        console.log(repository);
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();