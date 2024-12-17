const core = require('@actions/core');
const github = require('@actions/github');

function findIndexes(data){
    const startComment = '<!-- contributors -->';
    const endComment = '<!-- /contributors -->';
    const startIndex = data.indexOf(startComment) + startComment.length;
    const endIndex = data.indexOf(endComment);

    if(startIndex === -1 || endIndex === -1){
        console.error('Marcadores não encontrados');
        return;
    }

    if(startIndex >= endIndex){
        console.error('Marcadores mal posicionados');
        return;
    }

    return [startIndex, endIndex];
}

function createChart(contributorsList){
    let contributorsChart = "<table><tr>"; // Changed from const to let

    contributorsList.forEach(contributor => {
        contributorsChart += `
        <td align="center">
            <img src="${contributor[1]}" width="100px;" alt="${contributor[0]}"/>
            <a href="${contributor[2]}"><strong>${contributor[0]}</strong></a>
        </td>
        `
    });

    contributorsChart += "</tr></table>";

    return contributorsChart;
}

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

        const contributorsList = contributors.data.map(contributor => [contributor.login, contributor.avatar_url, contributor.url]);

        const contributorsChart = createChart(contributorsList);

        const indexes = findIndexes(content);

        const newContent = content.slice(0, indexes[0]) + contributorsChart + content.slice(indexes[1]);

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