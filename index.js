const fs = require ('fs');
const bondage = require ('bondage');

const runner = new bondage.Runner ();
const yarnData = JSON.parse (fs.readFileSync ('vn.json'));
let checkPoint = fs.readFileSync ('latestCheckpoint.txt', 'utf8');

const { Task } = require ('@alpha-manager/core');
const FB = require ('@alpha-manager/fb');
const Jimp = require ('jimp');

const fb = new FB ().config (JSON.parse (fs.readFileSync ('creds.json', 'utf8')));

runner.load (yarnData);

let reacts = {
    LIKE: 0,
    LOVE: 1,
    HAHA: 2,
    WOW: 3,
    SAD: 4,
    ANGRY: 5
}

let currentVotes = [];

let d = runner.run (checkPoint);

let pendingOptions = null;

new Task ()
    .to (fb)
    .do (async post => {
        if (pendingOptions != null && !pendingOptions.done) {
            let lastPost = await fb.get.posts.latest (1, { fields: 'id' });
            let reactions = await fb.get.reactions (lastPost [0].id, { fields: 'type' });

            if (!reactions.length) {
                // post again ?
                // pick one at random ?
            } else {
                for (let react of reactions) {
                    currentVotes [reacts [react.type]]++;
                }
            }

            let localMaxIndex = 0;
            for (let i = 0; i < pendingOptions.value.options.length; i++) {
                if (currentVotes [i] > localMaxIndex) localMaxIndex = i;
            }

            console.log (`picked [${pendingOptions.value.options [localMaxIndex]}]`);

            pendingOptions.value.select (localMaxIndex);

            let txt = '';
            let currentRes;
            do {
                currentRes = d.next ();
                if (currentRes.value instanceof bondage.TextResult) {
                    txt += currentRes.value.text + '\n';
                    checkPoint = currentRes.value.data.title;
                } else {
                    opts = currentRes;
                }
            } while (currentRes.value instanceof bondage.TextResult)

            fs.writeFileSync ('latestCheckpoint.txt', checkPoint);

            pendingOptions = opts;

            currentVotes = [0, 0, 0, 0, 0, 0];

            post.type = "post";
            // post.message = " ";

            await createImage (checkPoint, opts.value ? opts.value.options : []);

            post.media = `./output/${checkPoint}.png`;

            post.done ();

        } else {
            // either first post of a story or the bot restarted
            let txt = d.next ();
            let opts = d.next ();

            pendingOptions = opts;

            post.type = "post";

            if (!txt.done && !opts.done) {

                checkPoint = txt.value.data.title;

                currentVotes = [0, 0, 0, 0, 0, 0];

                // post.message = txt.value.text;

                await createImage (checkPoint, opts.value.options);

                post.media = `./output/${checkPoint}.png`;
    
                post.done ();
            } else {
                console.log ('final post?');
            }
        }
    })
    .onEvent ('response', () => {
        console.log ('posted');
    })
    .onEvent ('error', err => {
        console.log (err);
    })
    // .every (6).hour ()
    .every (30).second ()
    .start ();



let createImage = async (node, options) => {
    let fredoka48 = await Jimp.loadFont ("fonts/fredoka/fredoka.fnt");

    let baseImage = await Jimp.read (`./images/${node}.png`);

    let baseHeight = baseImage.getHeight ();
    let baseWidth = baseImage.getWidth ();
    let outImage = new Jimp (baseImage.getWidth (), baseHeight + (options.length) * 64 + 12, 0x000000ff);
    outImage.blit (baseImage, 0, 0);

    for (let i = 0; i < options.length; i++) {
        let reactImage = await Jimp.read (`./reacts/${Object.keys (reacts) [i]}.png`);
        reactImage.resize (48, 48);
        outImage.blit (reactImage, 20, baseHeight + 60 * i + 20);
        outImage.print (fredoka48, 80, baseHeight + 60 * i + 20, options [i], baseWidth - 20);
    }

    await outImage.writeAsync (`./output/${node}.png`);
}