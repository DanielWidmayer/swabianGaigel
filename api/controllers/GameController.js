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
            let players = [], temp = [], t_player;

            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user is in room
            if (room.jsonplayers.findIndex((pl) => pl.playerID == user.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin
            if (user.id != room.admin.id) throw error(104, "You are not allowed to do this!");

            // check if game has already started
            if (room.status == "game") throw error(104, "The game has already started!");

            // shuffle
            temp = room.jsonplayers;
            let j, m;
            for (let i = temp.length - 1; i > 0; i--) {
                j = Math.floor(Math.random() * (i + 1));
                m = temp[i];
                temp[i] = temp[j];
                temp[j] = m;
            }
            
            if (room.maxplayers >= 4) {
                let div = Math.floor(room.maxplayers / 2);
                for (let i = 0; i < temp.length; i++) {
                    temp[i].team = (i % div) + 1;
                }
            }

            room.jsonplayers = temp;
            for (let pl of room.jsonplayers) {
                t_player = await User.getNameAndHash(pl.playerID);
                if (t_player.bot) pl.ready = true;
                else pl.ready = false;
                players.push(t_player);
                players[players.length - 1].ready = pl.ready;
                players[players.length - 1].team = pl.team;
            }

            // save changes
            await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

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
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if game is already running
            if (room.status == "game") throw error(104, "The game has already started!");

            // check if user is in room
            let p_index = room.jsonplayers.findIndex((pl) => pl.playerID == user.id);
            if (p_index < 0) throw error(101, "User is not in this room!");

            // check team parameter
            let t_team = req.body.team;
            if (t_team < 0 || t_team > 3) throw error(104, "This Team does not exist!");

            if (room.maxplayers < 4) throw error(104, "No Teams allowed for less than 4 players!");

            for (const pl of room.jsonplayers) {
                teams[pl.team] += 1;
            }
            room.jsonplayers[p_index].ready = false;
            if (room.jsonplayers[p_index].team == t_team) room.jsonplayers[p_index].team = 0;
            else if (teams[t_team] >= 2) throw error(104, "This Teams is already full!");
            else room.jsonplayers[p_index].team = t_team;

            await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

            let players = [];
            for (const el of room.jsonplayers) {
                players.push(await User.getNameAndHash(el.playerID));
                players[players.length - 1].ready = el.ready;
                players[players.length - 1].team = el.team;
            }

            sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });

            return res.status(200).json({ team: room.jsonplayers[p_index].team });
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
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");
            players = room.jsonplayers;

            // check if user is in room
            if (players.findIndex((pl) => pl.playerID == user.id) < 0) throw error(101, "User is not in this room!");

            // check if user is admin
            if (user.id != room.admin.id) throw error(104, "You are not allowed to do this!");

            // check if room is full
            if (players.length >= room.maxplayers) throw error(104, "Room is already full!");

            let bot = await User.newBot();

            players.push({
                playerID: bot.id,
                hand: [],
                score: 0,
                wins: 0,
                team: 0,
                ready: true,
            });

            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            let users = [];
            for (const pl of players) {
                users.push(await User.getNameAndHash(pl.playerID));
                users[users.length - 1].ready = pl.ready;
                users[users.length - 1].team = pl.team;
            }
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
            let players = [],
                t_index;
            let target = req.body.target;

            // check authentication
            if (req.session.roomid && req.session.userid) {
                room = await Room.findOne({ id: req.session.roomid }).populate("admin");
                user = await User.findOne({ id: req.session.userid });
            } else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This Room could not be found!");
            if (!user) throw error(101, "This User could not be found!");

            // check if user and target are in room
            target = await User.findOne({ hashID: target });
            if (!target) throw error(101, "This User does not exist!");
            if (room.jsonplayers.findIndex((pl) => pl.playerID == user.id) < 0) throw error(101, "User is not in this room!");
            t_index = room.jsonplayers.findIndex((pl) => pl.playerID == target.id);
            if (t_index < 0) throw error(101, "User is not in this room!");

            // check if user is admin and if he wants to kick himself
            if (user.id != room.admin.id || target.id == room.admin.id) throw error(104, "You are not allowed to do this!");

            if (target.bot) {
                if (room.status == "game") throw error(104, "You can't kick a Bot once the game has started!");
                else {
                    room.jsonplayers.splice(t_index, 1);
                    await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });
                    await User.destroyOne({ id: target.id });
                    ChatController.botmsg(target.botname, room.hashID, -1);
                    for (const el of room.jsonplayers) {
                        players.push(await User.getNameAndHash(el.playerID));
                        players[players.length - 1].ready = el.ready;
                        players[players.length - 1].team = el.team;
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
                    room = await Room.findOne({ id: req.session.roomid });
                    user = await User.findOne({ id: req.session.userid });
                } else throw error(101, "Invalid Session!");
                if (!room) throw error(101, "This Room could not be found!");
                if (!user) throw error(101, "This User could not be found!");

                // check if user is in room and set ready
                u_index = room.jsonplayers.findIndex((pl) => pl.playerID == user.id);
                if (u_index < 0) throw error(101, "User is not in this room!");
                if (room.jsonplayers[u_index].ready == false) room.jsonplayers[u_index].ready = true;
                else room.jsonplayers[u_index].ready = false;

                // wait till all players are ready
                let rps = room.jsonplayers.reduce((cb, pv) => {
                    if (pv.ready) return cb + 1;
                    else return cb;
                }, 0);
                if (rps < room.jsonplayers.length) {
                    await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });
                    for (const pl of room.jsonplayers) {
                        players.push(await User.getNameAndHash(pl.playerID));
                        players[players.length - 1].ready = pl.ready;
                        players[players.length - 1].team = pl.team;
                    }

                    sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: false });
                    return res.status(200).json({ ready: room.jsonplayers[u_index].ready });
                }

                if (room.jsonplayers.length < room.maxplayers) {
                    // fill up with Bots
                    for (let i = room.jsonplayers.length; i < room.maxplayers; i++) {
                        let newbot = await User.newBot();
                        room.jsonplayers.push({
                            playerID: newbot.id,
                            hand: [],
                            score: 0,
                            wins: 0,
                            team: 0
                        });
                        newbot = await User.getNameAndHash(newbot.id);
                        ChatController.botmsg(newbot.name, room.hashID, 1);
                    }
                    
                    await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });
                    //sails.sockets.broadcast(room.hashID, "userevent", { users: t_players, max: room.maxplayers });
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
                if (room.jsonplayers.length >= 4) {
                    let teams = [];
                    for (let i = 0; i <= room.jsonplayers.length / 2; i++) {
                        teams[i] = room.jsonplayers.filter((el) => el.team == i);
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
                    for (let i = 0; i < room.jsonplayers.length; i++) {
                        ts = i % (room.jsonplayers.length / 2);
                        room.jsonplayers[i] = teams[ts][ps];
                        if (i + 1 >= room.jsonplayers.length / 2) ps = 1;
                    }
                }

                await Room.updateOne({ id: room.id }).set({ trump: trump_card.id, jsonplayers: room.jsonplayers });

                // deal cards to players, start game
                let hand;
                for (const pl of room.jsonplayers) {
                    players.push(await User.getNameAndHash(pl.playerID));
                    players[players.length - 1].team = pl.team;
                }
                sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: true });

                for (const el of room.jsonplayers) {
                    sails.log("deal 5 cards to player " + el.playerID);
                    hand = await Card.dealCard(5, el.playerID, room.id);
                    pl = await User.findOne({ id: el.playerID });
                    sails.sockets.broadcast(pl.socket, "start", { hand: hand, trump: trump_card, users: players });
                }

                // broadcast firstturn event
                user = await User.getNameAndHash(room.jsonplayers[0].playerID);
                ChatController.firstturnmsg(user, room.hashID);
                sails.log("its " + user.name + " turn");
                sails.sockets.broadcast(room.hashID, "firstturn", { user: user });

                if (user.bot) setTimeout(botPlay, 1000, { roomid: room.id, botid: room.jsonplayers[0].playerID });

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
            let card, c_index, acPl;
            let firstplay = false,
                firstround = false;
            let delay = 1000;

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(user.name + " is playing a card");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

            acPl = room.activePlayer;
            let first_type = room.startoff;

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
            if (!room.jsonplayers.find((el) => el.wins > 0)) {
                firstround = true;
                if (first_type.length <= 0) {
                    if (card.value == 11) first_type = "Second Ace";
                    else if (card.symbol == room.trump.symbol) {
                        let hand = await Card.find({ id: room.jsonplayers[acPl].hand });
                        if (hand.find((el) => el.symbol != room.trump.symbol)) throw error(104, "You are only allowed to start off with a trump suit card if you do not own any other suit!");
                        else first_type = "Trump";
                    } else first_type = "Higher wins";
                    firstplay = true;
                    await Room.updateOne({ id: room.id }).set({ startoff: first_type });
                }
            }

            // check for empty deck
            if (!room.trump && room.stack.length > 0) {
                let hand = await Card.find({ id: room.jsonplayers[acPl].hand });
                c_index = hand.findIndex((el) => el.id == card.id);
                hand.splice(c_index, 1);
                // check if user could have played symbol
                if (card.symbol != room.stack[0].symbol) {
                    if (hand.find((el) => el.symbol == room.stack[0].card.symbol)) throw error(104, "You have to play the same suit!");
                } else {
                    if (hand.find((el) => el.value > room.stack[0].card.value)) throw error(104, "You have to play a higher card if you own one!");
                }
            }

            // add card to stack and remove from hand
            let temp_stack = room.stack;
            let temp_players = room.jsonplayers;
            temp_players[acPl].hand.splice(c_index, 1);
            temp_stack.push({ playerID: user.id, card: card });

            //sails.log(temp_players);
            await Room.updateOne({ id: room.id }).set({ jsonplayers: temp_players, stack: temp_stack });

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
            if (temp_stack.length >= temp_players.length) {
                // eval win and deal
                sails.log("Full stack, eval winner");
                winner = evalStack(temp_stack, room.trump, firstround ? first_type : "");

                acPl = await applyWin(room.id, firstround, winner);

                // check for win condition
                if (await gameover(room.id)) return res.ok();

                // only deal cards if deck is not empty
                if (room.deck.length > 0) {
                    for (const el of temp_players) {
                        user = await User.findOne({ id: el.playerID });
                        let card = await Card.dealCard(1, el.playerID, room.id);
                        if (card.length) {
                            sails.sockets.broadcast(user.socket, "dealcard", { card: card });
                        } else {
                            user = await User.getNameAndHash(el.playerID);
                            sails.sockets.broadcast(room.hashID, "dealTrump", { user: user, card: room.trump });
                            await Room.updateOne({ id: room.id }).set({ trump: null });
                        }
                    }
                }
                //sails.log.info(room.jsonplayers);
            } else {
                // next player turn
                if (acPl < room.jsonplayers.length - 1) acPl += 1;
                else acPl = 0;
                //await Room.updateOne({ id: room.id }).set({ jsonplayers: temp_players });
            }

            // update activePlayer and broadcast next turn
            await Room.updateOne({ id: room.id }).set({ activePlayer: acPl });
            user = await User.getNameAndHash(temp_players[acPl].playerID);
            sails.log("next player: " + user.name);
            sails.sockets.broadcast(room.hashID, "turn", { user: user });

            // check for bot turn
            user = await User.findOne({ id: temp_players[acPl].playerID });
            if (user.bot == true) {
                await botRob(room.id, user.id);
                await botCall(room.id, user.id);
                if (winner >= 0) delay = 4000;
                setTimeout(botPlay, delay, { roomid: room.id, botid: user.id });
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
            let cards, c_index, p_index;

            // check if user exists
            if (req.session.userid) user = await User.getNameAndHash(req.session.userid);
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(user.name + "is calling a Pair");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("called").populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

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
            if (!room.trump) throw error(104, "You can't call any more pairs if the deck is empty!");

            // check if user owns both cards
            cards.forEach((card) => {
                c_index = room.jsonplayers[p_index].hand.findIndex((el) => el == card.id);
                if (c_index < 0) throw error(104, `You do not own this card, cheater!`);
            });

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
                ChatController.paircalledmsg(user, cards[0].symbol, room.hashID);

                // save changes
                await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

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
        let room, user;
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let room, user, card, c_index, p_index;
            let players = [];

            // check if user exists
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else throw error(101, "Invalid Session!");
            if (!user) throw error(101, "This user could not be found!");

            sails.log(user.name + " is robbing the trump");

            // check if room exists
            if (req.session.roomid) room = await Room.findOne({ id: req.session.roomid }).populate("trump");
            else throw error(101, "Invalid Session!");
            if (!room) throw error(101, "This room could not be found!");

            // check if trump card exists
            if (!room.trump) throw error(104, "You can't rob anymore!");

            // block robbery just to be safe
            await Room.updateOne({ id: room.id }).set({ robbed: true });

            // check if user is in room
            p_index = room.jsonplayers.findIndex((el) => el.playerID == user.id);
            if (p_index < 0) throw error(101, "User is not in this room!");

            // check room status
            if (room.status != "game") throw error(104, "You can't do that right now!");

            card = req.body.card;
            sails.log.info(card);
            // check if played card is trump 7
            if (card.value != 0 || card.symbol != room.trump.symbol) throw error(104, "You can't rob with this card!");
            // check if user owns card
            c_index = room.jsonplayers[p_index].hand.findIndex((el) => el == card.id);
            if (c_index < 0) throw error(104, "You do not own this card, cheater!");

            // check if user has enough wins
            if (room.jsonplayers[p_index].wins >= 1) {
                // switch trump card with player card
                let temp = room.jsonplayers[p_index].hand[c_index];
                room.jsonplayers[p_index].hand[c_index] = room.trump.id;
                user = await User.getNameAndHash(user.id);
                sails.sockets.broadcast(room.hashID, "cardrob", { user: user, card: card }, req);
                ChatController.cardrobmsg(user, card, room.hashID);
                await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers, trump: temp });
                sails.log(`${user.name} robbed the trump (${temp}) with card ${card.id}`);
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

        if (room.jsonplayers[room.activePlayer].playerID == botid) {
            botPlay({ roomid: roomid, botid: botid });
        }
        return 1;
    },
};

// -------------------------------------------------------------------------------------- Bot Functions - TODO
async function botPlay(args) {
    let room = await Room.findOne({ id: args.roomid }).populate("deck").populate("trump");
    let bot = room.jsonplayers.find((el) => el.playerID == args.botid);
    let stack = room.stack;
    let players = room.jsonplayers;
    let firstplay = false;
    let firstround = false;
    let empty = false;
    let delay = 1000;

    // check if game was already won
    if (room.status == "lobby") return 0;

    let hand = await Card.find({ id: bot.hand });
    let p_index = players.findIndex((el) => el.playerID == bot.playerID);
    let t_user = await User.getNameAndHash(bot.playerID);

    sails.log("Bot " + t_user.name + " is playing a card");

    // check if bot is still bot
    if (t_user.bot == false) return 0;

    // check for first round and first play
    if (!players.find((el) => el.wins > 0)) {
        firstround = true;
        if (stack.length <= 0) firstplay = true;
    }

    // check empty deck
    if (!room.trump && stack.length > 0) empty = true;

    // play Card
    let pcards = [];
    let card = 0,
        c_index;
    if (firstplay) {
        // bot starts off, play random card that is not trump suit or else if only trump owned
        for (const el of hand) {
            if (el.symbol != room.trump.symbol) pcards.push(el);
        }
    } else if (firstround) {
        // first round, only play trump if Trump has been called
        if (room.startoff == "Trump") {
            for (const el of hand) {
                if (el.symbol == room.trump.symbol) pcards.push(el);
            }
        } else {
            for (const el of hand) {
                if (el.symbol != room.trump.symbol) pcards.push(el);
            }
        }
    } else if (empty && stack.length > 0) {
        let highest = -1;
        let ct;
        for (const el of hand) {
            if (el.symbol == stack[0].card.symbol && el.value > highest) {
                highest = el.value;
                ct = el;
            }
        }
        if (highest >= 0) pcards.push(ct);
    } else {
        let ht = -1;
        let hv = -1;
        if (stack.length == players.length - 1) {
            // check if bot could win
            for (let i = 0; i < stack.length; i++) {
                if (stack[i].card.symbol == room.trump.symbol && stack[i].card.value > ht) ht = stack[i].card.value;
                else if (stack[i].card.symbol == stack[0].card.symbol && stack[i].card.value > hv) hv = stack[i].card.value;
            }
            if (ht >= 0) {
                let ci = hand.findIndex((el) => el.value > ht && el.symbol == room.trump.symbol);
                if (ci >= 0) pcards.push(hand[ci]);
            } else {
                let ci = hand.findIndex((el) => el.value > hv && el.symbol == stack[0].card.symbol);
                if (ci >= 0) pcards.push(hand[ci]);
            }
        }
    }
    // if no card has been picked, select all
    if (pcards.length <= 0) pcards = hand;
    // pick random card out of possible cards
    c_index = Math.floor(Math.random() * pcards.length);
    card = pcards[c_index];

    c_index = bot.hand.findIndex((el) => el == card.id);
    bot.hand.splice(c_index, 1);
    players[p_index].hand = bot.hand;
    room.stack.push({ playerID: bot.playerID, card: card });

    sails.log.info(card);
    //sails.log(players);

    await Room.updateOne({ id: room.id }).set({ stack: room.stack, jsonplayers: players });

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
    if (stack.length >= players.length) {
        // eval win and deal
        sails.log("Full stack, eval winner");
        winner = evalStack(stack, room.trump, firstround ? room.startoff : "");

        room.activePlayer = await applyWin(room.id, firstround, winner);

        // check for win condition
        if (await gameover(room.id)) return 1;

        // only deal cards if deck is not empty
        if (room.deck.length > 0) {
            for (const el of players) {
                t_user = await User.findOne({ id: el.playerID });
                let dealcard = await Card.dealCard(1, el.playerID, room.id);
                if (dealcard.length) {
                    if (!t_user.bot) sails.sockets.broadcast(t_user.socket, "dealcard", { card: dealcard });
                } else {
                    t_user = await User.getNameAndHash(el.playerID);
                    sails.sockets.broadcast(room.hashID, "dealTrump", { user: t_user, card: room.trump });
                    await Room.updateOne({ id: room.id }).set({ trump: null });
                }
            }
        }
    } else {
        // next player turn
        if (room.activePlayer < room.jsonplayers.length - 1) room.activePlayer += 1;
        else room.activePlayer = 0;
    }

    // update activePlayer and broadcast next turn
    await Room.updateOne({ id: room.id }).set({ activePlayer: room.activePlayer });
    t_user = await User.getNameAndHash(players[room.activePlayer].playerID);
    sails.log("next player: " + t_user.name);
    sails.sockets.broadcast(room.hashID, "turn", { user: t_user });

    // check for bot turn
    t_user = await User.findOne({ id: players[room.activePlayer].playerID });
    if (t_user.bot == true) {
        await botRob(room.id, t_user.id);
        await botCall(room.id, t_user.id);
        if (winner >= 0) delay = 4000;
        setTimeout(botPlay, delay, { roomid: room.id, botid: t_user.id });
    }

    //players = await Room.findOne({ id: room.id });
    //sails.log(players.jsonplayers);

    return 1;
}

async function botCall(roomid, botid) {
    let room = await Room.findOne({ id: roomid }).populate("called").populate("trump");
    let bot = room.jsonplayers.find((el) => el.playerID == botid);
    let p_index = room.jsonplayers.findIndex((el) => el.playerID == botid);
    let hand = await Card.find({ id: bot.hand });
    let pairs = [];
    let call = [];
    let tcall = [];

    if (bot.wins >= 1 && room.trump) {
        for (const el of hand) {
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

        room.jsonplayers[p_index].score = bot.score;

        if (room.jsonplayers.length >= 4) {
            // get winner teammate
            let t_win = room.jsonplayers.findIndex((el) => el.team == bot.team && el.playerID != bot.playerID);
            room.jsonplayers[t_win].score = bot.score;
        }

        // socket call event
        let user = await User.getNameAndHash(bot.playerID);
        user.score = bot.score;
        user.team = bot.team;
        sails.sockets.broadcast(room.hashID, "paircalled", { user: user, cards: call });
        ChatController.paircalledmsg(user, call[0].symbol, room.hashID);

        sails.log(`Bot ${user.name} has called pair ${call[0].id} and ${call[1].id}`);

        // save changes
        await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers });

        // check for game win condition
        await gameover(room.id);
    } else return 0;

    return 1;
}

async function botRob(roomid, botid) {
    let room = await Room.findOne({ id: roomid }).populate("trump");
    let bot = room.jsonplayers.find((el) => el.playerID == botid);
    let p_index = room.jsonplayers.findIndex((el) => el.playerID == botid);
    let hand = await Card.find({ id: bot.hand });

    if (bot.wins > 0 && room.trump && !room.robbed) {
        let card = hand.find((el) => el.symbol == room.trump.symbol && el.value == 0);
        if (card) {
            let c_index = bot.hand.findIndex((el) => el == card.id);
            room.jsonplayers[p_index].hand[c_index] = room.trump.id;
            let user = await User.getNameAndHash(bot.playerID);
            sails.sockets.broadcast(room.hashID, "cardrob", { user: user, card: card });
            ChatController.cardrobmsg(user, card, room.hashID);
            await Room.updateOne({ id: room.id }).set({ jsonplayers: room.jsonplayers, trump: card.id, robbed: true });
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
    //sails.log.info(type);
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
    if (trump && trump.symbol !== null) {
        for (let i = 0; i < stack.length; i++) {
            if (stack[i].card.symbol == trump.symbol) occ.push(stack[i]);
        }
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

async function applyWin(roomid, firstround, winnerID) {
    try {
        let room = await Room.findOne({ id: roomid });
        let players = room.jsonplayers;
        let stack = room.stack;
        let acPl = room.activePlayer;
        let winner = players.findIndex((el) => el.playerID == winnerID);
        let user;

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

        if (players.length <= 3) {
            for (let i = 0; i < stack.length; i++) {
                // gesamten Stich als Score hochzählen
                players[winner].score += stack[i].card.value;
            }
            players[winner].wins += 1;
            user = await User.getNameAndHash(players[winner].playerID);
            user.score = players[winner].score;
            user.wins = players[winner].wins;
            sails.sockets.broadcast(room.hashID, "roundwin", { user: user });
            ChatController.turnmsg(user, room.hashID);
            acPl = winner;
        } else {
            let p_win = [];
            let p_team = players[winner].team;
            // get winner team
            for (let i = 0; i < players.length; i++) {
                if (players[i].team == p_team) {
                    p_win.push(i);
                }
            }

            for (const el of p_win) {
                for (let i = 0; i < stack.length; i++) {
                    // gesamten Stich als Score hochzählen
                    players[el].score += stack[i].card.value;
                }
                players[el].wins += 1;
            }

            user = await User.getNameAndHash(players[winner].playerID);
            user.score = players[winner].score;
            user.wins = players[winner].wins;

            sails.sockets.broadcast(room.hashID, "roundwin", { user: user });

            if (p_win[0] == acPl) acPl = p_win[1];
            else acPl = p_win[0];
        }
        sails.log(user.name + " won!");

        await Room.updateOne({ id: room.id }).set({ jsonplayers: players, stack: [] });

        return acPl;
    } catch (err) {
        throw err;
    }
}

async function gameover(roomid) {
    let room = await Room.findOne({ id: roomid }).populate("admin");
    let winners = [],
        ut;
    if (room) {
        // if there are no cards on hand left, game is finished, win by most points
        if (!room.jsonplayers.find((el) => el.hand.length > 0)) {
            let w_score = room.jsonplayers[0].score;
            let ut;
            let winners = [];
            // Game Finished
            for (const el of room.jsonplayers) {
                if (el.score >= w_score) w_score = el.score;
            }

            for (const el of room.jsonplayers) {
                if (el.score == w_score) {
                    ut = await User.getNameAndHash(el.playerID);
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
        if (room.jsonplayers.find((el) => el.score >= 101)) {
            for (const el of room.jsonplayers) {
                if (el.score >= 101) {
                    ut = await User.getNameAndHash(el.playerID);
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
            let bot;
            let players = room.jsonplayers;
            for (let el of players) {
                bot = await User.findOne({ id: el.playerID });
                if (!bot.bot) {
                    el.hand = [];
                    el.score = 0;
                    el.ready = false;
                    el.team = 0;
                    el.wins = 0;
                } else el.bot = true;
            }
            bot = players.findIndex((el) => el.bot == true);
            while (bot >= 0) {
                await User.destroyOne({ id: players[bot].playerID });
                players.splice(bot, 1);
                bot = players.findIndex((el) => el.bot == true);
            }
            // switch first player
            if (players[0].playerID == room.jsonplayers[0].playerID && players.length > 1) {
                let temp = players.shift();
                players.push(temp);
            }
            await Room.updateOne({ id: room.id }).set({
                jsonplayers: players,
                admin: players[0].playerID,
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
