const core = require('@actions/core');
const github = require('@actions/github');
const { createCanvas, loadImage } = require("canvas");

async function setUpEnvironment(octokit) {
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    try {
        const data = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = data.default_branch;
        const ref = "actionsbot/contributorsChart";

        try {
            await octokit.rest.repos.getBranch({ owner, repo, branch: ref });
            await octokit.rest.repos.merge({ owner, repo, ref, defaultBranch });
        } catch (error) {
            if (error.status === 404) {
                const data = await octokit.rest.repos.getBranch({ owner, repo, branch: defaultBranch });
                await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${ref}`, sha: data.commit.sha });
            }
            core.setFailed("Setting up environment failed: ", error);
        }
        return { owner: owner, repo: repo, defaultBranch: defaultBranch, ref: ref };
    } catch (error) {
        core.setFailed("Setting up environment failed: ", error);
    }
}

function findIndexes(data) {
    const startComment = '<!-- contributors -->';
    const endComment = '<!-- /contributors -->';
    const startIndex = data.indexOf(startComment) + startComment.length;
    const endIndex = data.indexOf(endComment);

    if (startIndex === -1 || endIndex === -1) {
        core.warning("Comment markers not found");
        throw new Error("Unable to update README content");
    }

    if (startIndex >= endIndex) {
        core.warning("Comment markers misplaced");
        throw new Error("Unable to update README content");
    }

    return [startIndex, endIndex];
}

async function processImage(path) {
    const canvas = createCanvas(80, 80);
    const ctx = canvas.getContext('2d');
    const image = await loadImage(path);

    const radius = 40;
    const centerx = canvas.width / 2;
    const centery = canvas.height / 2;

    ctx.beginPath();
    ctx.arc(centerx, centery, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/png');

    return base64Image;
}

async function createChart(contributorsList) {
    let contributorsChart = "<table>\n\t<tr>\n";
    let counter = 0;

    for (let contributor of contributorsList) {
        const path = await processImage(contributor[1]);
        contributorsChart +=
            `       <td align="center">
            <a href="${contributor[2]}">
                <img src="${path}" width="100px;" alt="${contributor[0]}" />
                <p><strong>${contributor[0]}</strong></p>
            </a>
        </td>
`
        counter++;
        if (counter == 6) {
            contributorsChart += "\t</tr>\n\t<tr>\n"
            counter = 0;
        }
    };

    contributorsChart += "\t</tr>\n</table>";

    return contributorsChart;
}

module.exports = {
    findIndexes,
    createChart,
    setUpEnvironment
}