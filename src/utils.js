const core = require('@actions/core');
const github = require('@actions/github');
const { createCanvas, loadImage } = require("canvas");

async function setUpEnvironment(octokit) {
    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    core.debug(`owner: ${owner}, repo: ${repo}`);
    try {
        const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
        core.debug(`API response data: ${JSON.stringify(repoData)}`);
        const defaultBranch = repoData.default_branch;
        const ref = "actionsbot/update-contributors";

        core.debug(`default branch: ${defaultBranch}`);

        try {
            await octokit.rest.repos.getBranch({ owner, repo, branch: ref });
            await octokit.rest.repos.merge({ owner, repo, ref, defaultBranch });
        } catch (error) {
            if (error.status === 404) {
                core.debug(`Branch ${ref} not found, creating new branch`);
                const { data: branchData} = await octokit.rest.repos.getBranch({ owner, repo, branch: defaultBranch });
                core.debug(`Return data: ${JSON.stringify(branchData)}`);
                if (branchData && branchData.commit && branchData.commit.sha) {
                    await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${ref}`, sha: branchData.commit.sha });
                } else {
                    core.setFailed(`Failed to get commit SHA for branch ${defaultBranch}`);
                }
            } else {
                core.setFailed(`Setting up environment failed: ${error.message}`, error);
            }
        }
        return { owner: owner, repo: repo, defaultBranch: defaultBranch, ref: ref };
    } catch (error) {
        core.setFailed(`Setting up environment failed: ${error.message}`, error);
    }
}

function findIndexes(data) {
    const startComment = '<!-- contributors -->';
    const endComment = '<!-- /contributors -->';
    const startIndex = data.indexOf(startComment) + startComment.length;
    const endIndex = data.indexOf(endComment);

    core.debug(`startIndex: ${startIndex}, endIndex: ${endIndex}`);

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

async function processImage(contributor) {
    const path = contributor[1];
    core.debug(`Processing image for contributor: ${contributor[0]}, path: ${path}`);
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

    core.debug(`Image processed for contributor: ${contributor[0]}`);

    return { path: `contributors/${contributor[0]}.png`, contentBase64: base64Image.replace("data:image/png;base64,","")};
}

async function createChart(contributorsList) {
    core.debug(`Creating chart for contributors list`);
    let contributorsChart = "<table>\n\t<tr>\n";
    let contributorsImages = [];
    let counter = 0;

    for (let contributor of contributorsList) {
        const imageData = await processImage(contributor);
        contributorsChart +=
`       <td align="center">
            <a href="${contributor[2]}">
                <img src="${imageData.path}" width="100px;" alt="${contributor[0]}" />
                <p><strong>${contributor[0]}</strong></p>
            </a>
        </td>
`
        counter++;
        if (counter == 6) {
            contributorsChart += "\t</tr>\n\t<tr>\n"
            counter = 0;
        }
        contributorsImages.push(imageData);
    };
    contributorsChart += "\t</tr>\n</table>";

    core.debug(`Chart created for contributors list`);

    return { chart: contributorsChart, images: contributorsImages };
}

async function commitContributors(env, octokit, changes){
    try{
        core.debug(`Committing contributors avatars changes`);
        const ref = await octokit.rest.git.getRef({ owner: env.owner, repo: env.repo, ref: `heads/${env.ref}`});
        const baseTree = ref.object.sha;
        let tree = []
        for(image of changes){
            tree.push({
                path: image.path,
                mode: '100644',
                type: 'blob',
                content: image.contentBase64,
                encoding: 'base64'
            });
        }
        const treeData = await octokit.rest.git.createTree({ owner: env.owner, repo: env.repo, base_tree: baseTree, tree: tree });
        const commitData = await octokit.rest.git.createCommit({ owner: env.owner, repo: env.repo, message: "content: upload contributors avatars", tree: treeData.sha, parents: [baseTree] });
        await octokit.rest.git.updateRef({ owner: env.owner, repo: env.repo, ref: `heads/${env.ref}`, sha: commitData.sha });
        core.debug(`Contributors avatars changes committed`);
    } catch(error){
        core.setFailed(`Commit contributors avatars changes failed: ${error.message}`, error);
    }
}

async function commitReadme(env, octokit, changes){
    try{
        core.debug(`Committing README changes`);
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: env.owner,
            repo: env.repo,
            path: "README.md",
            sha: changes.sha,
            message: "docs: create or update contributors chart",
            content: changes.content,
            branch: env.ref
        });
        core.debug(`README changes committed`);
    } catch(error){
        core.setFailed(`Commit readme changes failed: ${error.message}`, error);
    }
}

module.exports = {
    findIndexes,
    createChart,
    setUpEnvironment,
    commitContributors,
    commitReadme
}