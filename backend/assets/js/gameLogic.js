//const cards = require('./cards');

var containerHeight, containerWidth, deck, upperhand, lowerhand, trumpCard, upperTrickDeck, lowerTrickDeck, lowerPlayingPile, upperPlayingPile, userHash, ownScore;

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

    //Now lets create a couple of hands, one face down, one face up.
    upperhand = new cards.Hand({ faceUp: false, y: containerHeight / 5 });
    lowerhand = new cards.Hand({ faceUp: true, y: (containerHeight * 4) / 5 });

    // Adds a trump Card
    trumpCard = new cards.Deck({ faceUp: true });
    trumpCard.x -= containerWidth / 5 - 50;

    // Create Trick Decks
    upperTrickDeck = new cards.Deck({
        faceUp: false,
        y: containerHeight / 5,
        x: containerWidth / 5,
    });
    lowerTrickDeck = new cards.Deck({
        faceUp: false,
        y: (containerHeight * 4) / 5,
        x: containerWidth / 5,
    });

    // Add playing Ground
    lowerPlayingPile = new cards.Deck({ faceUp: true });
    lowerPlayingPile.x += 50;
    upperPlayingPile = new cards.Deck({ faceUp: true });
    upperPlayingPile.x += 90;

    userHash = getCookie("userhash");
});

//Let's deal when the game has been started
io.socket.on("start", function (data) {
    // userHash = data.user[]
    console.log(data);
    $("#bstart").hide();
    ownScore = -1;
    let cardTrump = data.trump;
    trumpCard.addCard(deck.findCard(cardTrump["value"], cardTrump["symbol"]), cardTrump.id);
    trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
    trumpCard.topCard().moveToBack();

    let cardHand = data.hand;
    for (let i = 0; i < cardHand.length; i++) {
        let card = cardHand[i];
        let fCard = deck.findCard(card["value"], card["symbol"]);
        if (fCard == null) {
            // search through other hands
            fCard = upperhand.findCard(card["value"], card["symbol"]);
            upperhand.addCard(deck.topCard());
        }
        lowerhand.addCard(fCard, card.id);
        upperhand.addCard(deck.topCard());
    }
    lowerhand.sortHand();
    lowerhand.render();
    upperhand.render();
});

io.socket.on("ready", function (data) {
    // <--JB- ich hab das "ready" event durch ein "userevent" ersetzt da es basically dasselbe war, bei "userevent" gebe ich jetzt immer mit:
    console.log(data); // [ {hashID: int, name: string, ready: bool, team: int}, ... ]
    let users = data.users; // userevent wird aufgerufen, wenn ein Spieler ready drückt, dem Room beitritt oder den Room verlässt
    for (let i = 0; i < users.length; i++) {
        if (users[i].ready) {
            // TODO
        }
    }
});

io.socket.on("turn", function (data) {
    if (userHash == data.user.hashID) {
        console.log("Its your turn.");
        // Finally, when you click a card in your hand, it is played
        lowerhand.click(function (card) {
            let bCard = { id: card.id, value: card.value, symbol: card.symbol };
            console.log(card);
            console.log(bCard);

            io.socket.post("/playCard", { card: bCard }, function (res, jres) {
                if (jres.statusCode != 200) {
                    console.log(jres);
                } else {
                    console.log(res);
                }
            });
            lowerPlayingPile.addCard(card, card.id);
            lowerPlayingPile.render({
                callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
            });
            lowerhand.render();
            lowerhand._click = null;
        });
    } else {
        console.log("Its " + data.user.name + "'s turn.");
    }
});

io.socket.on("cardplayed", function (data) {
    let card = data.card;
    if (userHash != data.user.hashID) {
        let fCard = deck.findCard(card["value"], card["symbol"]);
        if (fCard == null) {
            // search through other hands
            fCard = upperhand.findCard(card["value"], card["symbol"]);
        } else {
            deck.addCard(upperhand.topCard());
            upperhand.addCard(fCard);
            upperhand.render({ immediate: true });
            deck.render({ immediate: true });
        }
        upperPlayingPile.addCard(fCard);
        upperPlayingPile.render({
            callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
        });
    }
});

io.socket.on("solowin", function (data) {
    let winningTrickDeck;
    if (userHash == data.user.hashID) {
        winningTrickDeck = lowerTrickDeck;
        ownScore = data.user.score;
    } else if (userHash != data.user.hashID) {
        winningTrickDeck = upperTrickDeck;
    }

    setTimeout(() => {
        winningTrickDeck.addCard(upperPlayingPile.bottomCard());
        winningTrickDeck.addCard(lowerPlayingPile.bottomCard());
        winningTrickDeck.render();
    }, 2500);
    console.log(data.user.name + " now has a score of: " + data.user.score);
});

io.socket.on("dealcard", function (data) {
    let card = data.card[0];
    console.log(data.card);
    let fCard = deck.findCard(card["value"], card["symbol"]);
    if (fCard == null) {
        // search through other hands
        fCard = upperhand.findCard(card["value"], card["symbol"]);
        upperhand.addCard(deck.topCard());
    }
    setTimeout(() => {
        lowerhand.addCard(fCard, card.id);
        lowerhand.sortHand();
        lowerhand.render();
        upperhand.addCard(deck.topCard());
        upperhand.render();
        if (lowerhand.getPair().length > 0 && ownScore != -1) {
            console.log("Has Pair & Can Meld!");
            if (ownScore) $("#bmeld").prop("disabled", false);
        } else {
            $("#bmeld").prop("disabled", true);
        }
        if (lowerhand.getTrumpSeven(trumpCard.bottomCard().symbol) != null && trumpCard.topCard().value != 7) {
            console.log("Has Seven & Can Rob & Seven hasn't been robbed already!");
            $("#bsteal").prop("disabled", false);
        } else {
            $("#bsteal").prop("disabled", true);
        }
    }, 2500);
});

io.socket.on("paircalled", function (data) {
    console.log(data);
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
