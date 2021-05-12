var cards = (function () {
    //The global options
    var opt = {
        cardSize: {
            width: 69,
            height: 94,
            padding: 27,
        },
        animationSpeed: 500,
        table: "body",
        cardback: "red",
        acesHigh: false,
        cardsUrl: "/images/cards.png",
        blackJoker: false,
        redJoker: false,
        type: STANDARD,
        loop: 1,
    };
    var zIndexCounter = 50;
    var zIndexNegCounter = 50;
    var all = []; //All the cards created.
    var start = 1;
    var end = start + 12;

    function mouseEvent(ev) {
        var card = $(this).data("gamecard");
        if (card.container) {
            var handler = card.container._click;
            if (handler) {
                handler.func.call(handler.context || window, card, ev);
            }
        }
    }

    function init(options) {
        if (options) {
            for (var i in options) {
                if (opt.hasOwnProperty(i)) {
                    opt[i] = options[i];
                }
            }
        }
        switch (opt.type) {
            case STANDARD:
                opt.acesHigh = false;
                start = opt.acesHigh ? 2 : 1;
                end = start + 12;
                break;
            case PINOCHLE:
                all.push(new Card(0, 7, opt.table));
                all.push(new Card(1, 7, opt.table));
                all.push(new Card(2, 7, opt.table));
                all.push(new Card(3, 7, opt.table));
                start = 10;
                end = start + 4;
                opt.loop = 2;
                break;
        }

        opt.table = $(opt.table)[0];
        if ($(opt.table).css("position") == "static") {
            $(opt.table).css("position", "relative");
        }
        for (let l = 0; l < opt.loop; l++)
            for (var i = start; i <= end; i++) {
                for (let j = 0; j < 4; j++) {
                    all.push(new Card(j, i, opt.table));
                }
            }
        if (opt.blackJoker) {
            all.push(new Card("bj", 0, opt.table));
        }
        if (opt.redJoker) {
            all.push(new Card("rj", 0, opt.table));
        }

        $(".gamecard").click(mouseEvent);
        //shuffle(all);
    }

    function shuffle(deck) {
        //Fisher yates shuffle
        var i = deck.length;
        if (i == 0) return;
        while (--i) {
            var j = Math.floor(Math.random() * (i + 1));
            var tempi = deck[i];
            var tempj = deck[j];
            deck[i] = tempj;
            deck[j] = tempi;
        }
    }

    function Card(suit, rank, table) {
        this.init(suit, rank, table);
    }

    Card.prototype = {
        init: function (suit, rank, table) {
            this.suit = suit;
            this.rank = rank;
            this.faceUp = false;
            this.el = $("<div/>")
                .css({
                    width: opt.cardSize.width,
                    height: opt.cardSize.height,
                    "background-image": "url(" + opt.cardsUrl + ")",
                    position: "absolute",
                    cursor: "pointer",
                })
                .addClass("gamecard")
                .data("gamecard", this)
                .appendTo($(table));
            // define card values for gaigel
            switch (rank) {
                case 7:
                    this.value = 0;
                    break;
                case 10:
                    this.value = 10;
                    break;
                case 11:
                    this.value = 2;
                    break;
                case 12:
                    this.value = 3;
                    break;
                case 13:
                    this.value = 4;
                    break;
                case 14:
                    this.value = 11;
                    break;
                default:
                    this.value = undefined;
                    break;
            }
            this.showCard();
            this.moveToFront();
            this.moveToBack();
        },

        // toString: function () {
        //   return this.name;
        // },

        moveTo: function (x, y, speed, callback) {
            var props = {
                top: y - opt.cardSize.height / 2,
                left: x - opt.cardSize.width / 2,
            };
            $(this.el).animate(props, speed || opt.animationSpeed, callback);
        },

        rotate: function (angle) {
            $(this.el)
                .css("-webkit-transform", "rotate(" + angle + "deg)")
                .css("-moz-transform", "rotate(" + angle + "deg)")
                .css("-ms-transform", "rotate(" + angle + "deg)")
                .css("transform", "rotate(" + angle + "deg) scale(1.5)")
                .css("-o-transform", "rotate(" + angle + "deg)");
        },

        showCard: function () {
            var offsets = {
                c: 0,
                d: 1,
                h: 2,
                s: 3,
                rj: 2,
                bj: 3,
            };
            var xpos, ypos;
            var rank = this.rank;
            if (rank == 14) {
                rank = 1; //Aces high must work as well.
            }
            xpos = -rank * opt.cardSize.width;
            ypos = -this.suit * opt.cardSize.height;
            //this.rotate(0);
            $(this.el).css("background-position", xpos + "px " + ypos + "px");
        },

        hideCard: function (position) {
            var y = opt.cardback == "red" ? 0 * opt.cardSize.height : -1 * opt.cardSize.height;
            $(this.el).css("background-position", "0px " + y + "px");
            this.rotate(0);
        },

        moveToFront: function () {
            $(this.el).css("z-index", zIndexCounter++);
        },

        moveToBack: function () {
            $(this.el).css("z-index", zIndexNegCounter--);
        },
    };

    function Container() {}

    Container.prototype = new Array();
    Container.prototype.extend = function (obj) {
        for (var prop in obj) {
            this[prop] = obj[prop];
        }
    };
    Container.prototype.extend({
        addCard: function (card) {
            this.addCards([card]);
        },

        addCards: function (cards) {
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                if (card.container) {
                    card.container.removeCard(card);
                }
                this.push(card);
                card.container = this;
            }
        },

        removeCard: function (card) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] == card) {
                    this.splice(i, 1);
                    return true;
                }
            }
            return false;
        },

        init: function (options) {
            options = options || {};
            this.x = options.x || $(opt.table).width() / 2;
            this.y = options.y || $(opt.table).height() / 2;
            this.faceUp = options.faceUp;
        },

        click: function (func, context) {
            this._click = {
                func: func,
                context: context,
            };
        },

        mousedown: function (func, context) {
            this._mousedown = {
                func: func,
                context: context,
            };
        },

        mouseup: function (func, context) {
            this._mouseup = {
                func: func,
                context: context,
            };
        },

        render: function (options) {
            options = options || {};
            var speed = options.speed || opt.animationSpeed;
            this.calcPosition(options);
            for (var i = 0; i < this.length; i++) {
                var card = this[i];
                zIndexCounter++;
                card.moveToFront();
                var top = parseInt($(card.el).css("top"));
                var left = parseInt($(card.el).css("left"));
                if (top != card.targetTop || left != card.targetLeft) {
                    var props = {
                        top: card.targetTop,
                        left: card.targetLeft,
                        queue: false,
                    };
                    if (options.immediate) {
                        $(card.el).css(props);
                    } else {
                        $(card.el).animate(props, speed);
                    }
                }
            }
            var me = this;
            var flip = function () {
                for (var i = 0; i < me.length; i++) {
                    if (me.faceUp) {
                        me[i].showCard();
                    } else {
                        me[i].hideCard();
                    }
                }
            };

            if (options.immediate) {
                flip();
            } else {
                setTimeout(flip, speed / 2);
            }

            if (options.callback) {
                setTimeout(options.callback, speed);
            }
        },

        topCard: function () {
            return this[this.length - 1];
        },

        bottomCard: function () {
            return this[0];
        },

        findCard: function (value, suit) {
            for (let i = 0; i < this.length; i++) {
                let card = this[i];
                if (value == card.value && suit == card.suit) {
                    return card;
                }
            }
            return null;
        },

        toString: function () {
            return "Container";
        },
    });

    function Deck(options) {
        this.init(options);
    }

    Deck.prototype = new Container();
    Deck.prototype.extend({
        calcPosition: function (options) {
            options = options || {};
            var left = Math.round(this.x - opt.cardSize.width / 2, 0);
            var top = Math.round(this.y - opt.cardSize.height / 2, 0);
            var condenseCount = 6;
            for (var i = 0; i < this.length; i++) {
                if (i > 0 && i % condenseCount == 0) {
                    top -= 1;
                    left -= 1;
                }
                this[i].targetTop = top;
                this[i].targetLeft = left;
            }
        },

        toString: function () {
            return "Deck";
        },

        deal: function (count, hands, speed, callback) {
            var me = this;
            var i = 0;
            var totalCount = count * hands.length;

            function dealOne() {
                if (me.length == 0 || i == totalCount) {
                    if (callback) {
                        callback();
                    }
                    return;
                }
                hands[i % hands.length].addCard(me.topCard());
                hands[i % hands.length].render({
                    callback: dealOne,
                    speed: speed,
                });
                i++;
            }
            dealOne();
        },
    });

    function Hand(options) {
        this.init(options);
    }
    Hand.prototype = new Container();
    Hand.prototype.extend({
        calcPosition: function (options) {
            options = options || {};
            var width = opt.cardSize.width + (this.length - 1) * opt.cardSize.padding;
            var left = Math.round(this.x - width / 2);
            var top = Math.round(this.y - opt.cardSize.height / 2, 0);
            for (var i = 0; i < this.length; i++) {
                this[i].targetTop = top;
                this[i].targetLeft = left + i * opt.cardSize.padding;
            }
        },

        randomCard: function () {
            return this[Math.floor(Math.random() * this.length)];
        },

        sortHand: function () {
            // TODO: rework
            return this.sort((a, b) => {
                if (a.value < b.value) return -1;
                if (a.value > b.value) return 1;
                return 0;
            });
        },

        toString: function () {
            return "Hand";
        },
    });

    function Pile(options) {
        this.init(options);
    }

    Pile.prototype = new Container();
    Pile.prototype.extend({
        calcPosition: function (options) {
            options = options || {};
        },

        toString: function () {
            return "Pile";
        },

        deal: function (count, hands) {
            if (!this.dealCounter) {
                this.dealCounter = count * hands.length;
            }
        },
    });

    return {
        init: init,
        all: all,
        options: opt,
        SIZE: opt.cardSize,
        Card: Card,
        Container: Container,
        Deck: Deck,
        Hand: Hand,
        Pile: Pile,
        shuffle: shuffle,
    };
})();

if (typeof module !== "undefined") {
    module.exports = cards;
}
