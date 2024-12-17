const sharp = require("sharp")

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

module.exports = {
    findIndexes,
    createChart
}