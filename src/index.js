const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const core = require('@actions/core');

async function run() {
    try {
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;

        core.info(`Starting action: version ${version}`);
        
        const contributions = core.getInput('contributions');
        const includeBots = core.getInput('include-bots') !== 'false';

        core.info("Setting up environment");
        const env = await utils.setUpEnvironment();

        core.info("Request README data");
        core.debug(`Fetching README for owner: ${env.owner}, repo: ${env.repo}`);
        let readme;
        if (env.path) {
            readme = await env.octokit.rest.repos.getReadmeInDirectory({ owner: env.owner, repo: env.repo, dir: env.path, ref: env.ref });
        } else {
            readme = await env.octokit.rest.repos.getReadme({ owner: env.owner, repo: env.repo, ref: env.ref });
        }
        const content = Buffer.from(readme.data.content, 'base64').toString();

        core.info("Gather contributors list");
        core.debug(`Listing contributors for owner: ${env.owner}, repo: ${env.repo}`);

        let contributors;
        if (contributions === 'org') {
            contributors = await env.octokit.rest.orgs.listMembers({ org: env.owner });
        } else {
            contributors = await env.octokit.rest.repos.listContributors({ owner: env.owner, repo: env.repo });
        }

        if (!includeBots) {
            contributors.data = contributors.data.filter(contributor => contributor.type === "User");
        }

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
        await utils.commitReadme(env, { content: contentEncoded, sha: readme.data.sha, path: env.path });

        const diff = await utils.compareBranches(env);
        if (diff.status === 'identical') {
            core.info("No new contributors included! Finishing job");
            await env.octokit.rest.git.deleteRef({ owner: env.owner, repo: env.repo, ref: `heads/${env.ref}` });
            return;
        }

        const changedFiles = diff.files.filter(file => file.status !== 'unchanged');
        if (changedFiles.length === 0) {
            core.info("No new contributors included! Finishing job");
            await env.octokit.rest.git.deleteRef({ owner: env.owner, repo: env.repo, ref: `heads/${env.ref}` });
            return;
        }

        core.info(`Contributors chart created successfully! Check the branch ${env.ref} for the updates and merge the changes to the main branch. ;D`);
    } catch (error) {
        core.setFailed(`Action failed: ${error.message}`, error);
    }
}

run();