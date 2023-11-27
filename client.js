"use strict;"

var currentState = null;
var participantId = null;
var exited = false;
var interactionPending = false;

function update(state) {
    $("body, .selectable, .button").removeClass("waiting"); // done waiting for server
    if (state.paneId !== window.window.name && !state.exit) {
        state.exit = "We're sorry, an error has occurred and the game cannot be played.";
    }
    if (!participantId) {
        participantId = state.pid;
    }
    currentState = state;
    if (state.exit) {
        setClass($("#exit h1"), "highlight", state.highlightExit);
        state.screenId = "exit";
        $("#errormsg").text(state.exit);
    }
    $(".screen").each(function () {
        $(this).css("display", $(this).attr("id") === state.screenId ? "block" : "none");
    });
    eval("update_" + state.screenId)(state);
    window.scrollTo(0, 0);
    interactionPending = false;
}

function update_mturkid(state) {
    $("#mtid").change(checkid).keyup(checkid).on("input", checkid);
}

function checkid () {
    enableButton($("#mturkid-button"), /^\w{8,20}$/.test($("#mtid").val()), function() {
        emit("submitmturkid", {"id": $("#mtid").val()});
    });
}

const CONSENT_QUESTIONS = ["oldenough", "read", "participate"];

function update_consent(state) {
    $(`#${state.consent}`).css("display", "block");
    $("#consent input").each(function() {
        $(this).change(function(evt) {
            let enable = true;
            for (let name of CONSENT_QUESTIONS) {
                switch ($(`input[name=${name}]:checked`).val()) {
                case "1":
                    $(`#${name} .consent-warning`).css("display", "none");
                    break;
                case "0":
                    $(`#${name} .consent-warning`).css("display", "block");
                    break;
                default:
                    enable = false;
                }
            }
            enableButton($("#submitconsent"), enable, function(evt) {
                let results = {};
                for (let name of CONSENT_QUESTIONS) {
                    results[name] = $(`input[name=${name}]:checked`).val();
                }
                emit("submitconsent", results);
            });

        });
    });
}

function questionnaire_update(state, qname, nameSet, shuffle) {
    $(`#${qname} input`).each(function() {
        nameSet.add($(this).attr("name"));
        $(this).change(function(evt) {
            let missing = false;
            for (let r of nameSet) {
                if (!$(`#${qname} input[name='${r}']:checked`).val()) {
                    missing = true;
                    break;
                }
            }
            enableButton($(`#submit${qname}`), !missing, function(evt) {
                let results = {};
                for (let name of nameSet) {
                    results[name] = $(`#${qname} input[name='${name}']:checked`).val();
                }
                if (shuffle) {
                    $(`#${qname} .${shuffle}`).each(function(i) {
                        results[`${shuffle}_${i + 1}`] = $(this).attr("id")
                    });
                }
                emit(`submit${qname}`, results);
            });
        });
    });
    if (shuffle) {
        // A kludgey, ad hoc algorithm that probably doesn't meet fancy statistical tests,
        // but it's easy to do in the circumstances and probably good enough for our purposes.
        let n = $(`#${qname} .${shuffle}`).length;
        for (let i = 0; i < 25; ++i) {
            $(`#${qname} .question-container`)
                .append($(`#${qname} .${shuffle}`).eq(Math.floor(Math.random() * n)))
                .prepend($(`#${qname} .${shuffle}`).eq(Math.floor(Math.random() * n)));
        }
    }
}

var q1Radios = new Set();

function update_questionnaire1(state) {
    questionnaire_update(state, "questionnaire1", q1Radios, null);
}

var q2Radios = new Set();

function update_questionnaire2(state) {
    questionnaire_update(state, "questionnaire2", q2Radios, "emotion");
}

var q3Radios = new Set();

function update_questionnaire3(state) {
    questionnaire_update(state, "questionnaire3", q3Radios, "motivation");
}

var demoRadios = new Set();
var demoChecks = [];

function update_demographics(state) {
    $("#demographics input:radio").each(function() {
        // Note that this depends strongly on Sets being defined to preserve insertion order.
        demoRadios.add($(this).attr("name"));
    });
    $("#demographics input:checkbox").each(function() {
        demoChecks.push($(this).attr("name"));
    });
    $("#demographics input").each(function() {
        $(this).change(function(evt) {
            let missing = false;
            for (let r of demoRadios) {
                if (!$(`#demographics input:radio[name='${r}']:checked`).val()) {
                    missing = true;
                    break;
                }
            }
            if ($("#demographics input[name='race']:checked").length === 0) {
                missing = true;
            }
            if (!$("#demographics #age").val() || $("#demographics #age").val() < 18) {
                missing = true;
            }
            enableButton($("#submitdemographics"), !missing, function(evt) {
                let results = {};
                for (let name of demoRadios) {
                    results[name] = $(`#demographics input:radio[name='${name}']:checked`).val();
                }
                let races = [];
                $("#demographics input[name='race']:checked").each(function () {
                    races.push($(this).val());
                });
                results["race"] = races.join("+");
                results["age"] = $("#demographics #age").val();
                emit("submitdemographics", results);
            });
        });
    });
}

function update_instructions(state) {
    $("#rounds").text(state.rounds);
    $("#startpractice").click(evt => emit("startpractice"));
}

function update_game(state) {
    if (!state.isPractice) {
        $("#practice").css("display", "none");
    }
    $("#round-num").text(state.round);
    if (state.attentionData) {
        $("#decision, #next").addClass("inactive");
        $(".opponent").each(function(i) {
            let opp = state.opponents[i];
            setClass($(".card", this), "front");
            setText($(".card", this), "");
            setClass($(".card",this), "selectable");
            setClass($(".decider", this), "inactive", i);
            setClass($(".points-label", this), "highlight");
        });
        $("#reactions .card").each(function(i) {
            setText($(this), state.attentionData.reactions[i], true);
            setClass($(this), "front", i === state.selectedReaction);
            setClass($(this), "selectable", true);
        });
        $("#moment-text").text(state.attentionData.moment);
        setClass($("#self .points-label"), "highlight");
        setClass($("#self .decider"), "inactive", true);
        if (state.winner) {
            $("#submit").addClass("inactive");
            $("#next").removeClass("inactive");
        } else if (state.selectedReaction !== null) {
            $("#submit").removeClass("inactive");
        }
        return;
    }
    $(".opponent").each(function(i) {
        let opp = state.opponents[i];
        $(".points", this).text(opp.points);
        setClass($(".card", this), "front", opp.selectedReaction !== null)
        setText($(".card", this), opp.reactionTexts[opp.selectedReaction], opp.selectedReaction !== null);
        setClass($(".card",this), "selectable", state.decider == 3 && !state.winner);
        setClass($(".decider", this), "inactive", i !== state.decider);
        setClass($(".points-label", this), "highlight", state.winner === i + 2);
    });
    $("#reactions .card").each(function(i) {
        setText($(this), state.reactionTexts[i], state.decider <= 2);
        setClass($(this), "front", i === state.selectedReaction && state.decider <= 2);
        setClass($(this), "selectable",
                 state.decider <= 2 && !state.winner && state.selectedReaction !== i);
    });
    $("#moment-text").text(state.momentText);
    $("#self .points").text(state.points);
    setClass($("#self .points-label"), "highlight", state.winner === 1);
    setClass($("#self .decider"), "inactive", state.decider !== 3);
    $(".directions").addClass("inactive");
    if (state.winner) {
        $("#winner-number").text(state.winner);
        $("#decision, #next").removeClass("inactive");
    } else if (state.decider !== 3) {
        $("#select").removeClass("inactive");
        if (state.selectedReaction !== null) {
            $("#submit").removeClass("inactive");
        }
    } else {
        $("#decide").removeClass("inactive");
    }
}

function update_practiceover(state) {
}

function update_over(state) {
    let winners = [];
    if (state.finalWinners[0] === 1) {
        winners.push("you (Player-1)");
        state.finalWinners.shift();
    } else {
        $("#your-final-score span.final-score").text(state.points);
        if (state.points !== 1) {
            $("#your-final-score span.plural").text("s");
        }
        $("#your-final-score").css("display", "block");
    }
    for (i of state.finalWinners) {
        winners.push("Player-" + i);
    }
    switch (winners.length) {
    case 1:
        winnerString = `The winner is ${winners[0]},`;
        break;
    case 2:
        winnerString = `The winners are ${winners[0]} and ${winners[1]}, tied`;
        break;
    case 3:
        winnerString = `The winners are ${winners[0]}, ${winners[1]} and ${winners[2]}, tied`;
        break;
    case 4:
        winnerString = `All four players are tied as winners,`;
    }
    winnerString += ` with ${state.finalWinningScore} points`;
    winnerString += (winners.length > 1 ? " each." : ".");
    $("#final-winners").text(winnerString);
    if (state.completionCode) {
        $("#completion-code span").text(state.completionCode);
        $("#completion-code").css("display", "block");
    }
}

function update_completion(state) {
    update_exit(state);
}

function update_exit(state) {
    currentState = null;
    participantId = null;
    exited = true;
    interactionPending = true;
    window.onbeforeunload = null;
}

function setClass(thing, className, test) {
    return test ? thing.addClass(className) : thing.removeClass(className);
}

function setText(thing, s, test) {
    return test ? thing.text(s) : thing.empty();
}

function reactionClicked(evt) {
    if ((currentState.attentionData || currentState.decider <= 2) && !currentState.winner) {
        currentState.selectedReaction = evt.handleObj.data;
        update_game(currentState);
    }
}

function opponentReactionClicked(evt) {
    if (currentState.decider == 3 && !currentState.winner) {
        emit("choose", {"choice": evt.handleObj.data});
    }
}

function enableButton(button, enable, handler) {
    if (enable) {
        button.click(handler).addClass("enabled");
    } else {
        button.off("click").removeClass("enabled");;
    }
}

function emit(action, args) {
    if (!interactionPending) {
        interactionPending = true;
        // Change the cursor while watiing for the server; note that knowledge that
        // the server is done is when the update callback runs.
        $("body, .selectable, .button").addClass("waiting");
        if (args === undefined) {
            args = {};
        }
        args["pid"] = participantId || currentState.pid;
        args["action"] = action;
        $.getJSON("update", args, update);
    }
}

function toHexString(bytes) {
    let result = "";
    bytes.forEach(function(byte) {
        result += ("0" + (byte & 0xFF).toString(16)).slice(-2);
    });
    return result;
}

function makeWindowName() {
    let array = new Int8Array(6);
    window.crypto.getRandomValues(array);
    return toHexString(array);
}

$(function() {
    if ($("#client-script").attr("audit")) {
        $.getJSON("cards", function(data) {
            for (let d of data) {
                $("body").append(d);
            }
        });
        return;
    }
    if ($("#mtid").val()) {
        window.onbeforeunload = null;
        window.location.reload(true);
    }
    if (!window.name) {
        window.name = makeWindowName();
    }
    window.onbeforeunload = function(e) {
        e.preventDefault();
        return e.returnValue = "Please do not refresh or use the back button."
    }
    $("#startgame").click(evt => emit("startgame"));
    $("#reactions .card").each(function(i) {
        $(this).click(i, reactionClicked);
    });
    $("#opponents .card").each(function(i) {
        $(this).click(i+2, opponentReactionClicked);
    });
    $("#submit").click(evt => emit("submit", {"selectedReaction": currentState.selectedReaction}));
    $("#next").click(evt => emit("next"));
    $("#gamefinished").click(evt => emit("gamefinished"));
    $.getJSON("update", { "action": "init",
                          "config": $("#client-script").attr("config"),
                          "pane": window.name },
              update);
});
