const utils = require('./utils');
const github = require('@actions/github');
const core = require('@actions/core');

async function run() {
    try {
        core.info("Setting up environment");
        core.debug("Fetching token");
        const token = core.getInput('token');
        core.debug("Setting up environment with token");
        const env = await utils.setUpEnvironment(token);

        core.info("Request README data");
        core.debug(`Fetching README for owner: ${env.owner}, repo: ${env.repo}`);
        const readme = await env.octokit.rest.repos.getReadme({ owner: env.owner, repo: env.repo, ref: env.ref });
        const content = Buffer.from(readme.data.content, 'base64').toString();

        core.info("Gather contributors list");
        core.debug(`Listing contributors for owner: ${env.owner}, repo: ${env.repo}`);
        const contributors = await env.octokit.rest.repos.listContributors({ owner: env.owner, repo: env.repo });
        const contributorsList = contributors.data.map(contributor => [contributor.login, contributor.avatar_url, contributor.html_url]);
        core.info("Creating chart...");
        core.debug("Creating chart with contributors list");
        const contributorsChartData = await utils.createChart(contributorsList, env);
        
        core.info("Update README content");
        core.debug("Finding indexes in README content");
        const indexes = utils.findIndexes(content);
        const newContent = content.slice(0, indexes[0]) + "\n" + contributorsChartData.chart + "\n" + content.slice(indexes[1]);
        const contentEncoded = Buffer.from(newContent).toString('base64');

        core.info("Push updates");
        core.debug("Committing contributors data");
        await utils.commitContributors(env, contributorsChartData.images);
        core.debug("Committing updated README");
        await utils.commitReadme(env, { content: contentEncoded, sha: readme.data.sha });

        core.debug("Creating pull request");
        await env.octokit.rest.pulls.create({ owner: env.owner, repo: env.repo, head: env.defaultBranch, base: env.ref });

        core.info("Contributors chart created successfully! Please check the opened PR");
    } catch (error) {
        core.setFailed(`Action failed: ${error.message}`, error);
    }
}

run();