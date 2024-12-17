const core = require('@actions/core');
const github = require('@actions/github');
const { createCanvas, loadImage } = require('canvas');

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
    const canvas = createCanvas(100,100);
    const ctx = canvas.getContext('2d');
    const image = await loadImage(path);

    const radius = 50;
    const centerx = canvas.width / 2;
    const centery = canvas.height / 2;

    ctx.beginPath();
    ctx.arc(centerx, centery, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/png");

    return base64Image;
}

async function createChart(contributorsList){
    core.info("Building contributors chart...");
    let contributorsChart = "<table>\n\t<tr>\n";

    for(let [index, contributor] of contributorsList.entries) {
        core.info(`Processing contributor ${index+1}/${contributorsList.length}`);
        //const path = await processImage(contributor[1]);
        contributorsChart += 
`       <td align="center">
            <a href="${contributor[2]}">
                <img src="${contributor[1]}" width="100px" alt="${contributor[0]}"/>
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

        const contributorsChart = await createChart(contributorsList);

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