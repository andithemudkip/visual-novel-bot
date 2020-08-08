const fs = require ('fs');
const bondage = require ('bondage');

const runner = new bondage.Runner ();
const yarnData = JSON.parse (fs.readFileSync ('vn.json'));
const checkPoint = fs.readFileSync ('latestCheckpoint.txt', 'utf8');

const { Task } = require ('@alpha-manager/core');
const FB = require ('@alpha-manager/fb');

const fb = new FB ().config (JSON.parse (fs.readFileSync ('creds.json', 'utf8')));

runner.load (yarnData);

// Loop over the dialogue from the node titled 'Start'
// for (const result of runner.run('Start')) {
//     // Do something else with the result
//     if (result instanceof bondage.TextResult) {
//       console.log (result.text);
//     } else if (result instanceof bondage.OptionsResult) {
//       // This works for both links between nodes and shortcut options
//       console.log (result.options);
  
//       // Select based on the option's index in the array (if you don't select an option, the dialog will continue past them)
//       result.select (1);
//     } else if (result instanceof bondage.CommandResult) {
//        // If the text was inside <<here>>, it will get returned as a CommandResult string, which you can use in any way you want
//       console.log (result.text);
//     }
//   }

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



let tsk = new Task ()
    .to (fb)
    .do (async post => {

        // if there are any pending options, get the fb post
        // <get fb post reactions>
        // pendingOptions.set ()
        if (pendingOptions != null) {
            let lastPost = await fb.get.posts.latest (1, { fields: 'id' });
            let reactions = await fb.get.reactions (lastPost [0].id, { fields: 'type' });

            if (!reactions.length) {
                // post again ?
            }

            for (let i = 0; i < 6; i++) {
                currentVotes [i] = 0;
            }

            for (let react of reactions) {
                currentVotes [reacts [react.type]]++;
            }

            console.log (currentVotes);

        } else {
            // either first post of a story or the bot restarted
            let txt = d.next ();
            let opts = d.next ();

            pendingOptions = opts;

            currentVotes = [];

            post.type = "post";
            post.message = txt.value.text;

            for (let i = 0; i < opts.value.options.length; i++) {
                post.message += '\n';
                post.message += Object.keys (reacts) [i] + ' ' + opts.value.options [i];

            }

            // post.message += '\n';
            // post.message += pendingOptions.value.options
            post.done ();
        }

        // let txt = d.next ();
        // let opts = d.next ();
        // action.type = "post";
        // action.message = txt;
        
        // post it to fb

    })
    .onEvent ('response', () => {
        console.log ('posted');
    })
    .onEvent ('error', err => {
        console.log (err);
    })
    .every (30).second ()
    // .immediate ()
    .start ();


// let res = d.next ();
// console.log (res);
// res = d.next ();
// console.log (res);
// res.value.select (0);
// res = d.next ();
// console.log (res);
// res = d.next ();
// console.log (res);


// let getNextNode = (d) => {
//     let res = { done: false }
//     let textRes = [], optionsRes;
    
//     while (!res.done) {
//         res = d.next ();
//         console.log (res);
//         if (res.value instanceof bondage.TextResult) textRes.push (res.value.text);
//         else if (res.value instanceof bondage.OptionsResult) optionsRes = res;
//     }
    
//     return [textRes, optionsRes];
// }


// let [tRes, oRes] = getNextNode (d);
// console.log ('DONE', tRes, oRes);

// oRes.value.select (0);


// console.log (d.next ());

// let [tRes2, oRes2] = getNextNode (d);
// console.log ('DONE', tRes2, oRes2);



