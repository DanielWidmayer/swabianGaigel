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
    chf.append(`<p class="mb-0">${data.user}: ${data.text}</p>`);
});

io.socket.on("turnmsg", function (data) {
    console.log(data);
    let text;
    if (userHash == data.user.hashID) {
        text = "It's your turn.";
    } else {
        text = "It's " + data.user.name + "'s turn.";
    }
    gamef.append(`<p>${text}</p>`);
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
