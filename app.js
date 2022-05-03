//dependency declaration 
const cliProgress = require('cli-progress');
const path = require('path');
const colors = require('ansi-colors');
const bar1 = new cliProgress.SingleBar({
    format: '{videoName} => |' + colors.cyan('{bar}') + '| {percentage}% || FPS: {FPS}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
var ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

async function getVideoFiles(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, function (err, files) {
            if (err) {
                reject(err);
            } else {
                let finalFiles = [];
                files.forEach((file) => {
                    const absolutePath = path.resolve(dir, file);
                    const extName = path.extname(file);
                    const fileName = path.basename(file, extName);
                    file.match(/.*\.(mp4?)/ig) ? finalFiles.push({ absolutePath, fileName, extName }) : null;
                    return file.match(/.*\.(mp4?)/ig)
                });
                resolve(finalFiles);
            }
        });
    });
}

async function createOutPutFolderIfNotExists({ dir = './compressed_output' }) {
    const exists = await fs.existsSync(dir);
    if (exists) {
        console.log('Directory already exists!');
        return (dir);
    } else {
        const newDir = await fs.mkdirSync(dir, { recursive: true });
        return (newDir);
    }
}

async function compressVideo({ filePath, outPutFilePath, fileName }) {
    return new Promise((resolve, reject) => {
        new ffmpeg({ source: filePath })
            .on("start", function (command) {
                bar1.start(100, 0, {
                    FPS: 0,
                    videoName: fileName,
                });
            })
            .on('progress', function (progress) {
                // console.log(progress);
                bar1.increment();
                bar1.update(progress.percent, {
                    FPS: progress.currentFps
                });
            })
            .on("end", function () {
                bar1.stop();
                console.log("done.....");
                resolve(true);
            })
            .on("error", function (err) {
                bar1.stop();
                console.log("error =>", err);
                resolve(false);
            })
            .outputOptions([`-vf`, "scale=trunc(iw/4)*2:trunc(ih/4)*2", '-c:v libx264', '-crf 28'])
            .save(outPutFilePath);
    })
}

(async () => {
    const sourceFolder = "./videos";
    const files = await getVideoFiles(sourceFolder);
    if (!files.length) {
        console.log("No video files found in the source folder");
        process.exit(0);
    }
    // console.log(files);
    const outputDir = await createOutPutFolderIfNotExists({ dir: './compressed_output' });
    for (let i = 0; i < files.length; i++) {
        const { absolutePath: filePath, fileName, extName } = files[i];
        const outPutFilePath = path.resolve(outputDir, `${fileName}_compressed.${extName}`);
        await compressVideo({ filePath, outPutFilePath, fileName: `${fileName}.${extName}` });
    }
    console.log("output will be in following directory =>", outputDir);
    process.exit(0);
})()