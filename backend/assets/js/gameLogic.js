//const cards = require('./cards');

var containerHeight, containerWidth, deck, upperhand, lowerhand, trumpCard, upperTrickDeck, lowerTrickDeck, lowerPlayingPile, upperPlayingPile, lastTrick;

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
        x: containerWidth / 3,
    });
    lowerTrickDeck = new cards.Deck({
        faceUp: false,
        y: (containerHeight * 4) / 5,
        x: containerWidth / 3,
    });

    // Add playing Ground
    lowerPlayingPile = new cards.Deck({ faceUp: true });
    lowerPlayingPile.x += 50;
    upperPlayingPile = new cards.Deck({ faceUp: true });
    upperPlayingPile.x += 90;
});

//Let's deal when the game has been started
io.socket.on("start", function (data) {
    let cardTrump = data.trump;
    trumpCard.addCard(deck.findCard(cardTrump["value"], cardTrump["symbol"]));
    trumpCard.render({ callback: trumpCard.topCard().rotate(90) });
    trumpCard.topCard().moveToBack();

    let cardHand = data.hand;
    console.log(data);
    console.log(deck);
    for (let i = 0; i < cardHand.length; i++) {
        let card = cardHand[i];
        getCard(card);
    }
    lowerhand.sortHand();
    lowerhand.render();
    upperhand.render();

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    //Finally, when you click a card in your hand, it is played
    lowerhand.click(function (card) {
        if (lastTrick == 1) {
            lowerPlayingPile.addCard(card);
            lowerPlayingPile.render({
                callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
            });
            lowerhand.render();
            setTimeout(() => {
                upperPlayingPile.addCard(upperhand.randomCard());
                upperPlayingPile.render({
                    callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
                });
                upperhand.render();
                setTimeout(() => {
                    if (evaluateTrick() == 0) {
                        lastTrick = 0;
                        upperTrickDeck.addCard(upperPlayingPile.bottomCard());
                        upperTrickDeck.addCard(lowerPlayingPile.bottomCard());
                        upperTrickDeck.render();
                        setTimeout(() => {
                            lowerPlayingPile.addCard(upperhand.randomCard());
                            lowerPlayingPile.render({
                                callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
                            });
                            upperhand.render();
                        }, 500);
                    } else {
                        lastTrick = 1;
                        lowerTrickDeck.addCard(upperPlayingPile.bottomCard());
                        lowerTrickDeck.addCard(lowerPlayingPile.bottomCard());
                        lowerTrickDeck.render();
                    }
                    lowerhand.addCard(deck.topCard());
                    lowerhand.sortHand();
                    lowerhand.render();
                    upperhand.addCard(deck.topCard());
                    upperhand.render();
                }, 1000);
            }, 500);
        } else {
            upperPlayingPile.addCard(card);
            upperPlayingPile.render({
                callback: upperPlayingPile.topCard().rotate(getRandomArbitrary(-200, -160)),
            });
            lowerhand.render();
            setTimeout(() => {
                if (evaluateTrick() == 0) {
                    lowerTrickDeck.addCard(upperPlayingPile.bottomCard());
                    lowerTrickDeck.addCard(lowerPlayingPile.bottomCard());
                    lowerTrickDeck.render();
                    lastTrick = 1;
                } else {
                    upperTrickDeck.addCard(upperPlayingPile.bottomCard());
                    upperTrickDeck.addCard(lowerPlayingPile.bottomCard());
                    upperTrickDeck.render();
                    lastTrick = 0;
                    setTimeout(() => {
                        lowerPlayingPile.addCard(upperhand.randomCard());
                        lowerPlayingPile.render({
                            callback: lowerPlayingPile.topCard().rotate(getRandomArbitrary(-20, 20)),
                        });
                        upperhand.render();
                    }, 500);
                }
                lowerhand.addCard(deck.topCard());
                lowerhand.sortHand();
                lowerhand.render();
                upperhand.addCard(deck.topCard());
                upperhand.render();
            }, 1000);
        }
    });

    function evaluateTrick() {
        var uCard = upperPlayingPile.bottomCard();
        var lCard = lowerPlayingPile.bottomCard();
        if (uCard.suit == lCard.suit) {
            if (uCard.value > lCard.value) {
                return 0;
            } else {
                return 1;
            }
        } else {
            if (trumpCard.topCard().suit == uCard.suit) {
                return 0;
            } else {
                return 1;
            }
        }
    }
});

function getCard(card) {
    let fCard = deck.findCard(card["value"], card["symbol"]);
    if (fCard == null) {
        // search through other hands
        fCard = upperhand.findCard(card["value"], card["symbol"]);
        upperhand.addCard(deck.topCard());
    }
    lowerhand.addCard(fCard);
    upperhand.addCard(deck.topCard());
}

//Tell the library which element to use for the table
