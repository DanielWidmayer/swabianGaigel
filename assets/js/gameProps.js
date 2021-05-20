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
        if (jres.statusCode == 400) {
            window.location.href = "/list";
        } else console.log(jres);
    } else {
        console.log("socketconnect data: ");
        if (res != "OK") {
            console.log(res);
        }
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
    let meldCards = userhands[userHash].hand.getPair();
    if (meldCards.length > 0) {
        if (meldCards.length > 2) {
            // TODO: ask user which pair to meld if he has two pairs
        }
        let b_meldCards = [];
        meldCards.forEach((card) => {
            b_meldCards.push({ id: card.id, symbol: card.symbol, value: card.value });
        });
        io.socket.post("/callPair", { cards: b_meldCards }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                meldCards.forEach((card) => {
                    card.melded = true;
                });
                let firstpile = userhands[userHash].playingpile;
                firstpile.addCard(meldCards[0], meldCards[0].id);
                firstpile.render();
                let secondpile;
                for (const key in userhands) {
                    secondpile = userhands[key].playingpile;
                    if (secondpile != firstpile) break;
                }
                secondpile.addCard(meldCards[1], meldCards[1].id);
                secondpile.render();
                setTimeout(() => {
                    meldCards.forEach((card) => {
                        userhands[userHash].hand.addCard(card, card.id);
                    });
                    userhands[userHash].hand.sortHand();
                    userhands[userHash].hand.render();
                }, 2000);
            }
        });
    }
}

function stealTrumpCard() {
    let trumpSeven = userhands[userHash].hand.getTrumpSeven(trumpCard.bottomCard().symbol);
    if (trumpSeven != null) {
        let b_trumpSeven = { id: trumpSeven.id, symbol: trumpSeven.symbol, value: trumpSeven.value };
        io.socket.post("/robTrump", { card: b_trumpSeven }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                console.log(res);
                let userhand = userhands[userHash].hand;
                bsteal.prop("disabled", true);
                trumpCard.bottomCard().rotate(0);
                userhand.addCard(trumpCard.bottomCard(), trumpCard.bottomCard().id);
                trumpCard.addCard(trumpSeven, trumpSeven.id);
                userhand.sortHand();
                userhand.render();
                trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
                trumpCard.topCard().moveToBack();
            }
        });
    } else {
        console.log("Trumpcard could not be found, something has messed up.");
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
