// gameroom
const bleave = $("#bleave");
const bstart = $("#bstart");
const bmeld = $("#bmeld");
const bsteal = $("#bsteal");
const hash = window.location.href.split("/").pop();
var userLeft = false;
var ready = false;

$(function () {
    io.socket.post("/socketconnect", function (res, jres) {
        if (jres.statusCode != 200) {
            if (jres.statusCode == 400) {
                window.location.href = "/list";
            } else console.log(jres);
        } else {
            if (res != "OK") {
                console.log("socketconnect data: ");
                console.log(res);
                if (res.room.status == "game") {
                    initialize(res);
                    // check for already melded cards in users hand
                    if (res.room.called.length) {
                        res.room.called.forEach((card) => {
                            let fCard = userhands[userHash].hand.findCardByID(card.id);
                            if (fCard != null) {
                                fCard.melded = true;
                            }
                        });
                    }
                    // get played cards
                    let pCards = [];
                    if (res.room.played.length) {
                        res.room.played.forEach((card) => {
                            let fCard = findCertainCard(card.value, card.symbol);
                            deck.findCard(card.value, card.symbol);
                            pCards.push(fCard);
                        });
                    }
                    // get & render stack
                    if (res.room.stack.length) {
                        let activePlayer = res.room.acPl;
                        for (let i = res.room.stack.length - 1; i > -1; i--) {
                            let card = res.room.stack[i].card;
                            let fCard = findCertainCard(card.value, card.symbol);
                            userhands[res.users[activePlayer].hashID].playingpile.addCard(fCard);
                            activePlayer--;
                            if (activePlayer < 0) {
                                activePlayer = res.users.length - 1;
                            }
                        }
                    }

                    // render played cards & check hands
                    let c_ctr = 0;
                    for (let i = 0; i < res.users.length; i++) {
                        for (let j = 0; j < res.users[i].wins; j++) {
                            for (let k = 0; k < 2; k++) {
                                userhands[res.users[i].hashID].trickdeck.addCard(pCards[c_ctr]);
                                c_ctr++;
                            }
                        }
                        userhands[res.users[i].hashID].trickdeck.render({ immediate: true });
                        // check if each user has the expected amount of cards
                        if (res.users[i].hand > userhands[res.users[i].hashID].hand.length) {
                            userhands[res.users[i].hashID].hand.addCard(deck.topCard());
                            userhands[res.users[i].hashID].hand.render({ immediate: true });
                        } else if (res.users[i].hand < userhands[res.users[i].hashID].hand.length) {
                            deck.addCard(userhands[res.users[i].hashID].hand.topCard());
                            deck.render({ immediate: true });
                        }
                    }
                    // check if it's your turn
                    if (userHash == res.users[res.room.acPl].hashID) {
                        allowCardPlay();
                        appendMessage('<p><i class="bi bi-hourglass-split text-warning"></i>It\'s your turn.</p>', gamef);
                    } else {
                        appendMessage('</p><hr class="hr-thick"/><p><i class="bi bi-hourglass-split"></i>It\'s ' + res.users[res.room.acPl].name + "'s turn.</p>");
                    }
                }
            }
        }
    });
});

bleave.on("click", quitPage);
bstart.on("click", startGame);
bmeld.on("click", meldOnePair);
bsteal.on("click", stealTrumpCard);

function quitPage() {
    $("#quitPageModal").modal("show");
}

function socketleave() {
    io.socket.delete("/leave", function (res, jres) {
        if (jres.statusCode != 200) {
            //console.log(res);
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
            //console.log(res);
        } else {
            if (!ready) {
                //console.log("ready");
                ready = true;
                bstart.children().removeClass("bi-check");
                bstart.children().addClass("bi-check-square-fill");
            } else {
                //console.log("unready");
                ready = false;
                bstart.children().removeClass("bi-check-square-fill");
                bstart.children().addClass("bi-check");
            }
        }
    });
}

function meldOnePair() {
    let meldCards = userhands[userHash].hand.getPair();
    if (meldCards.length > 0 && trumpCard != null) {
        if (meldCards.length > 2) {
            // TODO: ask user which pair to meld if he has two pairs
            meldCards.splice(2, 2);
        }
        let b_meldCards = [];
        meldCards.forEach((card) => {
            b_meldCards.push({ id: card.id, symbol: card.symbol, value: card.value });
        });
        io.socket.post("/callPair", { cards: b_meldCards }, function (res, jres) {
            if (jres.statusCode != 200) {
                //console.log(jres);
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
    if (trumpCard != null) {
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
        }
    }
}

window.onbeforeunload = userUnloaded;

function userUnloaded() {
    if (!userLeft) {
        io.socket.post("/unloadUser", function (res, jres) {
            if (jres.statusCode != 200) {
                //console.log(res);
            } else {
                //console.log("User Unloaded");
            }
        });
    }
}
