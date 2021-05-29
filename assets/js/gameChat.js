// Global Chat Vars
const chf = $("#chatfield");
const gamef = $("#gamehistoryfield");
const fpost = $("#fpost");
const bpost = $("#bpost");

// Automatic Scroll if user is at bottom of chat
function appendMessage(text, field) {
    let actualScroll = field[0].scrollTop + field[0].clientHeight;
    let shouldScroll = actualScroll >= field[0].scrollHeight - 10 && actualScroll <= field[0].scrollHeight + 10;
    field.append(text);
    if (shouldScroll) {
        field.animate({ scrollTop: field[0].scrollHeight }, 500);
    }
}

// Chat Socket Events
io.socket.on("joinmsg", function (data) {
    switch (data.trigger) {
        case 0:
            appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-person-plus-fill text-success"></i>${data.user} joined the room</p>`, chf);
            break;
        case 1:
            appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-person-check-fill text-success"></i>${data.user} reconnected</p>`, chf);
            break;
    }
});

io.socket.on("leavemsg", function (data) {
    switch (data.trigger) {
        case 0:
            appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-door-open-fill text-danger"></i>${data.user} left the room</p>`, chf);
            break;
        case 1:
            appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-person-x-fill text-danger"></i>${data.user} disconnected (timeout)</p>`, chf);
            break;
        case 2:
            appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-person-dash-fill text-danger"></i>${data.user} was kicked</p>`, chf);
            break;
    }
});

io.socket.on("botmsg", function (data) {
    if (data.trigger > 0) appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-cpu text-success"></i>Bot ${data.bot} added</p>`, chf);
    else appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-cpu text-danger"></i>Bot ${data.bot} removed</p>`, chf);
});

io.socket.on("replacemsg", function (data) {
    if (data.trigger > 0) appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-cpu text-warning"></i>${data.user} replaced Bot ${data.bot}</p>`, chf);
    else appendMessage(`<p style="font-weigth: bold;"><i class="bi bi-cpu text-warning"></i>Bot ${data.bot} replaced ${data.user}</p>`, chf);
});

io.socket.on("errormsg", function (data) {
    appendMessage(`<p class="chatmsg chatmsg-err"><i class="bi bi-exclamation-diamond text-danger"></i>${data.text}</p>`, chf);
});

io.socket.on("chatmsg", function (data) {
    appendMessage(`<div class="chatmsg chatmsg-user"><b>${data.user}:&nbsp;</b>${data.text}</div>`, chf);
});

io.socket.on("turnmsg", function (data) {
    let text;
    let col = "";
    if (data.user.team) {
        col = teamcolors[data.user.team - 1];
    }
    if (userHash == data.user.hashID) {
        text = `<p class="${col}"><i class="bi bi-trophy"></i>You have won the trick.</p><p><i class="bi bi-trophy-fill"></i>Your score is now ${data.user.score} </p><hr class="hr-thick"/><p><i class="bi bi-hourglass-split text-warning"></i>It\'s your turn.</p>`;
    } else {
        text = '<p class="' + col + '"><i class="bi bi-trophy"></i>' + data.user.name + " has won the trick.</p>";
        if (data.show) text += `<p><i class="bi bi-trophy-fill"></i>${data.user.name}'s score is now ${data.user.score}</p>`;
        text = text + '<hr class="hr-thick"/><p><i class="bi bi-hourglass-split"></i>It\'s ' + data.user.name + "'s turn.</p>";
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("firstturnmsg", function (data) {
    let text;
    if (userHash == data.user.hashID) {
        text = '<p><i class="bi bi-hourglass-split text-warning"></i>You start the game.</p>';
    } else {
        text = `<p><i class="bi bi-hourglass-split"></i>${data.user.name} starts the game.</p>`;
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("cardplayedmsg", function (data) {
    let icon = getHtmlSymbol(data.card.symbol);
    let cardletter = getCardLetter(data.card.value);
    let text;
    if (userHash == data.user.hashID) {
        text = "You";
    } else {
        text = `${data.user.name}`;
    }
    appendMessage(`<p><i class="bi bi-file-play"></i>${text}: played ${icon} ${cardletter}</p>`, gamef);
});

io.socket.on("paircalledmsg", function (data) {
    let text;
    let icon = getHtmlSymbol(data.symbol);
    if (userHash == data.user.hashID) {
        text = `<hr class="mb-0"/><p><i class="bi bi-people-fill text-info"></i>You have melded in ${icon}.</p><p><i class="bi bi-trophy-fill"></i>Your score is now ${data.user.score}</p><hr class="mt-0"/>`;
    } else {
        text = `<hr class="mb-0"/><p><i class="bi bi-people-fill text-info"></i>${data.user.name} has melded in ${icon}.</p>`;
        if (data.show) text = text + `<p><i class="bi bi-trophy-fill"></i>${data.user.name}'s score is now ${data.user.score}</p><hr class="mt-0"/>`;
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("cardrobmsg", function (data) {
    let text;
    let icon = getHtmlSymbol(data.card.symbol);
    let cardletter = getCardLetter(data.card.value);
    if (userHash == data.user.hashID) {
        text = `<hr class="mb-0"/><p><i class="bi bi-file-arrow-down text-info"></i>You have robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
    } else {
        text = `<hr class="mb-0"/><p><i class="bi bi-file-arrow-down text-info"></i>${data.user.name} has robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("gameovermsg", function (data) {
    let text;
    if (data.users.find((el) => el.hashID == userHash)) {
        text = `<hr class="mb-0"/><p><i class="bi bi-trophy"></i><i class="bi bi-trophy"></i><i class="bi bi-trophy"></i>Congratulations You have won the game!<i class="bi bi-trophy"></i><i class="bi bi-trophy"></i><i class="bi bi-trophy"></i></p><hr class="mt-0 hr-thick"/>`;
    } else {
        let winners = "";
        for (const user of data.users) {
            winners += user.name + " ";
        }
        text = `<hr class="mb-0"/><p><i class="bi bi-award"></i>Game Over! ${winners} has won the game!</p><hr class="mt-0 hr-thick"/>`;
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("firstcardtypemsg", function (data) {
    let text;
    if (userHash == data.user.hashID) {
        text = `<p><i class="bi bi-person"></i>You: called ${data.first_type}.</p>`;
    } else {
        text = `<p><i class="bi bi-person"></i>${data.user.name}: called ${data.first_type}.</p>`;
    }
    appendMessage(`${text}`, gamef);
});

io.socket.on("deckemptymsg", function () {
    let text = `<p><i class="bi bi-controller"></i>The Deck is empty. You have to follow suit and try to win the trick now.</p>`;
    appendMessage(`${text}`, gamef);
});

function getHtmlSymbol(symbol) {
    let icon;
    switch (symbol) {
        case 0:
            icon = '<img class="img-icon-thin" src="../images/eichel.png"></img>';
            break;
        case 1:
            icon = '<img class="img-icon" src="../images/schellen.png"></img>';
            break;
        case 2:
            icon = '<img class="img-icon" src="../images/herz.png"></img>';
            break;
        case 3:
            icon = '<img class="img-icon" src="../images/blatt.png"></img>';
            break;
        default:
            icon = "";
            break;
    }
    return icon;
}

function getCardLetter(value) {
    let cardletter;
    switch (value) {
        case 0:
            cardletter = "7";
            break;
        case 2:
            cardletter = "U";
            break;
        case 3:
            cardletter = "O";
            break;
        case 4:
            cardletter = "K";
            break;
        case 10:
            cardletter = "10";
            break;
        case 11:
            cardletter = "A";
            break;

        default:
            cardletter = "";
            break;
    }
    return cardletter;
}

bpost.on("click", postmsg);

fpost.keypress(function (e) {
    var keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode == "13") postmsg();
});

function postmsg() {
    if (fpost.val().length > 0) {
        io.socket.post("/chatpost", { text: fpost.val() }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                fpost.val("");
            }
        });
    }
}

function copyHrefToClipboard() {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(window.location.href).select();
    document.execCommand("copy");
    $temp.remove();
    $("#binvite").popover("show");
    setTimeout(() => {
        $("#binvite").popover("hide");
    }, 1000);
}
