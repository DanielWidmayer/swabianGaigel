/**
 * GameControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ChatController = require("./ChatController");

const error = sails.helpers.errors;

module.exports = {
    startGame: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        } else {
            try {
                let room,
                    user,
                    players,
                    carddeck,
                    cards = [],
                    trump_card;
                // check authentication
                if (req.session.roomid && req.session.userid) {
                    room = await Room.findOne({ id: req.session.roomid });
                    user = await User.findOne({ id: req.session.userid });
                } else throw error(101, "Invalid Session!");
                if (!room) throw error(102, "This Room could not be found!");
                if (!user) throw error(101, "This User could not be found!");

                // check if user is in room and set ready
                user = room.jsonplayers.findIndex((pl) => pl.playerID == user.id);
                if (user < 0) throw error(101, "User is not in this room!");
                if (room.jsonplayers[user].ready == false) room.jsonplayers[user].ready = true;
                else room.jsonplayers[user].ready = false;

                // wait till all players are ready
                let rps = room.jsonplayers.reduce((cb, pv) => {
                    if (pv.ready) return cb + 1;
                    else return cb;
                }, 0);
                if (rps < room.jsonplayers.length) {
                    await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });
                    let pids = [];
                    for (pl of room.jsonplayers) pids.push(el.playerID);
                    players = await User.getNameAndHash(pids);
                    for (pl of players) {
                        pl.ready = room.jsonplayers[room.jsonplayers.findIndex((i) => i.playerID == pl.id)].ready;
                    }
                    sails.sockets.broadcast(room.hashID, "ready", { users: players }, req);
                    return res.ok({ ready: room.jsonplayers[user].ready });
                }

                // update room status, reject if already ingame
                if (room.status == "game") throw error(104, "Game is already running!");
                await Room.updateOne({ id: room.id }).set({ status: "game" });

                // create carddeck and choose trump
                carddeck = await Card.find();

                carddeck.forEach((el) => {
                    cards.push(el.id);
                });
                await Room.addToCollection(room.id, "deck", cards);

                trump_card = Card.getRandomCard(carddeck);
                await Room.removeFromCollection(room.id, "deck").members(trump_card.id);

                players = room.jsonplayers;
                let j, m;
                for (i = players.length - 1; i > 0; i--) {
                    j = Math.floor(Math.random() * (i + 1));
                    m = players[i];
                    players[i] = players[j];
                    players[j] = m;
                }
                await Room.updateOne({ id: room.id }).set({ trump: trump_card.id, jsonplayers: players, stack: [] });

                // deal cards to players, start game
                user = await User.getNameAndHash(players.map((el) => el.id));
                let hand, pl;
                for (el of players) {
                    sails.log("deal 5 cards to player " + el.playerID);
                    hand = await Card.dealCard(5, el.playerID, room.id);
                    pl = await User.findOne({ id: el.playerID });
                    sails.sockets.broadcast(pl.socket, "start", { hand: hand, trump: trump_card, users: user });
                }

                // broadcast turn event
                user = await User.getNameAndHash(players[0].playerID);
                ChatController.turnmsg(user.name, room.hashID);
                sails.log("its " + user.name + " turn");
                sails.sockets.broadcast(room.hashID, "turn", { user: user });

                return res.ok();
            } catch (err) {
                if (err.code) return res.badRequest(err);
                else return res.serverError(err);
            }
        }
    },

    playCard: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, card, c_index, acPl;

            sails.log("sanity checking ...");
            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");

            acPl = room.activePlayer;

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(room);
            // check if user is in room
            if (!room.jsonplayers.find((el) => el.playerID == user.id)) throw error(101, "User is not in this room!");

            // check if user is active player
            if (room.jsonplayers[acPl].playerID != user.id) throw error(104, "This is not your turn, cheater!");

            // check if user owns card
            card = req.body.card;
            c_index = room.jsonplayers[acPl].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw error(104, "You do not own this card, cheater!");

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
                winner = temp_players.findIndex((el) => el.playerID == winner);

                if (temp_players.length <= 3) {
                    for (let i = 0; i < temp_stack.length; i++) {
                        // DWM - gesamten Stich als Score hochzählen
                        temp_players[winner].score += temp_stack[i].card.value;
                    }
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
                        for (let i = 0; i < temp_stack.length; i++) {
                            // DWM - gesamten Stich als Score hochzählen
                            temp_players[el].score += temp_stack[i].card.value;
                        }
                    }

                    user = await User.getNameAndHash([temp_players[p_win[0]].playerID, temp_players[p_win[0]].playerID]);
                    user[0].score = temp_players[p_win[0]].score;
                    user[1].score = user[0].score;
                    sails.sockets.broadcast(room.hashID, "teamwin", { users: user });

                    if (p_win[0] == acPl) acPl = p_win[1];
                    else acPl = p_win[0];
                }
                sails.log(user.name + " won!");

                await Room.updateOne({ id: room.id }).set({ jsonplayers: temp_players });
                for (el of temp_players) {
                    user = await User.findOne({ id: el.playerID });
                    let card = await Card.dealCard(1, el.playerID, room.id);
                    if (card.length) {
                        sails.sockets.broadcast(user.socket, "dealcard", { card: card }); // willst du nen Array an Karten oder nur eine einzelne? kannst ja im Frontend bei nem Array immer schauen wie lang er is, is glaub besser
                    } else {
                        // TODO - card deck is empty, special handle?
                        sails.log("cannot deal card to " + user.name + ". Empty Deck!");
                    }
                }

                // TODO - check for empty carddeck and hands and end game

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
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    meldPair: async (req, res) => {
        // jajajajaajajajajaajjajaajjaja, immer diese kack Zusatzfunktionen ...
        // TODO:
        // check if cards are a meldable pair
        // socket event pairmelded
        // Add Score to player
        // eval Game Win Condition
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, cards, c_index, acPl;

            sails.log("sanity checking ...");
            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");

            acPl = room.activePlayer;
            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            // check if user is in room
            if (!room.jsonplayers.find((el) => el.playerID == user.id)) throw error(101, "User is not in this room!");

            // check if user owns both cards
            cards = req.body.cards;
            cards.forEach((card) => {
                c_index = room.jsonplayers[acPl].hand.findIndex((el) => el == card.id);
                if (c_index < 0) throw error(104, "You do not own this card, cheater!");
            });

            // TODO: check if cards are a meldable pair

            sails.log("all good!");

            sails.sockets.broadcast(user.socket, "pairmelded", { user: user, cards: cards });

            // TODO: Add Score to player (20 for normal pair 40 for trump pair)
            // TODO: eval Game Win Condition
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    robTrump: async (req, res) => {
        // noch ne Zusatzfunktion, immerhin mit geilem Namen :D - evtl müssen wir hier schauen, dass die nicht zweimal parallel in einem Raum aufgerufen werden kann
        // TODO:
        // check if card is trump seven
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, card, c_index, acPl;

            sails.log("sanity checking ...");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid });
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");
            acPl = room.activePlayer;
            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            // check if user is in room
            if (!room.jsonplayers.find((el) => el.playerID == user.id)) throw error(101, "User is not in this room!");

            // check if user owns card
            card = req.body.card;
            c_index = room.jsonplayers[acPl].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw error(104, "You do not own this card, cheater!");

            // TODO: check if card is trump seven

            sails.sockets.broadcast(user.socket, "cardrob", { user: user, card: card });
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
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
        sails.log(stack);
        for (i = 0; i < stack.length; i++) {
            if (stack[0].card.symbol == stack[i].card.symbol) {
                if (stack[i].card.value > v_h) {
                    i_t = i;
                    v_h = stack[i].card.value;
                }
            }
        }
        sails.log(i_t);
        return stack[i_t].playerID;
    } else {
        for (el of occ) {
            if (stack[el].card.value > v_h) {
                i_t = el;
                v_h = stack[el].card.value;
            }
        }
        return stack[i_t].playerID;
    }
}
