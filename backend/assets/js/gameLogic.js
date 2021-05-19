//const cards = require('./cards');

var containerHeight,
    containerWidth,
    deck,
    userhands = {},
    trumpCard,
    userHash,
    ownScore;

$(document).ready(function () {
    containerHeight = document.getElementById("card-table").offsetHeight;
    containerWidth = document.getElementById("card-table").offsetWidth;

    //Tell the library which element to use for the table
    cards.init({ table: "#card-table", type: GAIGEL });

    //Create a new deck of cards
    deck = new cards.Deck();

    //By default it's in the middle of the container, put it to the side
    deck.x -= containerWidth / 5;

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
    for (let i = 0; i < usr_ctr; i++) {
        let user = data.users[i];
        let tempusrobj;
        if (userHash == user.hashID) {
            tempusrobj = {
                hand: new cards.Hand({ faceUp: true, y: (containerHeight * 4) / 5 }),
                trickdeck: new cards.Deck({
                    faceUp: false,
                    y: (containerHeight * 4) / 5,
                    x: containerWidth / 5,
                }),
                playingpile: new cards.Deck({ faceUp: true, x: containerWidth / 2 }),
            };
        } else {
            tempusrobj = {
                hand: new cards.Hand({ faceUp: false, y: containerHeight / 5, x: containerWidth / (1 + usr_ctr - i) }),
                trickdeck: new cards.Deck({
                    faceUp: false,
                    y: containerHeight / 5,
                    x: containerWidth / (1.5 + usr_ctr - i),
                }),
                playingpile: new cards.Deck({ faceUp: true, x: containerWidth / 3 + 100 * usr_ctr }),
            };
        }
        userhands[user.hashID] = tempusrobj;
    }

    // Adds a trump Card
    trumpCard = new cards.Deck({ faceUp: true });
    trumpCard.x -= containerWidth / 5 - 50;
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
            userhands[key].hand.findCard(value, symbol);
            if (fCard != null) {
                userhands[key].hand.addCard(deck.topCard());
                break;
            }
        }
    }
    return fCard;
}

io.socket.on("cardplayed", function (data) {
    let card = data.card;
    let playerHash = data.user.hashID;
    if (userHash != playerHash) {
        let fCard = deck.findCard(card["value"], card["symbol"]);
        if (fCard == null) {
            // search through other hands
            fCard = userhands[playerHash].findCard(card["value"], card["symbol"]);
            if (fCard == null) {
                for (key in userhands) {
                    userhands[key].hand.findCard(value, symbol);
                    if (fCard != null) {
                        userhands[key].hand.addCard(userhands[playerHash].topCard());
                        userhands[playerHash].hand.addCard(fCard);
                        userhands[key].hand.render({ immediate: true });
                        userhands[playerHash].hand.render({ immediate: true });
                        break;
                    }
                }
            }
        } else {
            deck.addCard(userhands[playerHash].hand.topCard());
            userhands[playerHash].hand.addCard(fCard);
            userhands[playerHash].hand.render({ immediate: true });
            deck.render({ immediate: true });
        }
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
        }
        winningTrickDeck.addCard(userhands[userHash].playingpile.bottomCard());
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

io.socket.on("paircalled", function (data) {
    console.log(data);
    let cards = data.cards;
    let fCards = [];
    cards.forEach((card) => {
        let searchCard = upperhand.findCard(card.value, card.symbol);
        if (searchCard == null) {
            searchCard = deck.findCard(card.value, card.symbol);
            deck.addCard(upperhand.topCard());
            upperhand.addCard(searchCard);
            deck.render({ immediate: true });
            userhands[userHash].hand.render({ immediate: true });
        }
        fCards.push(searchCard);
    });
    upperPlayingPile.addCard(fCards[0]);
    upperPlayingPile.render();
    playingpiles[0].addCard(fCards[1]);
    playingpiles[0].render();
    setTimeout(() => {
        upperhand.addCards(fCards);
        upperhand.render();
    }, 2000);
});

io.socket.on("cardrob", function (data) {
    console.log(data);
    let card = data.card;
    let fCard = deck.findCard(card.value, card.symbol);
    if (fCard == null) {
        fCard = upperhand.findCard(card.value, card.symbol);
    } else {
        deck.addCard(upperhand.bottomCard());
        upperhand.addCard(fCard);
        deck.render({ immediate: true });
        upperhand.render({ immediate: true });
    }
    upperhand.addCard(trumpCard.bottomCard());
    trumpCard.addCard(fCard);
    upperhand.render();
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
