// gameroom
const bleave = $("#bleave");
const bstart = $("#bstart");
const bmeld = $("#bmeld");
const bsteal = $("#bsteal");
const hash = window.location.href.split("/").pop();
var userLeft = false;
var ready = false;

io.socket.post("/socketconnect", function (res, jres) {
    if (jres.statusCode != 200) {
        console.log(res);
    } else {
        console.log("ok");
    }
});

bleave.click(quitPage);
bstart.click(startGame);
bmeld.click(meldOnePair);
bsteal.click(stealTrumpCard);

function quitPage() {
    $("#quitPageModal").modal("show");
}

function socketleave() {
    io.socket.delete("/leave", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(res);
        } else {
            userLeft = true;
            window.location.href = "/list";
        }
    });
}

function startGame() {
    // ready animation
    io.socket.post("/startGame", function (res, jres) {
        if (jres.statusCode != 200) {
            console.log(res);
        } else {
            console.log(res.ready);
            console.log(res.needed);
            if (!ready) {
                console.log("ready");
                ready = true;
                bstart.children().removeClass("bi-check");
                bstart.children().addClass("bi-check-square-fill");
            } else {
                console.log("unready");
                ready = false;
                bstart.children().removeClass("bi-check-square-fill");
                bstart.children().addClass("bi-check");
            }
        }
    });
}

function meldOnePair() {
    let meldCards = lowerhand.getPair();
    if (meldCards.length > 0) {
        io.socket.post("/meldPair", { cards: meldCards }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                console.log(res);
            }
        });
    }
}

function stealTrumpCard() {
    let trumpSeven = lowerhand.getTrumpSeven(trumpCard.bottomCard());
    if (trumpSeven != null) {
        io.socket.post("/robTrump", { card: trumpSeven }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                console.log(res);
            }
        });
    }
}

window.onbeforeunload = userUnloaded;

function userUnloaded() {
    if (!userLeft) {
        io.socket.post("/unloadUser", function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(res);
            } else {
                console.log("User Unloaded");
            }
        });
    }
}
