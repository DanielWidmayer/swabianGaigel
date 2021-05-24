//const cards = require('./cards');

var containerHeight,
    containerWidth,
    deck,
    userhands = {},
    trumpCard,
    userHash,
    ownScore,
    firstTrick;

$(function () {
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

function initialize(data) {
    let usr_ctr = data.users.length;
    let positions = [];
    if (usr_ctr == 6) {
        positions.push({ x: containerWidth - 135, y: (containerHeight * 5) / 6 });
        positions.push({ x: containerWidth - 135, y: containerHeight / 2 });
    }
    if (usr_ctr > 2) positions.push({ x: containerWidth - 135, y: containerHeight / 6 });
    if (usr_ctr > 3 || usr_ctr == 2) positions.push({ x: containerWidth / 2, y: containerHeight / 6 });
    if (usr_ctr > 2) positions.push({ x: containerWidth / 6, y: containerHeight / 6 });
    let j = data.users.findIndex((el) => el.hashID == userHash);
    if (j == -1) j = 0;
    for (let i = 0; i < usr_ctr; i++) {
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
                playingpile: new cards.Deck({
                    faceUp: true,
                    x: containerWidth / 3 + 100 * i,
                }),
            };
        } else {
            tempusrobj = {
                hand: new cards.Hand({
                    faceUp: false,
                    x: positions[0].x,
                    y: positions[0].y,
                }),
                trickdeck: new cards.Deck({
                    faceUp: false,
                    x: positions[0].x - 160,
                    y: positions[0].y,
                }),
                playingpile: new cards.Deck({
                    faceUp: true,
                    x: containerWidth / 3 + 100 * i,
                }),
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
        for (const key in userhands) {
            if (key != userHash) {
                userhands[key].hand.addCard(deck.topCard());
            }
        }
    }
    userhands[userHash].hand.sortHand();
    userhands[userHash].hand.render();
    for (const key in userhands) {
        userhands[key].hand.render();
    }
}

// initialize as the game started
io.socket.on("start", function (data) {
    initialize(data);
});

io.socket.on("turn", function (data) {
    $("#currentUserIcon").animate({ left: userhands[data.user.hashID].hand.x + 30, top: userhands[data.user.hashID].hand.y + 150 });
    if (userHash == data.user.hashID) {
        console.log("Its your turn.");
        // allow card click to play a card
        allowCardPlay();
    } else {
        console.log("Its " + data.user.name + "'s turn.");
    }
});

function findCertainCard(value, symbol) {
    let fCard = deck.findCard(value, symbol);
    if (fCard == null) {
        for (const key in userhands) {
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
            for (const key in userhands) {
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
    } else {
        let fCard = userhands[userHash].hand.findCardByID(data.card.id);
        userhands[userHash].playingpile.addCard(fCard, data.card.id);
        userhands[userHash].playingpile.render({
            callback: userhands[userHash].playingpile.topCard().rotate(getRandomArbitrary(-20, 20)),
        });
        userhands[userHash].hand.render();
        userhands[userHash].hand._click = null;
    }
});

io.socket.on("roundwin", function (data) {
    let winningTrickDeck;
    if (userHash == data.user.hashID) {
        winningTrickDeck = userhands[userHash].trickdeck;
        ownScore = data.user.score;
    } else if (userHash != data.user.hashID) {
        winningTrickDeck = userhands[data.user.hashID].trickdeck;
    }

    setTimeout(() => {
        for (const key in userhands) {
            winningTrickDeck.addCard(userhands[key].playingpile.bottomCard());
            winningTrickDeck.topCard().rotate(90);
        }
        winningTrickDeck.render();
    }, 2500);
    console.log(data.user.name + " now has a score of: " + data.user.score);
});

io.socket.on("dealcard", function (data) {
    console.log("dealcard received");
    console.log(data.card[0]);
    let card = data.card[0];
    let fCard = findCertainCard(card["value"], card["symbol"]);
    setTimeout(() => {
        userhands[userHash].hand.addCard(fCard, card.id);
        userhands[userHash].hand.sortHand();
        userhands[userHash].hand.render();
        for (const key in userhands) {
            if (key != userHash) {
                userhands[key].hand.addCard(deck.topCard());
                userhands[key].hand.render();
            }
        }
        let pair = userhands[userHash].hand.getPair();
        if (pair.length > 0 && ownScore > -1) {
            console.log("Has Pair & Can Meld & Neither one of the cards was melded already!");
            $("#bmeld").prop("disabled", false);
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

io.socket.on("dealTrump", function (data) {
    console.log(data); // data.user, data.card
    let uhand = userhands[data.user.hashID].hand;
    uhand.addCard(trumpCard.bottomCard());
    uhand.render();
    trumpCard = null;
    $("#bmeld").prop("disabled", true);
    $("#bsteal").prop("disabled", true);
});

io.socket.on("firstturn", function (data) {
    $("#currentUserIcon").animate({ left: userhands[data.user.hashID].hand.x + 30, top: userhands[data.user.hashID].hand.y + 150, opacity: 1.0 });
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
            } else {
                console.log("You're not allowed to play a trump card.");
            }
        });
    } else {
        console.log(data.user.name + " begins the game.");
    }
});

io.socket.on("firstcard", function (data) {
    let playerHash = data.user.hashID;
    if (userHash != playerHash) {
        let playingpile = userhands[playerHash].playingpile;
        playingpile.faceUp = false;
        playingpile.addCard(userhands[playerHash].hand.topCard());
        playingpile.render();
    } else {
        let fCard = userhands[userHash].hand.findCard(data.card.value, data.card.symbol);
        userhands[userHash].playingpile.addCard(fCard, data.card.id);
        userhands[userHash].playingpile.render({
            callback: userhands[userHash].playingpile.topCard().rotate(getRandomArbitrary(-20, 20)),
        });
        userhands[userHash].hand.render();
        userhands[userHash].hand._click = null;
    }
});

io.socket.on("firstwin", function (data) {
    let udata = data.data;
    for (const key in udata) {
        if (userHash != key) {
            let playingpile = userhands[key].playingpile;
            let fCard = findAndChangeCard(udata[key].value, udata[key].symbol, udata[key].id, key, playingpile.bottomCard());
            playingpile.addCard(fCard, udata[key].id);
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
    let secondpile;
    for (const key in userhands) {
        secondpile = userhands[key].playingpile;
        if (secondpile != firstpile) break;
    }
    secondpile.addCard(fCards[1]);
    secondpile.render();
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
    trumpCard.addCard(fCard, card.id);
    userhand.render();
    trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
    trumpCard.topCard().moveToBack();
});

io.socket.on("gameover", function (data) {
    console.log(data);
    // array data.winners
    if (data.winners.find((el) => el.hashID == userHash)) {
        $("body").append('<img class="gameover-img" src="/images/font_victory.png"></img>');
        $(".gameover-img").animate({ opacity: 1.0 });
    } else {
        $("body").append('<img class="gameover-img" src="/images/font_gameover.png"></img>');
        $(".gameover-img").animate({ opacity: 1.0 });
    }
    $(".game-utils").append('<button class="btn btn-game btn-secondary" title="Reload to Play again" onclick="window.location.reload();"><i class="bi bi-arrow-clockwise"></i></button>');
});

io.socket.on("kicked", function (data) {
    // <--- JBHR ---
    location.reload();
});

function allowCardPlay() {
    userhands[userHash].hand.click(function (card) {
        let bCard = { id: card.id, value: card.value, symbol: card.symbol };
        io.socket.post("/playCard", { card: bCard }, function (res, jres) {
            if (jres.statusCode != 200) {
                console.log(jres);
            } else {
                console.log(res);
            }
        });
    });
}

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
