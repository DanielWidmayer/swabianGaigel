const chf = $("#chatfield");
const gamef = $("#gamehistoryfield");
const fpost = $("#fpost");
const bpost = $("#bpost");

io.socket.on("joinmsg", function (data) {
    console.log("joined");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text}</p>`);
});

io.socket.on("leavemsg", function (data) {          // data.user = username, data.text = message, data.bot = botname
    console.log("left");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text} ${data.bot}</p>`);
});

io.socket.on("controllermsg", function (data) {
    console.log(data.msg);
    gamef.append(`<p>${data.msg}</p>`);
});

io.socket.on("chatmsg", function (data) {
    console.log(data.text);
    chf.append(`<div class="chatmsg"><b>${data.user}:&nbsp;</b>${data.text}</div>`);
});

io.socket.on("turnmsg", function (data) {
    console.log(data);
    let text;
    if (userHash == data.user.hashID) {
        text = '<p>You have won the trick.</p><p class="mb-3">Your score is now ' + data.user.score + '</p><hr class="mt-0"/><p>It\'s your turn.</p>';
    } else {
        text = "<p>" + data.user.name + ' has won the trick.</p><p class="mb-3">' + data.user.name + "'s score is now " + data.user.score + '</p><hr class="mt-0"/><p>It\'s ' + data.user.name + "'s turn.</p>";
    }
    gamef.append(`${text}`);
});

io.socket.on("cardplayedmsg", function (data) {
    let icon;
    switch (data.card.symbol) {
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
            break;
    }
    let cardletter;
    switch (data.card.value) {
        case 0:
            cardletter = "7";
            break;
        case 2:
            cardletter = "J";
            break;
        case 3:
            cardletter = "Q";
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
            break;
    }
    gamef.append(`<p>${data.username} has played a ${icon} ${cardletter}</p>`);
});

bpost.click(postmsg);

fpost.keypress(function (e) {
    var keycode = e.keyCode ? e.keyCode : e.which;
    if (keycode == "13") postmsg();
});

function postmsg() {
    if (fpost.val().length > 0) {
        console.log("posting");
        io.socket.post("/chatpost", { text: fpost.val() }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
                console.log(res);
            } else {
                console.log(res);
            }
            fpost.val("");
        });
    }
}
