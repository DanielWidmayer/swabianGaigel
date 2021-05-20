//const cards = require('./cards');

var containerHeight,
    containerWidth,
    deck,
    userhands = {},
    trumpCard,
    userHash,
    ownScore,
    firstTrick;

$(document).ready(function () {
    containerHeight = document.getElementById("card-table").offsetHeight;
    containerWidth = document.getElementById("card-table").offsetWidth;
    console.log(containerWidth + " x " + containerHeight);
    //Tell the library which element to use for the table
    cards.init({ table: "#card-table", type: GAIGEL });

    //Create a new deck of cards
    deck = new cards.Deck();

    //By default it's in the middle of the container, put it to the side
    deck.x -= containerWidth / 3;
    deck.y += 47;

    //cards.all contains all cards, put them all in the deck
    deck.addCards(cards.all);

    //No animation here, just get the deck onto the table.
    deck.render({ immediate: true });

    userHash = getCookie("userhash");
});

//Let's deal when the game has been started
io.socket.on("start", function (data) {
    console.log("start:");
    console.log(data);
    let usr_ctr = data.users.length;
    let positions = [];
    if (usr_ctr == 6) {
        positions.push({ x: containerWidth - 135, y: (containerHeight * 5) / 6 });
        positions.push({ x: containerWidth - 135, y: containerHeight / 2 });
    }
    if (usr_ctr > 2) positions.push({ x: containerWidth - 135, y: containerHeight / 6 });
    if (usr_ctr > 3 || usr_ctr == 2) positions.push({ x: containerWidth / 2, y: containerHeight / 6 });
    if (usr_ctr > 2) positions.push({ x: containerWidth / 6, y: containerHeight / 6 });
    console.log(positions);
    let j = data.users.findIndex((el) => el.hashID == userHash);
    if (j == -1) j = 0;
    for (let i = 0; i < usr_ctr; i++) {
        console.log(j);
        console.log(data.users[j]);
        let user = data.users[j];
        let tempusrobj;
        if (userHash == user.hashID) {
            tempusrobj = {
                hand: new cards.Hand({ faceUp: true, y: (containerHeight * 5) / 6 }),
                trickdeck: new cards.Deck({
                    faceUp: false,
                    y: (containerHeight * 5) / 6,
                    x: containerWidth / 2 - 220,
                }),
                playingpile: new cards.Deck({ faceUp: true, x: containerWidth / 3 + 100 * i }),
            };
        } else {
            tempusrobj = {
                hand: new cards.Hand({ faceUp: false, x: positions[0].x, y: positions[0].y }),
                trickdeck: new cards.Deck({
                    faceUp: false,
                    x: positions[0].x - 160,
                    y: positions[0].y,
                }),
                playingpile: new cards.Deck({ faceUp: true, x: containerWidth / 3 + 100 * i }),
            };
            positions.shift();
        }
        userhands[user.hashID] = tempusrobj;
        j++;
        if (j >= usr_ctr) j = 0;
    }

    // Adds a trump Card
    trumpCard = new cards.Deck({ faceUp: true });
    trumpCard.x -= containerWidth / 3 - 60;
    trumpCard.y = deck.y;

    console.log(data);
    $("#bstart").hide();
    $(".bi-check-circle-fill").remove();
    $(".bi-x-circle-fill").remove();

    ownScore = -1;
    let cardTrump = data.trump;
    trumpCard.addCard(deck.findCard(cardTrump["value"], cardTrump["symbol"]), cardTrump.id);
    trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
    trumpCard.topCard().moveToBack();

    let cardHand = data.hand;
    for (let i = 0; i < cardHand.length; i++) {
        let card = cardHand[i];
        let fCard = findCertainCard(card["value"], card["symbol"]);
        userhands[userHash].hand.addCard(fCard, card.id);
        for (key in userhands) {
            if (key != userHash) {
                userhands[key].hand.addCard(deck.topCard());
            }
        }
    }
    userhands[userHash].hand.sortHand();
    userhands[userHash].hand.render();
    for (key in userhands) {
        userhands[key].hand.render();
    }
});

io.socket.on("turn", function (data) {
    if (userHash == data.user.hashID) {
        console.log("Its your turn.");
        // Finally, when you click a card in your hand, it is played
        userhands[userHash].hand.click(function (card) {
            let bCard = { id: card.id, value: card.value, symbol: card.symbol };
            io.socket.post("/playCard", { card: bCard }, function (res, jres) {
                if (jres.statusCode != 200) {
                    console.log(jres);
                } else {
                    console.log(res);
                }
            });
            userhands[userHash].playingpile.addCard(card, card.id);
            userhands[userHash].playingpile.render({
                callback: userhands[userHash].playingpile.topCard().rotate(getRandomArbitrary(-20, 20)),
            });
            userhands[userHash].hand.render();
            userhands[userHash].hand._click = null;
        });
    } else {
        console.log("Its " + data.user.name + "'s turn.");
    }
});

function findCertainCard(value, symbol) {
    let fCard = deck.findCard(value, symbol);
    if (fCard == null) {
        for (key in userhands) {
            if (key != userHash) {
                fCard = userhands[key].hand.findCard(value, symbol);
                if (fCard != null) {
                    userhands[key].hand.addCard(deck.topCard());
                    return fCard;
                }
            }
        }
    }
    return fCard;
}

function findAndChangeCard(value, symbol, id, hashID, cardToReplace) {
    let fCard = deck.findCard(value, symbol);
    if (fCard == null) {
        fCard = userhands[hashID].hand.findCard(value, symbol);
        if (fCard == null) {
            for (key in userhands) {
                fCard = userhands[key].hand.findCard(value, symbol);
                if (fCard != null) {
                    userhands[key].hand.addCard(cardToReplace);
                    userhands[hashID].hand.addCard(fCard, id);
                    userhands[key].hand.render({ immediate: true });
                    userhands[hashID].hand.render({ immediate: true });
                    return fCard;
                }
            }
        }
    } else {
        deck.addCard(cardToReplace);
        userhands[hashID].hand.addCard(fCard, id);
        userhands[hashID].hand.render({ immediate: true });
        deck.render({ immediate: true });
    }
    return fCard;
}

io.socket.on("cardplayed", function (data) {
    let card = data.card;
    let playerHash = data.user.hashID;
    if (userHash != playerHash) {
        let fCard = findAndChangeCard(card.value, card.symbol, card.id, playerHash, userhands[playerHash].hand.topCard());
        userhands[playerHash].playingpile.addCard(fCard);
        userhands[playerHash].playingpile.render({
            callback: userhands[playerHash].playingpile.topCard().rotate(getRandomArbitrary(-200, -160)),
        });
    }
});

io.socket.on("solowin", function (data) {
    let winningTrickDeck;
    if (userHash == data.user.hashID) {
        winningTrickDeck = userhands[userHash].trickdeck;
        ownScore = data.user.score;
    } else if (userHash != data.user.hashID) {
        winningTrickDeck = userhands[data.user.hashID].trickdeck;
    }

    setTimeout(() => {
        for (key in userhands) {
            winningTrickDeck.addCard(userhands[key].playingpile.bottomCard());
            winningTrickDeck.topCard().rotate(90);
        }
        winningTrickDeck.render();
    }, 2500);
    console.log(data.user.name + " now has a score of: " + data.user.score);
});

io.socket.on("dealcard", function (data) {
    let card = data.card[0];
    console.log(data.card);
    let fCard = findCertainCard(card["value"], card["symbol"]);
    setTimeout(() => {
        userhands[userHash].hand.addCard(fCard, card.id);
        userhands[userHash].hand.sortHand();
        userhands[userHash].hand.render();
        for (key in userhands) {
            if (key != userHash) {
                userhands[key].hand.addCard(deck.topCard());
                userhands[key].hand.render();
            }
        }
        let pair = userhands[userHash].hand.getPair();
        if (pair.length > 0 && ownScore > -1) {
            let melded = false;
            pair.forEach((card) => {
                if (card.melded) melded = true;
            });
            if (!melded) {
                console.log("Has Pair & Can Meld & Neither one of the cards was melded already!");
                $("#bmeld").prop("disabled", false);
            } else {
                $("#bmeld").prop("disabled", true);
            }
        } else {
            $("#bmeld").prop("disabled", true);
        }
        if (userhands[userHash].hand.getTrumpSeven(trumpCard.bottomCard().symbol) != null && ownScore > -1 && trumpCard.topCard().value != 7) {
            console.log("Has Seven & Can Rob & Seven hasn't been robbed already!");
            $("#bsteal").prop("disabled", false);
        } else {
            $("#bsteal").prop("disabled", true);
        }
    }, 2500);
});

io.socket.on("firstturn", function (data) {
    console.log(data);
    if (userHash == data.user.hashID) {
        console.log("You begin the game");
        userhands[userHash].hand.click(function (card) {
            let hand = userhands[userHash].hand;
            if (card.symbol != trumpCard.bottomCard().symbol || !hand.find((el) => el.symbol != trumpCard.bottomCard().symbol)) {
                let bCard = { id: card.id, value: card.value, symbol: card.symbol };
                io.socket.post("/playCard", { card: bCard }, function (res, jres) {
                    if (jres.statusCode != 200) {
                        console.log(jres);
                    } else {
                        console.log(res);
                    }
                });
                let playingpile = userhands[userHash].playingpile;
                playingpile.addCard(card, card.id);
                playingpile.render({
                    callback: playingpile.topCard().rotate(getRandomArbitrary(-20, 20)),
                });
                userhands[userHash].hand.render();
                userhands[userHash].hand._click = null;
            } else {
                console.log("You're not allowed to play a trump card.");
            }
        });
    } else {
        console.log(data.user.name + " begins the game.");
    }
});

io.socket.on("firstcard", function (data) {
    console.log(data);
    let playerHash = data.user.hashID;
    if (userHash != playerHash) {
        console.log(data.type); // TODO: First Trick Type Animation
        let playingpile = userhands[playerHash].playingpile;
        playingpile.faceUp = false;
        playingpile.addCard(userhands[playerHash].hand.topCard());
        playingpile.render();
    }
});

io.socket.on("firstwin", function (data) {
    console.log(data);
    let udata = data.data;
    for (const key in udata) {
        if (userHash != key) {
            console.log(udata[key]);
            console.log(key);
            let playingpile = userhands[key].playingpile;
            let fCard = findAndChangeCard(udata[key].value, udata[key].symbol, udata[key].id, key, playingpile.bottomCard());
            playingpile.addCard(fCard, fCard.id);
            playingpile.faceUp = true;
            playingpile.render({ immediate: true });
        }
    }
});

io.socket.on("paircalled", function (data) {
    console.log(data);
    let cards = data.cards;
    let fCards = [];
    let userhand = userhands[data.user.hashID].hand;
    cards.forEach((card) => {
        let fCard = userhand.topCard();
        if (fCards.find((el) => el == fCard)) fCard = userhand.bottomCard();
        let searchCard = findAndChangeCard(card.value, card.symbol, card.id, data.user.hashID, fCard);
        fCards.push(searchCard);
    });
    let firstpile = userhands[data.user.hashID].playingpile;
    firstpile.addCard(fCards[0]);
    firstpile.render();
    let secondpile = userhands.find((el) => el.playingpile != firstpile);
    secondpile.playingpile.addCard(fCards[0]);
    secondpile.playingpile.render();
    setTimeout(() => {
        userhand.addCards(fCards);
        userhand.render();
    }, 2000);
});

io.socket.on("cardrob", function (data) {
    console.log(data);
    let card = data.card;
    let userhand = userhands[data.user.hashID].hand;
    let fCard = findAndChangeCard(card.value, card.symbol, card.id, data.user.hashID, userhand.bottomCard());
    userhand.addCard(trumpCard.bottomCard());
    trumpCard.addCard(fCard);
    userhand.render();
    trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
    trumpCard.topCard().moveToBack();
});

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Tell the library which element to use for the table
