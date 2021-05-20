const chf = $("#chatfield");
const gamef = $("#gamehistoryfield");
const fpost = $("#fpost");
const bpost = $("#bpost");

io.socket.on("joinmsg", function (data) {
    //console.log("joined");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text}</p>`);
});

io.socket.on("leavemsg", function (data) {
    // data.user = username, data.text = message, data.bot = botname
    //console.log("left");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text} ${data.bot}</p>`);
});

io.socket.on("controllermsg", function (data) {
    //console.log(data.msg);
    gamef.append(`<p>${data.msg}</p>`);
});

io.socket.on("chatmsg", function (data) {
    //console.log(data.text);
    chf.append(`<div class="chatmsg"><b>${data.user}:&nbsp;</b>${data.text}</div>`);
});

io.socket.on("turnmsg", function (data) {
    //console.log(data);
    let text;
    if (userHash == data.user.hashID) {
        text = '<p>You have won the trick.</p><p class="mb-3">Your score is now ' + data.user.score + '</p><hr class="mt-0"/><p>It\'s your turn.</p>';
    } else {
        text = "<p>" + data.user.name + ' has won the trick.</p><p class="mb-3">' + data.user.name + "'s score is now " + data.user.score + '</p><hr class="mt-0"/><p>It\'s ' + data.user.name + "'s turn.</p>";
    }
    gamef.append(`${text}`);
});

io.socket.on("cardplayedmsg", function (data) {
    let icon = getHtmlSymbol(data.card.symbol);
    let cardletter = getCardLetter(data.card.value);
    let text;
    if (userHash == data.user.hashID) {
        text = "You have";
    } else {
        text = `${data.user.name} has`;
    }
    gamef.append(`<p>${text} played a ${icon} ${cardletter}</p>`);
});

io.socket.on("paircalledmsg", function (data) {
    let text;
    let icon = getHtmlSymbol(data.symbol);
    if (userHash == data.user.hashID) {
        text = `<hr class="mt-0"/><p>You have melded in ${icon}.</p><p class="mb-3">Your score is now ${data.user.score}</p><hr class="mt-0"/>`;
    } else {
        text = `<hr class="mt-0"/><p>${data.user.name} has melded in ${icon}.</p><p class="mb-3">${data.user.name}'s score is now ${data.user.score}</p><hr class="mt-0"/>`;
    }
    gamef.append(`${text}`);
});

io.socket.on("cardrobmsg", function (data) {
    let text;
    let icon = getHtmlSymbol(data.card.symbol);
    let cardletter = getCardLetter(data.card.value);
    if (userHash == data.user.hashID) {
        text = `<hr class="mt-0"/><p>You have robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
    } else {
        text = `<hr class="mt-0"/><p>${data.user.name} has robbed the ${icon} ${cardletter}.</p><hr class="mt-0"/>`;
    }
    gamef.append(`${text}`);
});

io.socket.on("gameovermsg", function (data) {
    let text;
    if (userHash == data.user.hashID) {
        text = `<hr class="mt-0"/><p>Congratulations You have won the game!</p><hr class="mt-0"/>`;
    } else {
        text = `<hr class="mt-0"/><p>Game Over! ${data.user.name} has won the game!.</p><hr class="mt-0"/>`;
    }
    gamef.append(`${text}`);
});

io.socket.on("firstcardtypemsg", function (data) {
    let text;
    if (userHash == data.user.hashID) {
        text = `<p>You have called ${data.first_type}.</p>`;
    } else {
        text = `<p>${data.user.name} has called ${data.first_type}.</p>`;
    }
    gamef.append(`${text}`);
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

bpost.click(postmsg);

fpost.keypress(function (e) {
    var keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode == "13") postmsg();
});

function postmsg() {
    if (fpost.val().length > 0) {
        //console.log("posting");
        io.socket.post("/chatpost", { text: fpost.val() }, function (res, jres) {
            if (jres.statusCode != 200) {
                //console.log(jres);
                //console.log(res);
            } else {
                //console.log(res);
            }
            fpost.val("");
        });
    }
}
