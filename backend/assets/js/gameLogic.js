//const cards = require('./cards');

var containerHeight, containerWidth, deck, upperhand, lowerhand, trumpCard, upperTrickDeck, lowerTrickDeck, lowerPlayingPile, upperPlayingPile, lastTrick, userHash;

$(document).ready(function () {
    containerHeight = document.getElementById("card-table").offsetHeight;
    containerWidth = document.getElementById("card-table").offsetWidth;

    lastTrick = 1;

    //Tell the library which element to use for the table
    cards.init({ table: "#card-table", type: PINOCHLE });

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
    let cardTrump = data.trump;
    trumpCard.addCard(deck.findCard(cardTrump["value"], cardTrump["symbol"]), data.trump.id);
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
        console.log(card.id);
        console.log(fCard);
        lowerhand.addCard(fCard, card.id);
        upperhand.addCard(deck.topCard());
    }
    lowerhand.sortHand();
    lowerhand.render();
    upperhand.render();
});

io.socket.on("turn", function (data) {
    if (userHash == data.user.hashID) {
        // Finally, when you click a card in your hand, it is played
        lowerhand.click(function (card) {
            let bCard = { id: card.id, value: card.value, symbol: card.suit };
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
    console.log(data);
    let card = data.card;
    if (userHash != data.user.hashID) {
        let fCard = deck.findCard(card["value"], card["symbol"]);
        if (fCard == null) {
            // search through other hands
            fCard = upperhand.findCard(card["value"], card["symbol"]);
        }
        upperPlayingPile.addCard(fCard);
        upperPlayingPile.render({
            callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
        });
        upperhand.render();
    }
});

io.socket.on("solowin", function (data) {
    let winningTrickDeck;
    if (userHash == data.user.hashID) {
        winningTrickDeck = lowerTrickDeck;
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
    }, 2500);
    //lowerhand.render();
});

//         // setTimeout(() => {
//         //     upperPlayingPile.addCard(upperhand.randomCard());
//         //     upperPlayingPile.render({
//         //         callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
//         //     });
//         //     upperhand.render();
//         //     setTimeout(() => {
//         //         if (evaluateTrick() == 0) {
//         //             lastTrick = 0;
//         //             upperTrickDeck.addCard(upperPlayingPile.bottomCard());
//         //             upperTrickDeck.addCard(lowerPlayingPile.bottomCard());
//         //             upperTrickDeck.render();
//         //             setTimeout(() => {
//         //                 lowerPlayingPile.addCard(upperhand.randomCard());
//         //                 lowerPlayingPile.render({
//         //                     callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
//         //                 });
//         //                 upperhand.render();
//         //             }, 500);
//         //         } else {
//         //             lastTrick = 1;
//         //             lowerTrickDeck.addCard(upperPlayingPile.bottomCard());
//         //             lowerTrickDeck.addCard(lowerPlayingPile.bottomCard());
//         //             lowerTrickDeck.render();
//         //         }
//         //         lowerhand.addCard(deck.topCard());
//         //         lowerhand.sortHand();
//         //         lowerhand.render();
//         //         upperhand.addCard(deck.topCard());
//         //         upperhand.render();
//         //     }, 1000);
//         // }, 500);
//     } else {
//         upperPlayingPile.addCard(card);
//         upperPlayingPile.render({
//             callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
//         });
//         lowerhand.render();
//         // setTimeout(() => {
//         //     if (evaluateTrick() == 0) {
//         //         lowerTrickDeck.addCard(upperPlayingPile.bottomCard());
//         //         lowerTrickDeck.addCard(lowerPlayingPile.bottomCard());
//         //         lowerTrickDeck.render();
//         //         lastTrick = 1;
//         //     } else {
//         //         upperTrickDeck.addCard(upperPlayingPile.bottomCard());
//         //         upperTrickDeck.addCard(lowerPlayingPile.bottomCard());
//         //         upperTrickDeck.render();
//         //         lastTrick = 0;
//         //         setTimeout(() => {
//         //             lowerPlayingPile.addCard(upperhand.randomCard());
//         //             lowerPlayingPile.render({
//         //                 callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
//         //             });
//         //             upperhand.render();
//         //         }, 500);
//         //     }
//         //     lowerhand.addCard(deck.topCard());
//         //     lowerhand.sortHand();
//         //     lowerhand.render();
//         //     upperhand.addCard(deck.topCard());
//         //     upperhand.render();
//         // }, 1000);
//     }
// });

// function evaluateTrick() {
//     var uCard = upperPlayingPile.bottomCard();
//     var lCard = lowerPlayingPile.bottomCard();
//     if (uCard.suit == lCard.suit) {
//         if (uCard.value > lCard.value) {
//             return 0;
//         } else {
//             return 1;
//         }
//     } else {
//         if (trumpCard.topCard().suit == uCard.suit) {
//             return 0;
//         } else {
//             return 1;
//         }
//     }
// }

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
