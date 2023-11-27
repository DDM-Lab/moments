"use strict;"

const PORT = 3002;
const DATABASE = "moments.sqlite3";
const DATA_FILES = new Map();
DATA_FILES.set("academic", "academic_data.csv");
DATA_FILES.set("general", "general_data.csv");
DATA_FILES.set("practice", "practice_data.csv");
const DEFAULT_DATA = "academic";
const DEFAULT_CONSENT = "consent-A";
const SCREEN_NAMES = ["mturkid", "consent", "instructions", "game", "over",
                      "questionnaire1", "questionnaire2", "questionnaire3", "demographics",
                      "completion"];

const root = require("app-root-dir").get();
const path = require("path");
const app = require("express")();
const http = require("http").Server(app);
const url = require("url");
const querystring = require("querystring");
const pug = require("pug");
const fs = require("fs");
const csv = require("csv-parser");
const csvw = require("csv-writer");
const pickRandom = require("pick-random");
const shuffle = require("shuffle-array");
const uuid = require("uuid/v4");
const Database = require("better-sqlite3");

const configurations = {
    "799653": { "rounds": 12,
                "behaviors": ["o", "o", "o"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid" ] },
    "912812": { "rounds": 12,
                "behaviors": ["r", "r", "r"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid" ] },
    "641264": { "rounds": 12,
                "behaviors": ["a", "a", "a"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid" ] },

    "274444": { "rounds": 12,
                "behaviors": ["o", "o", "o"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid", "consent", "demographics"] },
    "620886": { "rounds": 12,
                "behaviors": ["r", "r", "r"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid", "consent", "demographics"] },
    "770591": { "rounds": 12,
                "behaviors": ["a", "a", "a"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid", "consent", "demographics"] },
    "157320": { "rounds": 12,
                "behaviors": ["o", "r", "a"],
                "data": "academic",
                "consent": "consent-A",
                "skip": [ "mturkid", "consent", "demographics"] },

    "589166": { "rounds": 40,
                "behaviors": ["o", "o", "o"],
                "data": "general",
                "consent": "consent-B",
                "attention": true,
                "skip": [ ] },
    "913458": { "rounds": 40,
                "behaviors": ["r", "r", "r"],
                "data": "general",
                "consent": "consent-B",
                "attention": true,
                "skip": [ ] },
    "878132": { "rounds": 40,
                "behaviors": ["a", "a", "a"],
                "data": "general",
                "consent": "consent-B",
                "attention": true,
                "skip": [ ] },

    "test":   { "rounds":  2,
                "behaviors": ["o", "r", "a"],
                "data": "general",
                "consent": "consent-B",
                "attention": true,
                "skip": [ "mturkid", "consent", "instructions" ] },
};

const SCHEMA = [`create table if not exists participants (
                   participantId text,
                   completed integer,
                   ipAddress text,
                   userAgent text,
                   paneid text,
                   startTime text,
                   configuration text,
                   data text,
                   skip text,
                   consentForm text,
                   rounds integer,
                   behaviors text,
                   mturkId text,
                   mturkTime text,
                   eighteen integer,
                   readAndUnderstood integer,
                   participate integer,
                   consentTime text,
                   instructionsTime text,
                   practiceTime text,
                   gameStartTime text,
                   gameEndTime text,
                   score integer,
                   winningScore integer,
                   winners text,
                   completionCode text,
                   attentionFailures integer,
                   p2_off  integer,
                   p2_resp integer,
                   p2_hum  integer,
                   p2_real integer,
                   p3_off  integer,
                   p3_resp integer,
                   p3_hum  integer,
                   p3_real integer,
                   p4_off  integer,
                   p4_resp integer,
                   p4_hum  integer,
                   p4_real integer,
                   p1_off  integer,
                   p1_resp integer,
                   p1_hum  integer,
                   p1_real integer,
                   questionnaire1Time text,
                   interested integer,
                   disinterested integer,
                   excited integer,
                   upset integer,
                   strong integer,
                   guilty integer,
                   scared integer,
                   hostile integer,
                   enthusiastic integer,
                   proud integer,
                   irritable integer,
                   alert integer,
                   ashamed integer,
                   inspired integer,
                   nervous integer,
                   determined integer,
                   attentive integer,
                   jittery integer,
                   active integer,
                   afraid integer,
                   questionnaire2Time text,
                   pc_appear integer,
                   hide_neg integer,
                   angry integer,
                   disapproval integer,
                   pressure integer,
                   important integer,
                   stereo_ok integer,
                   beliefs integer,
                   stereo_wrong integer,
                   self_concept integer,
                   questionnaire3Time text,
                   gender text,
                   age integer,
                   education text,
                   politicalViews text,
                   religiousViews text,
                   race text,
                   latino integer,
                   region text,
                   demographicsTime text,
                   emotion_1 text,
                   emotion_2 text,
                   emotion_3 text,
                   emotion_4 text,
                   emotion_5 text,
                   emotion_6 text,
                   emotion_7 text,
                   emotion_8 text,
                   emotion_9 text,
                   emotion_10 text,
                   emotion_11 text,
                   emotion_12 text,
                   emotion_13 text,
                   emotion_14 text,
                   emotion_15 text,
                   emotion_16 text,
                   emotion_17 text,
                   emotion_18 text,
                   emotion_19 text,
                   emotion_20 text,
                   motivation_1 text,
                   motivation_2 text,
                   motivation_3 text,
                   motivation_4 text,
                   motivation_5 text,
                   motivation_6 text,
                   motivation_7 text,
                   motivation_8 text,
                   motivation_9 text,
                   motivation_10 text)`,
                `create index if not exists participantsIndex on participants (participantId)`,
                `create table if not exists hands (
                   participantId text,
                   completed integer,
                   mturkId text,
                   round integer,
                   decider integer,
                   momentId integer,
                   player integer,
                   cardNumber integer,
                   reaction text,
                   reactionId integer,
                   offensiveness number,
                   responsibility number,
                   behavior text,
                   chosen integer,
                   winner integer)`,
                `create index if not exists handsIndex on hands (participantId, round, player, cardNumber)`,
                `create table if not exists choices (
                   participantId text,
                   completed integer,
                   mturkId text,
                   round integer,
                   moment text,
                   momentId integer,
                   decider integer,
                   startTime text,
                   winner integer,
                   winningReaction text,
                   winningReactionId integer,
                   choiceTime text)`,
                `create index if not exists choicesIndex on choices (participantId, round)`,
                `create table if not exists attention (
                   participantId text,
                   completed integer,
                   mturkId text,
                   round integer,
                   correct integer,
                   chosen integer,
                   passed integer,
                   attentionStart text,
                   attentionTime text)`,
                `create index if not exists attentionIndex on attention (participantId)`];

function readData(file, key) {
    let data = {}
    let momentMap = new Map();
    let reactionMap = new Map();
    let offensiveness = [];
    let responsibility = [];
    // Note that this depends strongly on Maps being defined to preserve insertion order.
    fs.createReadStream(path.join(root, file))
        .pipe(csv())
        .on("data", function(row) {
            let m = row["Moment"];
            let r = row["Reaction"];
            let mindex, rindex;
            if (!momentMap.has(m)) {
                momentMap.set(m, mindex = momentMap.size);
                offensiveness.push(new Array(reactionMap.size));
                responsibility.push(new Array(reactionMap.size));
            } else {
                mindex = momentMap.get(m);
            }
            if (!reactionMap.has(r)) {
                reactionMap.set(r, rindex = reactionMap.size);
                for (let a of offensiveness) {
                    ++a.length;
                }
                for (let a of responsibility) {
                    ++a.length;
                }
            } else {
                rindex = reactionMap.get(r);
            }
            offensiveness[mindex][rindex] = safeNumber(row["Offensiveness"]);
            responsibility[mindex][rindex] = safeNumber(row["Responsibility"]);
        }).on("end", function() {
            let missingData = 0;
            for (let a of offensiveness) {
                for (let v of a) {
                    if (v === undefined) {
                        ++missingData;
                    }
                }
            }
            if (missingData) {
                throw `${missingData} missing offensiveness values`;
            }
            for (let a of responsibility) {
                for (let v of a) {
                    if (v === undefined) {
                        ++missingData;
                    }
                }
            }
            if (missingData) {
                throw `${missingData} missing responsibility values`;
            }
            data.moments = Array.from(momentMap.keys());
            data.reactions = Array.from(reactionMap.keys());
            // offensiveness and responsibility are indexed by [moment][reaction]
            data.offensiveness = offensiveness;
            data.responsibility = responsibility;
            writeCardFile(`${key}_moments.csv`, data.moments, "moment");
            writeCardFile(`${key}_reactions.csv`, data.reactions, "reaction");
            writeValuesFile(`${key}_values.csv`, data);
        });
    return data;
}

function writeCardFile(file, values, header) {
    csvw.createObjectCsvWriter({
        path: path.join(root, file),
        header: [{id: "index", title: "index"}, {id: "value", title: header}]
    }).writeRecords(values.map(function(v, i) {
        return {index: i, value: v};
    }));
}

function writeValuesFile(file, data) {
    let values = [];
    for (let m = 0; m < data.moments.length; ++m) {
        for (let r = 0; r < data.reactions.length; ++r) {
            values.push({moment: m,
                         reaction: r,
                         offensiveness: data.offensiveness[m][r],
                         responsibility: data.responsibility[m][r]});
        }
    }
    csvw.createObjectCsvWriter({
        path: path.join(root, file),
        header: [{id: "moment", title: "moment"},
                 {id: "reaction", title: "reaction"},
                 {id: "offensiveness", title: "offensiveness"},
                 {id: "responsibility", title: "responsibility"}]
    }).writeRecords(values);
}

function safeNumber(s) {
    let result = Number(s);
    if (Number.isNaN(result)) {
        throw new TypeError(`${s} does not appear to be a number`);
    }
    return result;
}

const data = new Map();
DATA_FILES.forEach((v, k, m) => data[k] = readData(v, k));

const participants = new Map();
const mturkIds = new Set();
var lastAction = Date.now();

app.get("/", function(req, res) {
    lastAction = Date.now();
    if (configurations[req.query.config]) {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(pug.renderFile(path.join(root, "moments.pug"), {"config": req.query.config}));
    } else {
        res.status(404).send("Not Found");
    }
});

app.get("/audit", function(req, res) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end(pug.renderFile(path.join(root, "audit.pug")));
});

app.get("/cards", function(req, res) {
    let result = [];
    for (let k of DATA_FILES.keys()) {
        result.push(`<h1>${k}</h1>`);
        for (let m of data[k].moments) {
            result.push(`<div class="card moment">${m}</div>`);
            result.push("<div class='audit-space'></div>");
        }
        for (let r of data[k].reactions) {
            result.push(`<div class="card">${r}</div>`);
            result.push("<div class='audit-space'></div>");
        }
    }
    res.json(result);
});

// TODO replace this with the express static middleware
for (let file of ["moments.css", "client.js", "ui.png", "button.png", "favicon.ico"]) {
    app.get("/" + file, function(req, res) {
        lastAction = Date.now();
        res.sendFile(path.join(root, file));
    })
};

const connection = new Database(path.join(root, DATABASE));

connection.pragma("journal_mode=WAL");
for (let stmt of SCHEMA) {
    connection.prepare(stmt).run();
}

function dbRun(stmt, ...args) {
    // Abstracted into a function because we used to do more with it, and, who knows,
    // may do so again in the future, so may as well keep it this way.
    stmt.run(...args);
}

const DTNOW = "datetime('now', 'localtime')";

const recordParticipant = connection.prepare(
    `insert into participants (participantId, completed, ipAddress, userAgent, paneId, startTime,
                               configuration, data, skip, consentForm, rounds, behaviors)
            values(:pid, 0, :ip, :ua, :pane, ${DTNOW}, :cfg, :data, :sk, :cfm, :rnds, :bhs)`);

const finalizationStatements =
      ["participants", "hands", "choices", "attention"].map(
          tableName => connection.prepare(`update ${tableName} set completed=1 where participantId=?`));

app.get("/update", function(req, res) {
    let participant = participants[req.query.pid];
    let state = participant && participant.state;
    lastAction = Date.now();
    if (req.query.action === "init") {
        if (state) {
            console.log("Unexpected live state found", state.pid);
            state.exit = `We're sorry, an internal error has occurred and we cannot continue (${state.pid}).`;
        } else {
            participant = new Participant(configurations[req.query.config], req.query.pane);
            state = participant.state;
            participants[state.pid] = participant;
            let config = participant.config;
            dbRun(recordParticipant, { "pid": state.pid,
                                       "ip": req.connection.remoteAddress,
                                       "ua": req.headers["user-agent"],
                                       "pane": state.paneId,
                                       "cfg": req.query.config,
                                       "data": config.data || DEFAULT_DATA,
                                       "sk": config.skip ? config.skip.join("+") : "",
                                       "cfm": state.consent,
                                       "rnds": state.rounds,
                                       "bhs": config.behaviors.join("") });
            pickOpponentReactions(participant); // TODO is this still necessary?
        }
    } else if (!state) {
        console.log("No state found", req.query.pid);
        participant = new Participant({}, null);
        state = participant.state;
        state.exit = `We're sorry, an internal error has occurred and the game cannot continue (${req.query.pid}).`;
    } else {
        eval(req.query.action)(participant, req.query);
    }
    if (state.exit) {
        participants.delete(state.pid);
    }
    res.json(state);
    if (state.screenId === "completion") {
        for (let st of finalizationStatements) {
            dbRun(st, state.pid);
        }
        participants.delete(state.pid);
    }
});

function Participant(config, pane) {
    this.config = config;
    this.data = data["practice"];
    this.allMoments = shuffle(Array.from(this.data.moments.keys()));
    this.allReactions = shuffle(Array.from(this.data.reactions.keys()));
    this.discards = [];
    this.pendingDiscards = [];
    this.mturkid = null;
    this.state = new State(this, pane);
    this.attentionChecks = [];
    if (this.config["attention"]) {
        if (this.config.rounds < 36) {
            this.attentionChecks.push(2);
        } else {
            this.attentionChecks.push(Math.floor(10 + 10 * Math.random()));
            this.attentionChecks.push(Math.floor(25 + 10 * Math.random()));
        }
    }
    this.attentionFailures = 0;
}

function State(participant, pane) {
    this.pid = makeParticipantId()
    this.paneId = pane || null;
    this.screenId = nextScreen(null, participant);
    this.isPractice = true;
    this.consent = participant.config["consent"] || DEFAULT_CONSENT;
    this.rounds = participant.config.rounds || 40;
    this.round = 1;
    this.moment = participant.allMoments.pop();
    this.momentText = participant.data.moments[this.moment];
    this.reactions = new Array(7);
    this.reactionTexts = new Array(7);
    for (let i = 0; i < 7; ++i) {
        newReaction(participant, this, i);
    }
    this.points = 0;
    this.opponents = [2, 3, 4].map(n => new Opponent(participant, n));
    this.decider = 2;
    this.selectedReaction = null;
    this.winner = null;
    this.finalWinningScore = 0;
    this.finalWinners = [];
    this.completionCode = null;
    this.exit = null;
    this.highlightExit = true;
    this.attentionData = null;
}

const recordPractice = connection.prepare(
    `update participants set practiceTime=${DTNOW} where participantId=?`);

function reinitialize(participant) {
    const state = participant.state;
    dbRun(recordPractice, state.pid);
    participant.data = data[participant.config.data || DEFAULT_DATA];
    participant.allMoments = shuffle(Array.from(participant.data.moments.keys()));
    participant.allReactions = shuffle(Array.from(participant.data.reactions.keys()));
    participant.discards = [];
    participant.pendingDiscards = [];
    state.isPractice = false;
    state.screenId = "practiceover";
    state.round = 1;
    newMoment(participant, state);
    for (let i = 0; i < 7; ++i) {
        newReaction(participant, state, i);
    }
    state.points = 0;
    for (opp of state.opponents) {
        for (let i = 0; i < 7; ++i) {
            newReaction(participant, opp, i);
        }
        opp.points = 0;
    }
    state.decider = Math.floor(Math.random() * 4);
    if (state.decider === 3) {
        pickOpponentReactions(participant);
    }
}

function Opponent(participant, i) {
    this.id = "opponent-" + i;
    this.behavior = participant.config.behaviors[i - 2];
    this.roundBehavior = null;
    this.reactions = new Array(7);
    this.reactionTexts = new Array(7);
    // Note that for the practice round, we start with each opponent have seven
    // copies of the same reaction card.
    for (let j = 0; j < 7; ++j) {
        this.reactions[j] = participant.allReactions[0];
        this.reactionTexts[j] = participant.data.reactions[this.reactions[j]];
    }
    participant.allReactions.shift();
    this.points = 0;
    this.selectedReaction = null;
}

function makeParticipantId() {
    let u = uuid();
    return u.substring(0, 8) + u.substring(9, 13);
}

function newMoment(participant, state) {
    state.moment = participant.allMoments.pop()
    state.momentText = participant.data.moments[state.moment];
}

function newReaction(participant, thing, index, discard) {
    if (participant.state && !participant.state.isPractice && !participant.allReactions.length) {
        participant.allReactions = shuffle(participant.discards);
        participant.discards = [];
    }
    if (discard) {
        participant.pendingDiscards.push(thing.reactions[index]);
    }
    let r = participant.allReactions.pop();
    thing.reactions[index] = r;
    thing.reactionTexts[index] = participant.data.reactions[r]
}

function nextScreen(after, participant) {
    // This assumes after is either null or an element of SCREEN_NAMES and is not the last
    // element of SCREEN_NAMES. It may die gruesomely if these conditions are not met.
    let i = SCREEN_NAMES.indexOf(after) + 1; // note indexOf returns -1 if after is null
    let skip = participant.config.skip;
    if (skip) {
        while (skip.includes(SCREEN_NAMES[i])) {
            ++i;
        }
    }
    return SCREEN_NAMES[i];
}

const recordMturkid = connection.prepare(
    `update participants set mturkId=?, mturkTime=${DTNOW} where participantId=?`);

function submitmturkid(participant, q) {
    const state = participant.state;
    participant.mturkid = q.id;
    dbRun(recordMturkid, q.id, state.pid);
    if (mturkIds.has(q.id)) {
        state.exit = "It appears you have already played this game.";
    } else {
        state.screenId = nextScreen("mturkid", participant);
    }
}

const recordConsent = connection.prepare(
    `update participants set eighteen=:oldenough, readAndUnderstood=:read,
                             participate=:participate, consentTime=${DTNOW}
                         where participantId=:pid`);

function submitconsent(participant, q) {
    const state = participant.state;
    dbRun(recordConsent, q);
    if (parseInt(q.oldenough) && parseInt(q.read) && parseInt(q.participate)) {
        state.screenId = nextScreen("consent", participant);
    } else {
        state.highlightExit = false;
        state.exit = "Thank you for considering participating. We're sorry it didn't work out."
    }
}

const recordQuestionnaire1 = connection.prepare(
    `update participants set p2_off=:p2_off, p2_resp=:p2_resp, p2_hum=:p2_hum, p2_real=:p2_real,
                             p3_off=:p3_off, p3_resp=:p3_resp, p3_hum=:p3_hum, p3_real=:p3_real,
                             p4_off=:p4_off, p4_resp=:p4_resp, p4_hum=:p4_hum, p4_real=:p4_real,
                             p1_off=:p1_off, p1_resp=:p1_resp, p1_hum=:p1_hum, p1_real=:p1_real,
                             questionnaire1Time=${DTNOW}
                         where participantId=:pid`);

function submitquestionnaire1(participant, q) {
    const state = participant.state;
    dbRun(recordQuestionnaire1, q);
    state.screenId = nextScreen("questionnaire1", participant);
}

const recordQuestionnaire2 = connection.prepare(
    `update participants set interested=:interested, disinterested=:disinterested,
                             excited=:excited, upset=:upset, strong=:strong, guilty=:guilty,
                             scared=:scared, hostile=:hostile, enthusiastic=:enthusiastic,
                             proud=:proud, irritable=:irritable, alert=:alert,
                             ashamed=:ashamed, inspired=:inspired, nervous=:nervous,
                             determined=:determined, attentive=:attentive,
                             jittery=:jittery, active=:active, afraid=:afraid,
                             emotion_1=:emotion_1, emotion_2=:emotion_2, emotion_3=:emotion_3,
                             emotion_4=:emotion_4, emotion_5=:emotion_5, emotion_6=:emotion_6,
                             emotion_7=:emotion_7, emotion_8=:emotion_8, emotion_9=:emotion_9,
                             emotion_10=:emotion_10, emotion_11=:emotion_11,
                             emotion_12=:emotion_12, emotion_13=:emotion_13,
                             emotion_14=:emotion_14, emotion_15=:emotion_15,
                             emotion_16=:emotion_16, emotion_17=:emotion_17,
                             emotion_18=:emotion_18, emotion_19=:emotion_19,
                             emotion_20=:emotion_20,
                             questionnaire2Time=${DTNOW}
                         where participantId=:pid`);

function submitquestionnaire2(participant, q) {
    const state = participant.state;
    dbRun(recordQuestionnaire2, q);
    state.screenId = nextScreen("questionnaire2", participant);
}

const recordQuestionnaire3 = connection.prepare(
    `update participants set pc_appear=:pc_appear, hide_neg=:hide_neg, angry=:angry,
                             disapproval=:disapproval, pressure=:pressure,
                             important=:important, stereo_ok=:stereo_ok, beliefs=:beliefs,
                             stereo_wrong=:stereo_wrong, self_concept=:self_concept,
                             motivation_1=:motivation_1, motivation_2=:motivation_2,
                             motivation_3=:motivation_3, motivation_4=:motivation_4,
                             motivation_5=:motivation_5, motivation_6=:motivation_6,
                             motivation_7=:motivation_7, motivation_8=:motivation_8,
                             motivation_9=:motivation_9, motivation_10=:motivation_10,
                             questionnaire3Time=${DTNOW}
                         where participantId=:pid`);

function submitquestionnaire3(participant, q) {
    const state = participant.state;
    dbRun(recordQuestionnaire3, q);
    state.screenId = nextScreen("questionnaire3", participant);
}
const recordDemographics = connection.prepare(
    `update participants set gender=:gender, age=:age, education=:education,
                             politicalViews=:politics, religiousViews=:religion,
                             race=:race, latino=:hispanic, region=:region,
                             demographicsTime=${DTNOW}
                         where participantId=:pid`);

function submitdemographics(participant, q) {
    const state = participant.state;
    dbRun(recordDemographics, q);
    state.screenId = nextScreen("demographics", participant);
}

const recordInstructionsTime = connection.prepare(
    `update participants set instructionsTime=${DTNOW} where participantId=?`);

function startpractice(participant, q) {
    const state = participant.state;
    dbRun(recordInstructionsTime, state.pid);
    state.screenId = nextScreen("instructions", participant);
}

const recordStartGame = connection.prepare(
    `update participants set gameStartTime=${DTNOW} where participantId=?`);

function startgame(participant, q) {
    const state = participant.state;
    dbRun(recordStartGame, state.pid);
    mturkIds.add(participant.mturkid);
    state.screenId = "game";
}

const recordStartAttention = connection.prepare(
    `insert into attention (participantId, completed, mturkId, round, correct, attentionStart)
            values(?, 0, ?, ?, ?, ${DTNOW})`);

const recordFinishAttention = connection.prepare(
    `update attention set chosen=?, passed=?, attentionTime=${DTNOW}
            where participantId=? and round=?`);

const recordFailure = connection.prepare(
    'update participants set attentionFailures=? where participantId=?');

const recordUpdatedTime = connection.prepare(
    `update choices set startTime=${DTNOW} where participantId=? and round=?`);


function submit(participant, q) {
    const state = participant.state;
    state.selectedReaction = parseInt(q.selectedReaction);
    if (state.attentionData) {
        state.winner = true;
        let passed = (state.selectedReaction === state.attentionData.correct);
        // Dark arts alert: note that x|0 turns a boolean, x, into an integer, 0 or 1.
        dbRun(recordFinishAttention, state.selectedReaction + 1, passed|0,
              state.pid, state.round);
        dbRun(recordUpdatedTime, state.pid, state.round);
        if (!passed) {
            if (++participant.attentionFailures >= 2 || participant.config.rounds < 36) {
                state.exit = "We’re sorry, you have failed two attention checks, so you cannot continue this experiment. Thank you for your interest."
            }
            dbRun(recordFailure, participant.attentionFailures, state.pid);
        }
        return;
    }
    for (let i = 0; i < 3; ++i) {
        if (i !== state.decider) {
            state.opponents[i].selectedReaction = pickReaction(state.opponents[i], participant);
        }
    }
    state.winner = pickWinner(participant);
    incrementScore(participant);
}

function choose(participant, q) {
    const state = participant.state;
    state.winner = parseInt(q.choice);
    incrementScore(participant);
}

function gamefinished(participant, q) {
    const state = participant.state;
    state.screenId = nextScreen("over", participant);
    // participants.delete(state.pid);
}

const recordEndRoundChoices = connection.prepare(
    `update choices set winner=?, winningReaction=?, winningReactionId=?, choiceTime=${DTNOW}
                    where participantId=? and round=?`);

function incrementScore(participant) {
    let state = participant.state;
    if (!state.isPractice) {
        participant.discards = participant.discards.concat(participant.pendingDiscards);
        participant.pendingDiscards = [];
    }
    if (state.winner == 1) {
        ++state.points;
    } else {
        ++state.opponents[state.winner - 2].points;
    }
    if (state.isPractice) {
        return;
    }
    const wr = winningReaction(
        state.winner === 1 ? state : state.opponents[state.winner - 2]);
    dbRun(recordEndRoundChoices, state.winner, wr[1], wr[0], state.pid, state.round);
    updateHand(state, state, 1, state.winner===1);
    for (let i = 0; i < 3; ++i) {
        updateHand(state, state.opponents[i], i+2, state.winner===i+2);
    }
}

function winningReaction(thing) {
    return [ thing.reactions[thing.selectedReaction],
             thing.reactionTexts[thing.selectedReaction] ];
}

const recordEndRoundHands = connection.prepare(
    `update hands set chosen=?, winner=?, behavior=?
                  where participantId=? and round=? and player=? and cardNumber=?`);

function updateHand(state, thing, playerNumber, isWinner) {
    for (let i = 0; i < 7; ++i) {
        // Dark arts alert: note that x|0 turns a boolean, x, into an integer, 0 or 1.
        dbRun(recordEndRoundHands,
              (thing.selectedReaction===i)|0,
              isWinner|0,
              thing.roundBehavior || "",
              state.pid,
              state.round,
              playerNumber,
              i+1);
    }
}

const recordStartRoundChoices = connection.prepare(
    `insert into choices (participantId, completed, mturkId, round, moment, momentId, decider, startTime)
                         values(?, 0, ?, ?, ?, ?, ?, ${DTNOW})`);

const recordFinal = connection.prepare(
    `update participants set gameEndTime=${DTNOW}, score=?, winningScore=?, winners=?,
                             completionCode=?
                         where participantId=?`);

function AttentionData() {
    this.moment = "You are meeting with your group, who tell you that this is not a real \
round of the game, but rather an attention check: please select the reaction card \
that includes the word “aardvark” in its text.";
    this.reactions = shuffle(["Go to the bank and withdraw some money.",
                              "Announce that you just won the lottery.",
                              "Speculate on some penny stocks.",
                              "Eat a lot of chocolate.",
                              "Whistle.",
                              "Recite the Gettysburgh Address, backwards."]);
    this.correct = 1 + Math.floor(4 * Math.random());
    this.reactions.push(this.reactions[this.correct]);
    this.reactions[this.correct] =
        "Of the order Tubulidentata, the aardvark is a nocturnal, burrowing insectivore.";
}

function next(participant, q) {
    const state = participant.state;
    if (state.attentionData) {
        state.selectedReaction = null;
        state.winner = null;
        state.attentionData = null;
        return;
    }
    ++state.round;
    if (!state.isPractice && state.round > state.rounds) {
        state.screenId = "over";
        let scores = [state.points].concat([0, 1, 2].map(i => state.opponents[i].points));
        state.finalWinningScore = Math.max(...scores);
        for (let i = 0; i < 4; ++i) {
            if (scores[i] === state.finalWinningScore) {
                state.finalWinners.push(i + 1);
            }
        }
        if (!participant.config.skip || !participant.config.skip.includes("mturkid")) {
            state.completionCode = makeCompletionCode();
        }
        dbRun(recordFinal,
              state.points,
              state.finalWinningScore,
              state.finalWinners.join(),
              state.completionCode, state.pid);
        return;
    }
    for (let i = 0; i < 3; ++i) {
        let opp = state.opponents[i];
        if (opp.selectedReaction !== null) {
            newReaction(participant, opp, opp.selectedReaction, true);
            if (state.isPractice) {
                for (let j = 0; j < 7; ++j) {
                    opp.reactionTexts[j] = opp.reactionTexts[opp.selectedReaction];
                }
            }
            opp.selectedReaction = null;
        }
    }
    if (state.isPractice && state.round > 2) {
        reinitialize(participant);
    } else {
        newMoment(participant, state);
        state.decider = (state.decider + 1) % 4;
        if (state.selectedReaction !== null) {
            newReaction(participant, state, state.selectedReaction, true);
        }
        pickOpponentReactions(participant);
    }
    state.selectedReaction = null;
    state.winner = null;
    if (state.isPractice) {
        return;
    }
    dbRun(recordStartRoundChoices,
          state.pid,
          participant.mturkid,
          state.round,
          state.momentText,
          state.moment,
          (state.decider < 3 ? state.decider + 2 : 1));
    recordHand(participant, state, 1);
    for (let i = 0; i < 3; ++i) {
        recordHand(participant, state.opponents[i], i+2);
    }
    if (!state.isPractice && participant.attentionChecks.includes(state.round)) {
        state.attentionData = new AttentionData();
        participant.attentionChecks = participant.attentionChecks.filter(x => x !== state.round);
        dbRun(recordStartAttention, state.pid, participant.mturkid, state.round,
              state.attentionData.correct + 1);
    }
}

const recordStartRoundHands = connection.prepare(
    `insert into hands (participantId, completed, mturkId, round, player, decider, momentId, cardNumber,
                        reaction, reactionId, offensiveness, responsibility)
                       values(?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

function recordHand(participant, thing, playerNumber) {
    const state = participant.state;
    for (let i = 0; i < 7; ++i) {
        dbRun(recordStartRoundHands,
              state.pid,
              participant.mturkid,
              state.round,
              playerNumber,
              (state.decider < 3 ? state.decider + 2 : 1),
              state.moment,
              i + 1,
              participant.data.reactions[thing.reactions[i]],
              thing.reactions[i],
              participant.data.offensiveness[state.moment][thing.reactions[i]],
              participant.data.responsibility[state.moment][thing.reactions[i]]);
    }
}

function makeCompletionCode() {
    let s = "ABCDEFGHJKLMNPRSTVWXY3456789";
    let result = Array(10).join().split(',').map(function() {
        return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
    let pairs = ["19", "28", "37", "46", "55", "64", "73", "82", "91"];
    for (let i = 0; i < 2; ++i) {
        result += "-" + pairs[Math.floor(Math.random()*pairs.length)];
    }
    return result;
}


function pickOpponentReactions(participant) {
    const state = participant.state;
    if (state.decider === 3) {
        for (let opp of state.opponents) {
            opp.selectedReaction = pickReaction(opp, participant);
        }
    }
}

function pickReaction(opp, participant) {
    let data = participant.data;
    let b = opp.behavior;
    if (b === "a") {
        b = Math.random() < 0.5 ? "o" : "r";
    }
    opp.roundBehavior = b;
    let values = b === "o" ? data.offensiveness : data.responsibility;
    let results = [];
    let best = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 7; ++i) {
        let n = values[participant.state.moment][opp.reactions[i]];
        if (n > best) {
            results = [i];
            best = n;
        } else if (n === best) {
            results.push(i)
        }
    }
    return pickRandom(results)[0];
}

function pickWinner(participant) {
    const state = participant.state;
    let data = participant.data;
    let b = state.opponents[state.decider].behavior;
    if (b === "a") {
        b = Math.random() < 0.5 ? "o" : "r";
    }
    state.opponents[state.decider].roundBehavior = b;
    let values = b === "o" ? data.offensiveness : data.responsibility;
    let results = [3];
    let best = values[state.moment][state.reactions[state.selectedReaction]];
    for (let i = 0; i < 3; ++i) {
        if (i === state.decider) {
            continue;
        }
        let n = values[state.moment][state.opponents[i].reactions[state.opponents[i].selectedReaction]];
        if (n > best) {
            results = [i];
            best = n;
        } else if (n === best) {
            results.push(i);
        }
    }
    let choice = pickRandom(results)[0];
    return choice === 3 ? 1 : choice + 2;
}

http.listen(PORT, function() {
    console.log(`listening on *:${PORT}, at ${root}`);
});
