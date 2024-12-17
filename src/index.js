const core = require('@actions/core');
const github = require('@actions/github');
const sharp = require("sharp");

function findIndexes(data){
    const startComment = '<!-- contributors -->';
    const endComment = '<!-- /contributors -->';
    const startIndex = data.indexOf(startComment) + startComment.length;
    const endIndex = data.indexOf(endComment);

    if(startIndex === -1 || endIndex === -1){
        core.warning("Comment markers not found");
        throw new Error("Unable to update README content");
    }

    if(startIndex >= endIndex){
        core.warning("Comment markers misplaced");
        throw new Error("Unable to update README content");
    }

    return [startIndex, endIndex];
}

async function processImage(path){
    const roundedCorners = Buffer.from(
        `<svg><rect x="0" y="0" width="100" height="100" rx="40" ry="40" /></svg>`
    );

    const buffer = await sharp(path)
    .resize(100,100)
    .composite([{ input: roundedCorners, blend: 'dest-in' }])
    .sharpen()
    .withMetadata()
    .toBuffer();

    const base64Image = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return dataUrl;
}

async function createChart(contributorsList){
    let contributorsChart = "<table>\n\t<tr>\n";

    for(let contributor of contributorsList) {
        const path = await processImage(contributor[1]);
        contributorsChart += 
`       <td align="center">
            <a href="${contributor[2]}">
                <img src="${path}" alt="${contributor[0]}"/>
                <p><strong>${contributor[0]}</strong></p>
            </a>
        </td>
`
    };

    contributorsChart += "\t</tr>\n</table>";

    return contributorsChart;
}

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

        const contributorsChart = createChart(contributorsList);

        const indexes = findIndexes(content);

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