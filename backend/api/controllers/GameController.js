/**
 * GameControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ChatController = require("./ChatController");

const error = sails.helpers.errors;

module.exports = {
    // TODO - Implementierung im frontend
    randomOrder: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let room,
                user,
                players = [],
                temp = [];

            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user is in room
            if (room.jsonplayers.findIndex((pl) => pl.playerID == user.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin
            if (user.id != room.admin.id) throw error(102, "You are not allowed to do this!");

            // shuffle
            temp = room.jsonplayers;
            let j, m;
            for (i = temp.length - 1; i > 0; i--) {
                j = Math.floor(Math.random() * (i + 1));
                m = temp[i];
                temp[i] = temp[j];
                temp[j] = m;
            }

            if (temp.length == 4) {
                for (i = 0; i < temp.length; i++) {
                    temp[i].ready = false;
                    temp[i].team = (i % 2) + 1;
                }
            } else if (temp.length == 6) {
                for (i = 0; i < temp.length; i++) {
                    temp[i].ready = false;
                    temp[i].team = (i % 3) + 1;
                }
            }

            room.jsonplayers = temp;
            for (pl of room.jsonplayers) {
                pl.ready = false;
                players.push(await User.getNameAndHash(pl.playerID));
                players[players.length - 1].ready = false;
                players[players.length - 1].team = pl.team;
            }

            // save changes
            await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

            // userevent
            sails.sockets.broadcast(room.hashID, "userevent", { users: players });

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    // TODO - Implementierung im frontend
    switchTeam: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let user, room;
            let teams = [0, 0, 0, 0];
            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user is in room
            let p_index = room.jsonplayers.findIndex((pl) => pl.playerID == user.id);
            if (p_index < 0) throw error(101, "User is not in this room!");

            // check team parameter
            let t_team = req.body.team;
            if (t_team < 0 || t_team > 3) throw error(104, "This Team does not exist!");

            if (room.jsonplayers.length < 4) throw error(104, "No Teams allowed for less than 4 players!");

            for (pl of room.jsonplayers) {
                teams[pl.team] += 1;
            }
            room.jsonplayers[p_index].ready = false;
            if (room.jsonplayers[p_index].team == t_team) room.jsonplayers[p_index].team = 0;
            else if (teams[t_team] >= 2) throw error(104, "This Teams is already full!");
            else room.jsonplayers[p_index].team = t_team;

            await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

            let players = [];
            for (el of room.jsonplayers) {
                players.push(await User.getNameAndHash(el.playerID));
                players[players.length - 1].ready = el.ready;
                players[players.length - 1].team = el.team;
            }

            sails.sockets.broadcast(room.hashID, "userevent", { users: players }, req);

            return res.status(200).json({ team: room.jsonplayers[p_index].team });
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    startGame: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        } else {
            try {
                let room,
                    user,
                    players = [],
                    carddeck,
                    cards,
                    trump_card;
                let el, pl;
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
                    for (pl of room.jsonplayers) {
                        players.push(await User.getNameAndHash(pl.playerID));
                        players[players.length - 1].ready = pl.ready;
                        players[players.length - 1].team = pl.team;
                    }

                    sails.sockets.broadcast(room.hashID, "userevent", { users: players });
                    return res.status(200).json({ ready: room.jsonplayers[user].ready });
                }
                if (room.jsonplayers.length == 5 || room.jsonplayers.length > 6) throw error(104, `Can't start a game with ${room.jsonplayers.length} players!`);

                // update room status, reject if already ingame
                if (room.status == "game") throw error(104, "Game is already running!");
                await Room.updateOne({ id: room.id }).set({ status: "game" });

                // create carddeck and choose trump
                carddeck = await Card.find();

                cards = carddeck.map((el) => el.id);
                await Room.addToCollection(room.id, "deck", cards);

                trump_card = Card.getRandomCard(carddeck);
                await Room.removeFromCollection(room.id, "deck").members(trump_card.id);

                // player order for teams
                if (room.jsonplayers.length >= 4) {
                    let teams = [];
                    for (i = 0; i <= room.jsonplayers.length / 2; i++) {
                        teams[i] = room.jsonplayers.filter((el) => el.team == i);
                    }
                    // assign free players to team
                    for (el of teams[0]) {
                        for (x = 1; x < teams.length; x++) {
                            if (teams[x].length < 2) {
                                el.team = x;
                                teams[x].push(el);
                                break;
                            }
                        }
                    }
                    teams.shift();
                    let ts,
                        ps = 0;
                    for (i = 0; i < room.jsonplayers.length; i++) {
                        ts = i % (room.jsonplayers.length / 2);
                        room.jsonplayers[i] = teams[ts][ps];
                        if (i >= room.jsonplayers.length / 2) ps = 1;
                    }
                }

                await Room.updateOne({ id: room.id }).set({ trump: trump_card.id, jsonplayers: room.jsonplayers });

                // deal cards to players, start game
                let hand;
                for (pl of room.jsonplayers) {
                    players.push(await User.getNameAndHash(pl.playerID));
                    players[players.length - 1].team = pl.team;
                }
                for (el of room.jsonplayers) {
                    sails.log("deal 5 cards to player " + el.playerID);
                    hand = await Card.dealCard(5, el.playerID, room.id);
                    pl = await User.findOne({ id: el.playerID });
                    sails.sockets.broadcast(pl.socket, "start", { hand: hand, trump: trump_card, users: players });
                }

                // broadcast turn event
                user = await User.getNameAndHash(room.jsonplayers[0].playerID);
                ChatController.turnmsg(user, room.hashID);
                sails.log("its " + user.name + " turn");
                sails.sockets.broadcast(room.hashID, "turn", { user: user });

                return res.ok();
            } catch (err) {
                sails.log.error(err);
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
            let el;
            sails.log("playCard - sanity checking ...");
            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");

            acPl = room.activePlayer;
            let first_type = room.startoff;

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            // check if user is in room
            if (!room.jsonplayers.find((el) => el.playerID == user.id)) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can not do that right now!");

            // check if user is active player
            if (room.jsonplayers[acPl].playerID != user.id) throw error(104, "This is not your turn, cheater!");

            card = req.body.card;
            sails.log.info(card);
            // check if user owns card
            c_index = room.jsonplayers[acPl].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw error(104, "You do not own this card, cheater!");

            // check for first round
            if (first_type.length <= 0) {
                if (card.value == 11) first_type = "Second Ace";
                else if (card.symbol == room.trump.symbol) {
                    let hand = await Card.find({ id: room.jsonplayers[acPl].hand });
                    if (hand.find((el) => el.symbol != room.trump.symbol)) throw error(104, "You are only allowed to start off with a trump suit card if you do not own any other suit!");
                    else first_type = "Trump";
                } else first_type = "Higher wins";
                await Room.updateOne({ id: room.id }).set({ startoff: first_type });
            }

            // check for empty deck
            if (!room.trump && room.stack.length > 0) {
                let hand = await Card.find({ id: room.jsonplayers[acPl].hand });
                hand.splice(c_index, 1);
                // check if user could have played symbol
                if (card.symbol != room.stack[0].symbol) {
                    if (hand.find((el) => el.symbol == room.stack[0].card.symbol)) throw error(104, "You have to play the same symbol!");
                } else {
                    if (hand.find((el) => el.value > room.stack[0].card.value)) throw error(104, "You have to play a higher card if you own one!");
                }
            }

            sails.log("all good! " + user.name + " played card " + card);

            // add card to stack and remove from hand
            let temp_stack = room.stack;
            let temp_players = room.jsonplayers;
            temp_players[acPl].hand.splice(c_index, 1);
            temp_stack.push({ playerID: user.id, card: card });

            // socket event cardplayed
            user = await User.getNameAndHash(user.id);
            sails.sockets.broadcast(room.hashID, "cardplayed", { user: user, card: card }, req);
            ChatController.cardplayedmsg(user.name, card, room.hashID);

            // check for full stack
            let winner;
            if (temp_stack.length >= temp_players.length) {
                // eval win and deal
                sails.log("Full stack, eval winner");
                winner = evalStack(temp_stack, room.trump, first_type);
                winner = temp_players.findIndex((el) => el.playerID == winner);

                if (temp_players.length <= 3) {
                    for (let i = 0; i < temp_stack.length; i++) {
                        // DWM - gesamten Stich als Score hochzählen
                        temp_players[winner].score += temp_stack[i].card.value;
                    }
                    temp_players[winner].wins += 1;
                    user = await User.getNameAndHash(temp_players[winner].playerID);
                    user.score = temp_players[winner].score;
                    user.wins = temp_players[winner].wins;
                    sails.sockets.broadcast(room.hashID, "solowin", { user: user });
                    ChatController.turnmsg(user, room.hashID);
                    acPl = winner;
                } else {
                    let p_win = [];
                    let p_team = temp_players[winner].team;
                    // get winner team
                    for (pl of temp_players) {
                        if (pl.team == p_team) p_win.push(pl.playerID);
                    }

                    for (el of p_win) {
                        for (let i = 0; i < temp_stack.length; i++) {
                            // DWM - gesamten Stich als Score hochzählen
                            temp_players[el].score += temp_stack[i].card.value;
                        }
                        temp_players[el].wins += 1;
                    }

                    user = await User.getNameAndHash([temp_players[p_win[0]].playerID, temp_players[p_win[1]].playerID]);
                    user[0].score = temp_players[p_win[0]].score;
                    user[0].wins = temp_players[p_win[0]].wins;
                    user[1].score = user[0].score;
                    user[1].wins = user[0].wins;
                    sails.sockets.broadcast(room.hashID, "teamwin", { users: user });

                    if (p_win[0] == acPl) acPl = p_win[1];
                    else acPl = p_win[0];
                }
                sails.log(user.name + " won!");

                await Room.updateOne({ id: room.id }).set({ jsonplayers: temp_players });

                // check if game is finished by point limit
                if (user.length) {
                    if (user[0].score >= 101 || user[1].score >= 101) {
                        sails.sockets.broadcast(room.hashID, "gameover", { user: user });
                        await Room.updateOne({ id: room.id }).set({ status: "won" });
                        return res.ok();
                    }
                } else if (user.score >= 101) {
                    sails.sockets.broadcast(room.hashID, "gameover", { user: user });
                    await Room.updateOne({ id: room.id }).set({ status: "won" });
                    return res.ok();
                }

                // only deal cards if deck is not empty
                if (room.deck.length > 0) {
                    for (el of temp_players) {
                        user = await User.findOne({ id: el.playerID });
                        let card = await Card.dealCard(1, el.playerID, room.id);
                        if (card.length) {
                            sails.sockets.broadcast(user.socket, "dealcard", { card: card });
                        } else {
                            user = await User.getNameAndHash({ id: el.playerID });
                            sails.sockets.broadcast(room.hashID, "dealTrump", { user: user, card: room.trump });
                            await Room.updateOne({ id: room.id }).set({ trump: null });
                        }
                    }
                } else {
                    // if there are no cards on hand left, game is finished, win by most points
                    if (!temp_players.find((el) => el.hand.length > 0)) {
                        let w_score = temp_players[0].score;
                        let ut;
                        wuser = [];
                        // Game Finished
                        for (el of temp_players) {
                            if (el.score >= w_score) w_score = el.score;
                        }

                        for (el of temp_players) {
                            if (el.score == w_score) {
                                ut = await User.getNameAndHash(el.playerID);
                                user.push({
                                    name: ut.name,
                                    hashID: ut.hashID,
                                    score: el.score,
                                    wins: el.wins,
                                    team: el.team,
                                });
                            }
                        }
                        sails.sockets.broadcast(room.hashID, "gameover", { users: user });
                        await Room.updateOne({ id: room.id }).set({ status: "won" });
                        return res.ok();
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
            //if (first_type.length)
            sails.sockets.broadcast(room.hashID, "turn", { user: user });
            //else sails.sockets.broadcast(room.hashID, "firstturn", { user: user, type: first_type });

            // save changes
            sails.log("save changes!");
            await Room.updateOne({ id: room.id }).set({ stack: temp_stack, activePlayer: acPl });

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    callPair: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, cards, c_index, p_index;

            sails.log("callPair - sanity checking ...");
            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("called").populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");

            // check if user exists
            if (req.session.userid) user = await User.getNameAndHash(req.session.userid);
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            // check if user is in room
            p_index = room.jsonplayers.findIndex((el) => el.playerID == req.session.userid);
            if (p_index < 0) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can not do that right now!");

            // check if cards are callable
            cards = req.body.cards;
            sails.log.info(cards);
            if (cards[0].symbol != cards[1].symbol) throw error(104, "These cards are not callable!");
            else if (cards[0].value == cards[1].value) throw error(104, "These cards are not callable!");
            else if ([3, 4].includes(cards[0].value) == false || [3, 4].includes(cards[1].value) == false) throw error(104, "These cards are not callable!");

            if (room.called) {
                if (room.called.find((el) => el.id == cards[0].id) || room.called.find((el) => el.id == cards[1].id)) throw error(104, "These cards have already been called!");
            }
            if (!room.trump) throw error(104, "You cannot call any more pairs if the deck is empty!");

            // check if user owns both cards
            cards.forEach((card) => {
                c_index = room.jsonplayers[p_index].hand.findIndex((el) => el == card.id);
                if (c_index < 0) throw error(104, "You do not own this card, cheater!");
            });

            sails.log("all good! " + user.name + " called " + cards);

            if (room.jsonplayers[p_index].wins >= 1) {
                // mark cards as called
                await Room.addToCollection(room.id, "called", [cards[0].id, cards[1].id]);
                // update score
                if (cards[0].symbol == room.trump.symbol) room.jsonplayers[p_index].score += 40;
                else room.jsonplayers[p_index].score += 20;
                user.score = room.jsonplayers[p_index].score;

                if (room.jsonplayers.length >= 4) {
                    user.team = room.jsonplayers[p_index].team;
                    // get winner teammate
                    let t_win = room.jsonplayers.findIndex((el) => el.team == user.team && el.playerID != room.jsonplayers[p_index].playerID);
                    room.jsonplayers[t_win].score = user.score;
                }

                // socket call event
                sails.sockets.broadcast(room.hashID, "paircalled", { user: user, cards: cards }, req);

                // save changes
                await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

                // check for game win
                if (user.score >= 101) {
                    sails.sockets.broadcast(room.hashID, "gameover", { user: user });
                    await Room.updateOne({ id: room.id }).set({ status: "won" });
                }
            } else throw error(104, "You are not allowed to do that yet!");

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    robTrump: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, card, c_index, p_index;
            let players = [];

            sails.log("robTrump - sanity checking ...");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(102, "This room could not be found!");

            // check if trump card exists
            if (!room.trump) throw error(104, "No Trump found!");

            // block robbery just to be safe
            await Room.updateOne({ id: room.id }).set({ robbed: true });

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            // check if user is in room
            p_index = room.jsonplayers.findIndex((el) => el.playerID == user.id);
            if (p_index < 0) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can not do that right now!");

            card = req.body.card;
            sails.log.info(card);
            // check if played card is trump 7
            if (card.value != 0 || card.symbol != room.trump.symbol) throw error(104, "This is not the right card!");
            // check if user owns card
            c_index = room.jsonplayers[p_index].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw error(104, "You do not own this card, cheater!");

            sails.log("all good! " + user.name + " robbed " + room.trump + " with " + card);

            // check if user has enough wins
            if (room.jsonplayers[p_index].wins >= 1) {
                // switch trump card with player card
                let temp = room.jsonplayers[p_index].hand[c_index];
                room.jsonplayers[p_index].hand[c_index] = room.trump.id;
                user = await User.getNameAndHash(user.id);
                sails.sockets.broadcast(room.hashID, "cardrob", { user: user, card: card }, req); // <--JB- hier solltest du mir mal sagen wie dus gernen hättest? soll jeder das cardrob event bekommen, also auch der der die Karte geraubt hat, oder alle außer ihm?
                await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers, trump: temp }); // beim melden hab ichs nämlich so gemacht, dass alle benachrichtigt werden, macht vlt mehr sinn
            } else throw error(104, "You are not allowed to do that yet!");

            return res.status(200).json({ trump: room.trump });
        } catch (err) {
            // reset robbery
            await Room.updateOne({ id: req.session.roomid }).set({ robbed: false });
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    pauseGame: async (req, res) => {},
};

function evalStack(stack, trump, type) {
    let occ = [];
    let v_h = -1;
    let i_t = 0;
    let el;

    // special handle for first round
    if (type.length > 0) {
        if (type == "Second Ace") {
            for (i = 1; i < stack.length; i++) {
                if (stack[i].symbol == stack[0].symbol && stack[i].value == stack[0].value) return stack[i].playerID;
            }
            return stack[0].playerID;
        } else {
            let pi = stack[0].playerID;
            for (i = 1; i < stack.length; i++) {
                if (stack[i].symbol == stack[0].symbol && stack[i].value > stack[0].value) pi = stack[i].playerID;
            }
            return pi;
        }
    }

    // get occurrences of trump symbol
    if (trump.symbol) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i].card.symbol == trump) occ.push(i);
        }
    }

    // all trump symbol or no trump symbol
    if (occ.length == stack.length || occ.length == 0) {
        for (i = 0; i < stack.length; i++) {
            if (stack[0].card.symbol == stack[i].card.symbol) {
                if (stack[i].card.value > v_h) {
                    i_t = i;
                    v_h = stack[i].card.value;
                }
            }
        }
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

function evalGame() {}
