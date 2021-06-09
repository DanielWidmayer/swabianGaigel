/**
 * GameControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const ChatController = require("./ChatController");

const error = sails.helpers.errors;

module.exports = {
    // -------------------------------------------------------------------------------------- randomOrder
    randomOrder: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let players = [],
                temp = [],
                t_player;

            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin").populate("players");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user is in room
            if (room.players.findIndex((pl) => pl.id == user.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin
            if (user.id != room.admin.id) throw error(104, "You are not allowed to do this!");

            // check if game has already started
            if (room.status == "game") throw error(104, "The game has already started!");

            // shuffle
            temp = room.players;
            let j, m;
            for (let i = temp.length - 1; i > 0; i--) {
                j = Math.floor(Math.random() * (i + 1));
                m = temp[i];
                temp[i] = temp[j];
                temp[j] = m;
            }
            
            room.order = temp.map((el) => el.id);

            if (room.maxplayers >= 4) {
                let div = Math.floor(room.maxplayers / 2);
                for (let i = 0; i < temp.length; i++) {
                    temp[i].team = (i % div) + 1;
                }
            }

            for (let pl of temp) {
                t_player = await User.getNameAndHash(pl.id);
                if (t_player.bot) pl.ready = true;
                else pl.ready = false;
                players.push(t_player);
                players[players.length - 1].ready = pl.ready;
                players[players.length - 1].team = pl.team;
                await User.updateOne({ id: pl.id }).set({ ready: pl.ready, team: pl.team });
            }

            // save changes
            await Room.updateOne({ id: room.id }).set({ order: room.order });

            // userevent
            sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- switchTeam

    switchTeam: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let teams = [0, 0, 0, 0];
            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin").populate("players");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if game is already running
            if (room.status == "game") throw error(104, "The game has already started!");

            // check if user is in room
            if (room.players.findIndex((pl) => pl.id == user.id) < 0) throw error(101, "User is not in this room!");

            // check team parameter
            let t_team = req.body.team;
            if (t_team < 0 || t_team > 3) throw error(104, "This Team does not exist!");

            if (room.maxplayers < 4) throw error(104, "No Teams allowed for less than 4 players!");

            for (const pl of room.players) {
                teams[pl.team] += 1;
            }
  
            if (user.team == t_team) user.team = 0;
            else if (teams[t_team] >= 2) throw error(104, "This Teams is already full!");
            else user.team = t_team;

            await User.updateOne({ id: user.id }).set({ ready: false, team: user.team });

            let players = [];
            for (const id of room.order) {
                let tp_obj = room.players.find((el) => el.id == id);
                players.push(await User.getNameAndHash(id));
                if (user.id == id) {
                    players[players.length - 1].ready = false;
                    players[players.length - 1].team = user.team;
                } else {
                    players[players.length - 1].ready = tp_obj.ready;
                    players[players.length - 1].team = tp_obj.team;
                }
            }

            sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });

            return res.status(200).json({ team: user.team });
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- addBot

    addBot: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let players;
            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin").populate("players");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");
            players = room.players;

            // check if user is in room
            if (players.findIndex((pl) => pl.id == user.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin
            if (user.id != room.admin.id) throw error(104, "You are not allowed to do this!");

            // check if room is full
            if (players.length >= room.maxplayers) throw error(104, "Room is already full!");

            let bot = await User.newBot();
            room.order.push(bot.id);
            await Room.addToCollection(room.id, "players", bot.id);
            await Room.updateOne({ id: room.id }).set({ order: room.order });

            let users = [];
            for (let i = 0; i < room.order.length - 1; i++) {
                let tp_obj = players.find((el) => el.id == room.order[i]);
                users.push(await User.getNameAndHash(tp_obj.id));
                users[users.length - 1].ready = tp_obj.ready;
                users[users.length - 1].team = tp_obj.team;
            }
            users.push(await User.getNameAndHash(bot.id));
            users[users.length - 1].ready = bot.ready;
            users[users.length - 1].team = bot.team;
            
            sails.sockets.broadcast(room.hashID, "userevent", { users: users, max: room.maxplayers, ingame: false });
            ChatController.botmsg(bot.botname, room.hashID, 1);

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- kickPlayer

    kickPlayer: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }
        try {
            let players = [];
            let target = req.body.target;

            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin").populate("players");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user and target are in room
            target = await User.findOne({ hashID: target });
            if (!target) throw error(101, "This User does not exist!");
            if (room.players.findIndex((pl) => pl.id == user.id) < 0) throw error(101, "User is not in this room!");
            if (room.players.findIndex((pl) => pl.id == target.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin and if he wants to kick himself
            if (user.id != room.admin.id || target.id == room.admin.id) throw error(104, "You are not allowed to do this!");

            if (target.bot) {
                if (room.status == "game") throw error(104, "You can't kick a Bot once the game has started!");
                else {
                    await Room.removeFromCollection(room.id, "players", target.id);
                    room.order.splice(room.order.indexOf(target.id), 1);
                    await Room.updateOne({ id: room.id }).set({ order: room.order });
                    await User.destroyOne({ id: target.id });

                    ChatController.botmsg(target.botname, room.hashID, -1);

                    for (const id of room.order) {
                        let tp_obj = room.players.find((el) => el.id == id);
                        players.push(await User.getNameAndHash(id));
                        players[players.length - 1].ready = tp_obj.ready;
                        players[players.length - 1].team = tp_obj.team;
                    }
                    sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });
                }
            } else {
                // server can't force a player to refresh page or redirect on a socket request, this has to be done on client side
                // if a user modifies its code to not receive the disconnect event all further socket requests should at least be blocked
                await User.updateOne({ id: target.id }).set({ kicked: true, unload: true });

                sails.sockets.broadcast(target.socket, "kicked");
            }

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- startGame

    startGame: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        } else {
            try {
                let players = [],
                    carddeck,
                    cards,
                    trump_card;
                let u_index;
                // check authentication
                if (req.session.roomid && req.session.userid) {
                    room = await Room.findOne({ id: req.session.roomid }).populate("players");
                    user = await User.findOne({ id: req.session.userid });
                } else throw error(101, "Invalid Session!");
                if (!room) throw error(101, "This Room could not be found!");
                if (!user) throw error(101, "This User could not be found!");

                // check if user is in room and set ready
                u_index = room.players.findIndex((pl) => pl.id == user.id);
                if (u_index < 0) throw error(101, "User is not in this room!");
                if (room.players[u_index].ready == false) room.players[u_index].ready = true;
                else room.players[u_index].ready = false;

                await User.updateOne({ id: user.id }).set({ ready: room.players[u_index].ready });

                // wait till all players are ready
                let rps = room.players.reduce((cb, pv) => {
                    if (pv.ready) return cb + 1;
                    else return cb;
                }, 0);
                if (rps < room.players.length) {
                    for (const id of room.order) {
                        let tp_obj = room.players.find((el) => el.id == id);
                        players.push(await User.getNameAndHash(id));
                        players[players.length - 1].ready = tp_obj.ready;
                        players[players.length - 1].team = tp_obj.team;
                    }

                    sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });
                    return res.status(200).json({ ready: room.players[u_index].ready });
                }

                if (room.players.length < room.maxplayers) {
                    // fill up with Bots
                    for (let i = room.players.length; i < room.maxplayers; i++) {
                        let newbot = await User.newBot();
                        room.players.push(newbot);
                        room.order.push(newbot.id);
                        await Room.addToCollection(room.id, "players", newbot.id);
                        newbot = await User.getNameAndHash(newbot.id);
                        ChatController.botmsg(newbot.name, room.hashID, 1);
                    }
                }

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
                if (room.players.length >= 4) {
                    let teams = [];
                    for (let i = 0; i <= room.players.length / 2; i++) {
                        teams[i] = room.players.filter((el) => el.team == i);
                    }
                    // assign free players to team
                    for (let el of teams[0]) {
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
                    for (let i = 0; i < room.players.length; i++) {
                        ts = i % (room.players.length / 2);
                        room.players[i] = teams[ts][ps];
                        room.order[i] = room.players[i].id;
                        await User.updateOne({ id: room.order[i] }).set({ team: room.players[i].team });
                        if (i + 1 >= room.players.length / 2) ps = 1;
                    }
                }

                await Room.updateOne({ id: room.id }).set({ trump: trump_card.id, order: room.order });

                // deal cards to players, start game
                let hand;
                for (const id of room.order) {
                    let tp_obj = room.players.find((el) => el.id == id);
                    players.push(await User.getNameAndHash(id));
                    players[players.length - 1].team = tp_obj.team;
                }
                sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: true });

                for (const pl of room.players) {
                    sails.log("deal 5 cards to player " + pl.id);
                    hand = await Card.dealCard(5, pl.id, room.id);
                    sails.sockets.broadcast(pl.socket, "start", { hand: hand, trump: trump_card, users: players });
                }

                // broadcast firstturn event
                user = await User.getNameAndHash(room.order[0]);
                ChatController.firstturnmsg(user, room.hashID);
                sails.log("its " + user.name + " turn");
                sails.sockets.broadcast(room.hashID, "firstturn", { user: user });

                if (user.bot) setTimeout(botPlay, 1000, { roomid: room.id, botid: room.order[0] });

                return res.ok();
            } catch (err) {
                sails.log.error(err);
                if (err.code) {
                    if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                    if (err.code == 102) ChatController.errormsg(room.hashID, err.msg);
                    return res.badRequest(err);
                } else return res.serverError(err);
            }
        }
    },

    // -------------------------------------------------------------------------------------- playCard

    playCard: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let card, acPl;
            let firstplay = false,
                firstround = false;
            let delay = 1000;

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid }).populate("hand");
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(user.name + " is playing a card");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump").populate("players");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

            acPl = room.order[room.activePlayer];
            let first_type = room.startoff;

            // check if user is in room
            if (!room.players.find((el) => el.id == user.id)) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can not do that right now!");

            // check if user is active player
            if (acPl != user.id) throw error(104, "This is not your turn, cheater!");

            card = req.body.card;
            sails.log.info(card);
            // check if user owns card
            if (user.hand.findIndex((el) => el.id == card.id) < 0) throw error(104, "You do not own this card, cheater!");

            // check for first round
            if (!room.players.find((el) => el.wins > 0)) {
                firstround = true;
                if (first_type.length <= 0) {
                    if (card.value == 11) first_type = "Second Ace";
                    else if (card.symbol == room.trump.symbol) {
                        if (user.hand.find((el) => el.symbol != room.trump.symbol)) throw error(104, "You are only allowed to start off with a trump suit card if you do not own any other suit!");
                        else first_type = "Trump";
                    } else first_type = "Higher wins";
                    firstplay = true;
                    await Room.updateOne({ id: room.id }).set({ startoff: first_type });
                }
            }

            // create temp_stack with card objects
            let temp_stack = [];
            for (const el of room.stack) {
                let tc = await Card.findOne({ id: el.cardID });
                temp_stack.push({ playerID: el.playerID, card: tc });
            }

            // check for empty deck
            if (!room.deck.length && room.stack.length > 0) {
                let hand = user.hand;
                let tc = hand.findIndex((el) => el.id == card.id);
                hand.splice(tc, 1);

                if (card.symbol != temp_stack[0].card.symbol) {
                    if (hand.find((el) => el.symbol == temp_stack[0].card.symbol)) throw error(104, "You have to play the same suit!");
                    else if (card.symbol != room.trump.symbol && hand.find((el) => el.symbol == room.trump.symbol)) throw error(104, "You have to play Trump if you own one!");
                }

                let t_val = -1;
                let s_val = -1;
                for (const el of temp_stack) {
                    if (el.card.value > s_val && el.card.symbol == temp_stack[0].card.symbol) s_val = el.card.value;
                    if (el.card.value > t_val && el.card.symbol == room.trump.symbol) t_val = el.card.value;
                }
                if (card.symbol == room.trump.symbol) {
                    if (card.value < t_val && hand.find((el) => el.value >= t_val && el.symbol == card.symbol)) throw error(104, "You have to play a higher card if you own one!");
                } else if (card.value < s_val && hand.find((el) => el.value >= s_val && el.symbol == card.symbol)) throw error(104, "You have to play a higher card if you own one!");
            }

            // add card to stack and remove from hand
            temp_stack.push({ playerID: user.id, card: card });
            room.stack.push({ playerID: user.id, cardID: card.id });
            await User.removeFromCollection(user.id, "hand", card.id);
            //sails.log(temp_players);
            await Room.updateOne({ id: room.id }).set({ stack: room.stack });

            // socket event cardplayed
            let t_user = await User.getNameAndHash(user.id);
            if (!firstround) {
                sails.sockets.broadcast(room.hashID, "cardplayed", { user: t_user, card: card });
                ChatController.cardplayedmsg(t_user, card, room.hashID);
            } else {
                sails.sockets.broadcast(user.socket, "firstcard", { user: t_user, card: card });
                sails.sockets.broadcast(room.hashID, "firstcard", { user: t_user }, req);
            }
            if (firstplay) {
                ChatController.firstcardtypemsg(t_user, first_type, room.hashID);
            }

            sails.log(`${user.name} played card ${card.id}`);

            // check for full stack
            let winner = -1;
            if (temp_stack.length >= room.players.length) {
                // eval win and deal
                sails.log("Full stack, eval winner");
                winner = evalStack(temp_stack, room.trump, firstround ? first_type : "");

                acPl = await applyWin(room.id, firstround, winner, user.id);
                room.activePlayer = room.order.indexOf(acPl);

                // check for win condition
                if (await gameover(room.id)) return res.ok();

                // only deal cards if deck is not empty
                if (room.deck.length > 0) {
                    for (const el of room.players) {
                        let card = await Card.dealCard(1, el.id, room.id);
                        if (card.length) {
                            sails.sockets.broadcast(el.socket, "dealcard", { card: card });
                        } else {
                            // deal trump card
                            await User.addToCollection(el.id, "hand", room.trump.id);
                            user = await User.getNameAndHash(el.id);
                            sails.sockets.broadcast(room.hashID, "dealTrump", { user: user, card: room.trump });
                        }
                    }
                }
                //sails.log.info(room.jsonplayers);
            } else {
                // next player turn
                if (room.activePlayer < room.order.length - 1) room.activePlayer += 1;
                else room.activePlayer = 0;
                acPl = room.order[room.activePlayer];
            }

            // update activePlayer and broadcast next turn
            await Room.updateOne({ id: room.id }).set({ activePlayer: room.activePlayer });
            user = await User.getNameAndHash(acPl);
            sails.log("next player: " + user.name);
            sails.sockets.broadcast(room.hashID, "turn", { user: user });

            // check for bot turn
            if (user.bot == true) {
                await botRob(room.id, acPl);
                await botCall(room.id, acPl);
                if (winner >= 0) delay = 4000;
                setTimeout(botPlay, delay, { roomid: room.id, botid: acPl });
            }

            //temp_players = await Room.findOne({ id: room.id });
            //sails.log(temp_players.jsonplayers);

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- callPair

    callPair: async (req, res) => {
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid }).populate("hand");
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");
            let t_user = await User.getNameAndHash(user.id);

            sails.log(user.name + "is calling a Pair");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("called").populate("trump").populate("players");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

            // check if user is in room
            if (!room.order.includes(user.id)) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can not do that right now!");

            // check if cards are callable
            let cards = req.body.cards;
            sails.log.info(cards);
            if (cards[0].symbol != cards[1].symbol) throw error(104, "These cards are not callable!");
            else if (cards[0].value == cards[1].value) throw error(104, "These cards are not callable!");
            else if ([3, 4].includes(cards[0].value) == false || [3, 4].includes(cards[1].value) == false) throw error(104, "These cards are not callable!");

            if (room.called) {
                if (room.called.find((el) => el.id == cards[0].id) || room.called.find((el) => el.id == cards[1].id)) throw error(104, "These cards have already been called!");
            }
            if (!room.deck.length) throw error(104, "You can't call any more pairs if the deck is empty!");

            // check if user owns both cards
            for (const card of cards) {
                if (!user.hand.find((el) => el.id == card.id)) throw error(104, `You do not own this card, cheater!`);
            }

            if (user.wins >= 1) {
                // mark cards as called
                await Room.addToCollection(room.id, "called", [cards[0].id, cards[1].id]);
                // update score
                if (cards[0].symbol == room.trump.symbol) user.score += 40;
                else user.score += 20;
                await User.updateOne({ id: user.id }).set({ score: user.score });
                t_user.score = user.score;

                if (room.players.length >= 4) {
                    // get winner teammate
                    let mate = room.players.find((pl) => pl.id != user.id && pl.team == user.team);
                    await User.updateOne({ id: mate.id }).set({ score: user.score });
                    t_user.team = user.team;
                }

                
                // socket call event
                sails.sockets.broadcast(room.hashID, "paircalled", { user: t_user, cards: cards }, req);
                ChatController.paircalledmsg(t_user, cards[0].symbol, room.showscore, room.hashID);

                sails.log(`${user.name} called pair ${cards[0].id} and ${cards[1].id}`);

                // check for game win condition
                await gameover(room.id);
            } else throw error(104, "You are not allowed to do that yet!");

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- robTrump

    robTrump: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, card, c_index, p_index;
            let players = [];

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid }).populate("hand");
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(user.name + " is robbing the trump");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

            // check if trump card exists
            if (!room.deck.length) throw error(104, "You can't rob anymore!");

            // block robbery just to be safe
            await Room.updateOne({ id: room.id }).set({ robbed: true });

            // check if user is in room
            if (!room.order.includes(user.id)) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can't do that right now!");

            card = req.body.card;
            sails.log.info(card);
            // check if played card is trump 7
            if (card.value != 0 || card.symbol != room.trump.symbol) throw error(104, "You can't rob with this card!");
            // check if user owns card
            if (!user.hand.find((el) => el.id == card.id)) throw error(104, "You do not own this card, cheater!");

            // check if user has enough wins
            if (user.wins >= 1) {
                // switch trump card with player card
                await User.removeFromCollection(user.id, "hand", card.id);
                await User.addToCollection(user.id, "hand", room.trump.id);
 
                user = await User.getNameAndHash(user.id);
                sails.sockets.broadcast(room.hashID, "cardrob", { user: user, card: card }, req);
                ChatController.cardrobmsg(user, room.trump, room.hashID);
                await Room.updateOne({ id: room.id }).set({ trump: card.id });
                sails.log(`${user.name} robbed the trump (${room.trump.id}) with card ${card.id}`);
            } else throw error(104, "You are not allowed to do that yet!");

            return res.status(200).json({ trump: room.trump });
        } catch (err) {
            // reset robbery
            await Room.updateOne({ id: req.session.roomid }).set({ robbed: false });
            sails.log.error(err);
            if (err.code) {
                if (err.code == 104) ChatController.errormsg(user.socket, err.msg);
                return res.badRequest(err);
            } else return res.serverError(err);
        }
    },

    triggerBot: async (roomid, botid) => {
        let room = await Room.findOne({ id: roomid });

        if (room.order[room.activePlayer] == botid) {
            botPlay({ roomid: roomid, botid: botid });
        }
        return 1;
    },
};

// -------------------------------------------------------------------------------------- Bot Functions
async function botPlay(args) {
    let room = await Room.findOne({ id: args.roomid }).populate("deck").populate("trump").populate("players");
    let bot = await User.findOne({ id: args.botid }).populate("hand");
    let firstplay = false;
    let firstround = false;
    let empty = false;
    let delay = 1000;

    let stack = [];
    for (const el of room.stack) stack.push({ playerID: el.playerID, card: await Card.findOne({ id: el.cardID }) });

    // check if game was already won
    if (room.status == "lobby") return 0;

    let t_user = await User.getNameAndHash(bot.id);

    sails.log("Bot " + t_user.name + " is playing a card");

    // check if bot is still bot
    if (t_user.bot == false) return 0;

    // check for first round and first play
    if (!room.players.find((el) => el.wins > 0)) {
        firstround = true;
        if (stack.length <= 0) firstplay = true;
    }

    // check empty deck
    if (!room.deck.length && stack.length > 0) empty = true;

    // play Card
    let pcards = [];
    let card = 0,
        c_index;
    if (firstplay) {
        // bot starts off, play random card that is not trump suit or else if only trump owned
        for (const el of bot.hand) {
            if (el.symbol != room.trump.symbol) pcards.push(el);
        }
    } else if (firstround) {
        // first round, only play trump if Trump has been called
        if (room.startoff == "Trump") {
            for (const el of bot.hand) {
                if (el.symbol == room.trump.symbol) pcards.push(el);
            }
        } else {
            for (const el of bot.hand) {
                if (el.symbol != room.trump.symbol) pcards.push(el);
            }
        }
    } else if (empty && stack.length > 0) {
        let hand_hs = -1;
        let hand_ht = -1;
        let stack_hs = -1;
        let stack_ht = -1;
        let trump_p = [];
        let symbol_p = [];

        for (const el of stack) {
            if (el.card.symbol == room.trump.symbol && el.card.value > stack_ht) stack_ht = el.card.value;
            if (el.card.symbol == stack[0].card.symbol && el.card.value > stack_hs) stack_hs = el.card.value;
        }

        for (const el of bot.hand) {
            if (el.symbol == stack[0].card.symbol && el.value >= stack_hs) {
                hand_hs = el.value;
                symbol_p.push(el);
            }
            if (el.symbol == room.trump.symbol && el.value >= stack_ht) {
                hand_ht = el.value;
                trump_p.push(el);
            }
        }
        if (symbol_p.length) pcards = symbol_p;
        else if (trump_p) pcards = trump_p;
    } else {
        let ht = -1;
        let hv = -1;
        if (stack.length == room.players.length - 1) {
            // check if bot could win
            for (let i = 0; i < stack.length; i++) {
                if (stack[i].card.symbol == room.trump.symbol && stack[i].card.value > ht) ht = stack[i].card.value;
                else if (stack[i].card.symbol == stack[0].card.symbol && stack[i].card.value > hv) hv = stack[i].card.value;
            }
            if (ht >= 0) {
                let ci = bot.hand.findIndex((el) => el.value >= ht && el.symbol == room.trump.symbol);
                if (ci >= 0) pcards.push(bot.hand[ci]);
            } else {
                let ci = bot.hand.findIndex((el) => el.value >= hv && el.symbol == stack[0].card.symbol);
                if (ci >= 0) pcards.push(bot.hand[ci]);
            }
        }
    }

    // if no card has been picked, select all
    if (pcards.length <= 0) pcards = bot.hand;
    // pick random card out of possible cards
    c_index = Math.floor(Math.random() * pcards.length);
    card = pcards[c_index];

    await User.removeFromCollection(bot.id, "hand", card.id);

    room.stack.push({ playerID: bot.id, cardID: card.id });
    stack.push({ playerID: bot.id, card: card });

    sails.log.info(card);
    //sails.log(players);

    await Room.updateOne({ id: room.id }).set({ stack: room.stack });

    // socket event cardplayed
    if (firstplay) {
        if (card.symbol == room.trump.symbol) room.startoff = "Trump";
        else if (card.value == 11) room.startoff = "Second Ace";
        else room.startoff = "Higher wins";
        await Room.updateOne({ id: room.id }).set({ startoff: room.startoff });
        ChatController.firstcardtypemsg(t_user, room.startoff, room.hashID);
        //sails.log.info("bot firstplay");
    }
    if (firstround) {
        sails.sockets.broadcast(room.hashID, "firstcard", { user: t_user });
        //sails.log.info("bot firstround");
    } else {
        sails.sockets.broadcast(room.hashID, "cardplayed", { user: t_user, card: card });
        ChatController.cardplayedmsg(t_user, card, room.hashID);
        //sails.log.info("bot cardplayed");
    }

    sails.log(`Bot ${t_user.name} has played card ${card.id}`);

    // check for full stack
    let winner = -1;
    if (stack.length >= room.players.length) {
        // eval win and deal
        sails.log("Full stack, eval winner");
        winner = evalStack(stack, room.trump, firstround ? room.startoff : "");

        await applyWin(room.id, firstround, winner);
        room.activePlayer = room.order.indexOf(winner);

        // check for win condition
        if (await gameover(room.id)) return 1;

        // only deal cards if deck is not empty
        if (room.deck.length > 0) {
            for (const el of room.players) {
                let dealcard = await Card.dealCard(1, el.id, room.id);
                if (dealcard.length) {
                    if (!el.bot) sails.sockets.broadcast(el.socket, "dealcard", { card: dealcard });
                } else {
                    await User.addToCollection(el.id, "hand", room.trump.id);
                    t_user = await User.getNameAndHash(el.id);
                    sails.sockets.broadcast(room.hashID, "dealTrump", { user: t_user, card: room.trump });
                    ChatController.deckemptymsg(room.hashID);
                }
            }
        }
    } else {
        // next player turn
        if (room.activePlayer < room.order.length - 1) room.activePlayer += 1;
        else room.activePlayer = 0;
    }

    // update activePlayer and broadcast next turn
    await Room.updateOne({ id: room.id }).set({ activePlayer: room.activePlayer });
    t_user = await User.getNameAndHash(room.order[room.activePlayer]);
    sails.log("next player: " + t_user.name);
    sails.sockets.broadcast(room.hashID, "turn", { user: t_user });

    // check for bot turn
    if (t_user.bot == true) {
        await botRob(room.id, room.order[room.activePlayer]);
        await botCall(room.id, room.order[room.activePlayer]);
        if (winner >= 0) delay = 4000;
        setTimeout(botPlay, delay, { roomid: room.id, botid: room.order[room.activePlayer] });
    }

    //players = await Room.findOne({ id: room.id });
    //sails.log(players.jsonplayers);
    return 1;
}

async function botCall(roomid, botid) {
    let room = await Room.findOne({ id: roomid }).populate("deck").populate("called").populate("trump").populate("players");
    let bot = await User.findOne({ id: botid }).populate("hand");
    let pairs = [];
    let call = [];
    let tcall = [];

    if (bot.wins >= 1 && room.deck.length) {
        for (const el of bot.hand) {
            if ((el.value == 3 || el.value == 4) && !room.called.find((cd) => cd.id == el.id)) pairs.push(el);
        }
        if (pairs.length >= 2) {
            for (x = 0; x < pairs.length - 1; x++) {
                for (y = x + 1; y < pairs.length; y++) {
                    if (pairs[x].symbol == pairs[y].symbol && pairs[x].value != pairs[y].value) {
                        if (pairs[x].symbol == room.trump.symbol) tcall = [pairs[x], pairs[y]];
                        else call = [pairs[x], pairs[y]];
                    }
                }
            }
        } else return 0;

        if (tcall.length == 2) {
            await Room.addToCollection(room.id, "called", [tcall[0].id, tcall[1].id]);
            bot.score += 40;
            call = tcall;
        } else if (call.length == 2) {
            await Room.addToCollection(room.id, "called", [call[0].id, call[1].id]);
            bot.score += 20;
        } else return 0;

        await User.updateOne({ id: bot.id }).set({ score: bot.score });

        if (room.players.length >= 4) {
            // get winner teammate
            let mate = room.players.find((pl) => pl.id != bot.id && pl.team == bot.team);
            await User.updateOne({ id: mate.id }).set({ score: bot.score });
        }

        // socket call event
        let user = await User.getNameAndHash(bot.id);
        user.score = bot.score;
        user.team = bot.team;
        sails.sockets.broadcast(room.hashID, "paircalled", { user: user, cards: call });
        ChatController.paircalledmsg(user, call[0].symbol, room.showscore, room.hashID);

        sails.log(`Bot ${user.name} has called pair ${call[0].id} and ${call[1].id}`);

        // check for game win condition
        await gameover(room.id);
    } else return 0;

    return 1;
}

async function botRob(roomid, botid) {
    let room = await Room.findOne({ id: roomid }).populate("deck").populate("trump");
    let bot = await User.findOne({ id: botid }).populate("hand");

    if (bot.wins > 0 && room.deck.length && !room.robbed) {
        let card = bot.hand.find((el) => el.symbol == room.trump.symbol && el.value == 0);
        if (card) {
            await User.removeFromCollection(bot.id, "hand", card.id);
            await User.addToCollection(bot.id, "hand", room.trump.id);

            let user = await User.getNameAndHash(bot.id);
            sails.sockets.broadcast(room.hashID, "cardrob", { user: user, card: card });
            ChatController.cardrobmsg(user, room.trump, room.hashID);
            await Room.updateOne({ id: room.id }).set({ trump: card.id, robbed: true });
            sails.log(`Bot ${user.name} has robbed the trump (${room.trump.id}) with card ${card.id}`);
        }
    } else return 0;

    return 1;
}

// -------------------------------------------------------------------------------------- Helper Functions

function evalStack(stack, trump, type) {
    let occ = [];
    let v_h = -1;
    let i_t = 0;

    // special handle for first round
    if (type.length > 0) {
        if (type == "Second Ace") {
            for (let i = 1; i < stack.length; i++) {
                if (stack[i].card.symbol == stack[0].card.symbol && stack[i].card.value == stack[0].card.value) return stack[i].playerID;
            }
            return stack[0].playerID;
        } else {
            let pi = stack[0].playerID;
            for (let i = 1; i < stack.length; i++) {
                if (stack[i].card.symbol == stack[0].card.symbol && stack[i].card.value > stack[0].card.value) pi = stack[i].playerID;
            }
            return pi;
        }
    }

    // get occurrences of trump symbol
    for (let i = 0; i < stack.length; i++) {
        if (stack[i].card.symbol == trump.symbol) occ.push(stack[i]);
    }

    // all trump symbol or no trump symbol
    if (occ.length == stack.length || occ.length == 0) {
        for (let i = 0; i < stack.length; i++) {
            if (stack[0].card.symbol == stack[i].card.symbol) {
                if (stack[i].card.value > v_h) {
                    i_t = i;
                    v_h = stack[i].card.value;
                }
            }
        }
        return stack[i_t].playerID;
    } else {
        for (const el of occ) {
            if (el.card.value > v_h) {
                i_t = el.playerID;
                v_h = el.card.value;
            }
        }
        return i_t;
    }
}

async function applyWin(roomid, firstround, winnerID, ownID = 0) {
    try {
        let room = await Room.findOne({ id: roomid }).populate("players");
        let winner = room.players.find((el) => el.id == winnerID);
        let user;
        let stack = [];

        // generate stack with card objects
        for (const el of room.stack) {
            stack.push({ playerID: el.playerID, card: await Card.findOne({ id: el.cardID }) });
        }

        if (firstround) {
            let user_stack = {};
            let uhash;
            for (const el of stack) {
                uhash = await User.getNameAndHash(el.playerID);
                ChatController.cardplayedmsg(uhash, el.card, room.hashID);
                uhash = uhash.hashID.toString();
                user_stack[uhash] = el.card;
            }
            sails.sockets.broadcast(room.hashID, "firstwin", { data: user_stack }); // data: { 345: CardObj, 277: Cardobj, ... }
        }

        // apply score and wins to winner
        for (let i = 0; i < stack.length; i++) {
            // gesamten Stich als Score hochzählen
            winner.score += stack[i].card.value;
        }
        winner.wins += 1;
        await User.updateOne({ id: winner.id }).set({ score: winner.score, wins: winner.wins });

        // check for teamplay
        if (winner.team > 0 && room.players.length >= 4) {
            let mate = room.players.find((el) => el.id != winner.id && el.team == winner.team);
            await User.updateOne({ id: mate.id }).set({ score: winner.score, wins: winner.wins });
        }

        user = await User.getNameAndHash(winner.id);
        user.score = winner.score;
        user.wins = winner.wins;
        sails.sockets.broadcast(room.hashID, "roundwin", { user: user });
        ChatController.turnmsg(user, room.showscore, room.hashID);

        sails.log(user.name + " won!");

        await Room.updateOne({ id: room.id }).set({ stack: [] });

        return winner.id;
    } catch (err) {
        throw err;
    }
}

async function gameover(roomid) {
    let room = await Room.findOne({ id: roomid }).populate("admin").populate("players");
    let winners = [],
        players = [],
        ut;
    if (room) {
        // get players and hands
        players = await User.find({ id: room.order }).populate("hand");
        players = room.order.map((id) => {
            return players.find((pl) => pl.id == id);
        });

        // if there are no cards on hand left, game is finished, win by most points
        if (!players.find((el) => el.hand.length > 0)) {
            let w_score = players[0].score;

            // get player with most points
            for (const el of players) {
                if (el.score >= w_score) w_score = el.score;
            }

            for (const el of players) {
                if (el.score == w_score) {
                    ut = await User.getNameAndHash(el.id);
                    winners.push({
                        name: ut.name,
                        hashID: ut.hashID,
                        score: el.score,
                        wins: el.wins,
                        team: el.team,
                    });
                }
            }
        }
        // win by point limit
        else if (players.find((el) => el.score >= 101)) {
            for (const el of players) {
                if (el.score >= 101) {
                    ut = await User.getNameAndHash(el.id);
                    winners.push({
                        name: ut.name,
                        hashID: ut.hashID,
                        score: el.score,
                        wins: el.wins,
                        team: el.team,
                    });
                }
            }
        }

        if (winners.length > 0) {
            sails.sockets.broadcast(room.hashID, "gameover", { winners: winners });
            ChatController.gameovermsg(winners, room.hashID);
            await Room.updateOne({ id: room.id }).set({ status: "lobby" });

            // reset Room for rematch
            // reset players and delete bots
            for (let el of players) {
                if (!el.bot) {
                    await User.updateOne({ id: el.id }).set({ score: 0, ready: false, team: 0, wins: 0 });
                    await User.replaceCollection(el.id, "hand").members([]);
                }
            }
            let bot = players.findIndex((el) => el.bot == true);
            while (bot >= 0) {
                await User.destroyOne({ id: players[bot].id });
                players.splice(bot, 1);
                bot = players.findIndex((el) => el.bot == true);
            }
            // switch first player
            if (players[0].id == room.order[0] && players.length > 1) {
                let temp = players.shift();
                players.push(temp);
            }

            // restore order
            room.order = players.map((pl) => pl.id);

            await Room.updateOne({ id: room.id }).set({
                admin: room.admin.id,
                order: room.order,
                activePlayer: 0,
                startoff: "",
                trump: null,
                robbed: false,
                stack: [],
            });
            await Room.replaceCollection(room.id, "deck").members([]);
            await Room.replaceCollection(room.id, "called").members([]);
            return 1;
        } else return 0;
    } else return 0;
}
