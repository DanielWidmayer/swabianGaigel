const chf = $("#chatfield");
const gamef = $("#gamehistoryfield");
const fpost = $("#fpost");
const bpost = $("#bpost");

io.socket.on("joinmsg", function (data) {
    console.log("joined");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text}</p>`);
});

io.socket.on("leavemsg", function (data) {
    console.log("left");
    chf.append(`<p style="font-weigth: bold;">${data.user} ${data.text}</p>`);
});

io.socket.on("controllermsg", function (data) {
    console.log(data.msg);
    gamef.append(`<p>${data.msg}</p>`);
});

io.socket.on("chatmsg", function (data) {
    console.log(data.text);
    chf.append(`<div class="chatmsg"><b>${data.user}: </b><div>${data.text}</div></div>`);
});

io.socket.on("turnmsg", function (data) {
    console.log(data);
    let text;
    if (userHash == data.user.hashID) {
        text = "It's your turn.";
    } else {
        text = "It's " + data.user.name + "'s turn.";
    }
    gamef.append(`<hr class="mt-0"/><p class="mb-0">${text}</p>`);
});

io.socket.on("cardplayedmsg", function (data) {
    let icon;
    switch (data.card.symbol) {
        case 0:
            icon = '<i class="icon-eichel"></i>';
            break;
        case 1:
            icon = '<i class="icon-schellen"></i>';
            break;
        case 2:
            icon = '<i class="icon-herz"></i>';
            break;
        case 3:
            icon = '<i class="icon-blatt"></i>';
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
    gamef.append(`<p>${data.username} has played a ${cardletter}${icon}</p>`);
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
