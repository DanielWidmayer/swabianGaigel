/**
 * GameControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ChatController = require("./ChatController");

module.exports = {
    startGame: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        } else {
            try {
                //let room = await Room.findOne({id: req.session.roomid}).populate('players');
                let room = await Room.findOne({ id: req.session.roomid });
                if (!room) return res.badRequest(new Error("This room could not be found."));

                // update room status, reject if already ingame
                if (room.status == "game") throw new Error("Game is already running!");
                await Room.updateOne({ id: room.id }).set({ status: "game" });

                // create carddeck and choose trump
                let carddeck = await Card.find();
                let cards = [];

                carddeck.forEach((el) => {
                    cards.push(el.id);
                });
                await Room.addToCollection(room.id, "deck", cards);

                let trump_card = Card.getRandomCard(carddeck);
                await Room.removeFromCollection(room.id, "deck").members(trump_card.id);

                /* create order-object
                let order = [];
                for (el of room.players) {
                    order.push({uHASH: el.hashID, uNAME: el.name, uCARDS: 5, uSCORE: 0});
                }
                // shuffle for random order
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [order[i], order[j]] = [order[j], order[i]];
                }
                // save order
                await Room.updateOne({id: room.id}).set({order: order});
                */
                let players = room.jsonplayers;
                let j, m;
                for (i = players.length - 1; i > 0; i--) {
                    j = Math.floor(Math.random() * (i + 1));
                    m = players[i];
                    players[i] = players[j];
                    players[j] = m;
                }
                await Room.updateOne({ id: room.id }).set({ trump: trump_card.id, jsonplayers: players, stack: [] });

                // deal cards to players, start game
                /*for (el of room.players) {
                    await Card.dealCard(5, el.id, room.id);
                    let p_temp = await User.findOne({id: el.id}).populate('hand');
                    // socket start event
                    sails.sockets.broadcast(el.socket, 'start', {hand: p_temp.hand, trump: trump_card, order: order, active: room.activePlayer});
                }*/
                let user = await User.getNameAndHash(players.map((el) => el.id));
                for (el of players) {
                    sails.log("deal 5 cards to player " + el.playerID);
                    let hand = await Card.dealCard(5, el.playerID, room.id);
                    let pl = await User.findOne({ id: el.playerID });
                    sails.sockets.broadcast(pl.socket, "start", { hand: hand, trump: trump_card, users: user });
                }

                // broadcast turn event
                user = await User.getNameAndHash(players[0].playerID);
                ChatController.turnmsg(user.name, room.hashID);
                sails.log("its " + user.name + " turn");
                sails.sockets.broadcast(room.hashID, "turn", { user: user });

                return res.ok();
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    playCard: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            let room, user, card, c_index, acPl;

            sails.log("sanity checking ...");
            // check if room exists
            //if (req.session.roomid) room = await Room.findOne({id: req.session.roomid}).populate('players');
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid });
            else throw new Error("Authentication Error!");
            if (!room) throw new Error("This room could not be found.");
            acPl = room.activePlayer;

            // check if user exists
            //if (req.session.userid) user = await User.findOne({id: req.session.userid}).populate('hand');
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw new Error("Authentication Error!");
            if (!user) throw new Error("This user could not be found.");

            // check if user is in room
            /*room.players.forEach((el) => {
                if (el.id == user.id) pass = true;
            });
            if (!pass) throw(new Error('User is not in this room.'));
            pass = false;*/
            if (!room.jsonplayers.find((el) => el.playerID == user.id)) throw new Error("User is not in this room.");

            // check if user is active player
            //if (user.hashID != room.order[room.activePlayer].uHASH) throw(new Error('This is not your turn, cheater!'));
            if (room.jsonplayers[acPl].playerID != user.id) throw new Error("This is not your turn, cheater!");

            // check if user owns card
            card = req.body.card;
            sails.log(card);
            c_index = room.jsonplayers[acPl].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw new Error("You do not own this card, cheater!");

            sails.log("all good!");

            // add card to stack and remove from hand
            let temp_stack = room.stack;
            let temp_players = room.jsonplayers;
            temp_players[acPl].hand.splice(c_index, 1);
            temp_stack.push({ playerID: user.id, card: card });

            // socket event cardplayed
            user = await User.getNameAndHash(user.id);
            sails.log("cardplayed event triggered");
            sails.sockets.broadcast(room.hashID, "cardplayed", { user: user, card: card }, req);

            // check for full stack
            if (temp_stack.length >= temp_players.length) {
                // eval win and deal
                sails.log("Full stack, trigger roundwin event");
                let winner = evalStack(temp_stack, room.trump.symbol);

                if (temp_players.length <= 3) {
                    temp_players[winner].score += temp_stack[winner].card.value;
                    user = await User.getNameAndHash(temp_players[winner].playerID);
                    user.score = temp_players[winner].score;
                    sails.sockets.broadcast(room.hashID, "solowin", { user: user });
                    ChatController.turnmsg(user.name, room.hashID);
                    acPl = winner;
                } else {
                    let p_win = [];
                    if (winner == 0 || winner == 2) p_win = [0, 2];
                    else p_win = [1, 3];

                    for (el of p_win) {
                        temp_players[el].score += temp_stack[winner].card.value;
                    }

                    user = await User.getNameAndHash([temp_players[p_win[0]].playerID, temp_players[p_win[0]].playerID]);
                    user[0].score = temp_players[p_win[0]].score;
                    user[1].score = user[0].score;
                    sails.sockets.broadcast(room.hashID, "teamwin", { users: user });

                    if (p_win[0] == acPl) acPl = p_win[1];
                    else acPl = p_win[0];
                }

                await Room.updateOne({ id: room.id }).set({ jsonplayers: temp_players });
                for (el of temp_players) {
                    user = await User.findOne({ id: el.playerID });
                    let card = await Card.dealCard(1, el.playerID, room.id);
                    if (card) {
                        sails.sockets.broadcast(user.socket, "dealcard", { card: card });
                    } else {
                        sails.log("cannot deal card to " + user.name + ". Empty Deck!");
                    }
                }

                // reset stack
                temp_stack = [];
            } else {
                // next player turn
                if (acPl < room.jsonplayers.length - 1) acPl += 1;
                else acPl = 0;
            }

            // update activePlayer and broadcast next turn
            user = await User.getNameAndHash(temp_players[acPl].playerID);
            sails.log("next player: " + user.name);
            sails.sockets.broadcast(room.hashID, "turn", { user: user });

            // save changes
            sails.log("save changes!");
            await Room.updateOne({ id: room.id }).set({ stack: temp_stack, activePlayer: acPl });

            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    pauseGame: async (req, res) => {},
};

function evalStack(stack, trump) {
    let occ = [];
    let v_h = -1;
    let i_t = 0;

    // get occurrences of trump symbol
    for (i = 0; i < stack.length; i++) {
        if (stack[i].card.symbol == trump) occ.push(i);
    }

    // all trump symbol or no trump symbol
    if (occ.length == stack.length || occ.length == 0) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i].card.value > v_h) {
                i_t = i;
                v_h = stack[i].card.value;
            }
        }
        return i_t;
    } else {
        for (el of occ) {
            if (stack[el].card.value > v_h) {
                i_t = el;
                v_h = stack[el].card.value;
            }
        }
        return i_t;
    }
}
