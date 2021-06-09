/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require("crypto");
const ChatController = require("./ChatController");
const GameController = require("./GameController");

const { uniqueNamesGenerator, adjectives, colors, countries } = require("unique-names-generator");

const error = sails.helpers.errors;

module.exports = {

    // -------------------------------------------------------------------------------------- Room Creation
    newRoom: async (req, res) => {
        try {
            let data = req.body;
            let re = /^([A-Za-z0-9]+\s?)+$/;
            // sanity checking of post data
            if (data.roomname.length <= 4 || data.roomname.length > 21) throw error(103, "Please provide a valid Room Name only containing letters, numbers and single spaces with at least 5 and max 20 characters.#name");
            else if (!re.test(data.roomname)) throw error(103, "Please provide a valid Room Name only containing letters, numbers and single spaces with at least 5 and max 20 characters.#name");

            let mp = parseInt(data.maxplayers);
            if (![2, 3, 4, 6].includes(mp)) throw error(103, "Please provide a valid count of max players.#players");

            re = /^[A-Za-z0-9._/\-:\\+#=()&%$§@,;]{5,15}$/;
            let pw = data.passwd;
            if (data.pwcb) {
                if (!re.test(pw)) throw error(103, "Please provide a valid password with 5-15 characters.#password");
            } else pw = "";
            // all good

            let hash = crypto.randomBytes(10).toString("hex");
            while (await Room.findOne({ hashID: hash })) {
                sails.log.debug("hashID already in use, creating new one ...");
                hash = crypto.randomBytes(10).toString("hex");
            }

            await Room.create({
                hashID: hash,
                name: data.roomname,
                password: pw,
                maxplayers: mp,
                showscore: data.score ? true : false,
                order: [],
                stack: [],
            });
            let room = await Room.findOne({ hashID: hash });
            req.session.roomid = room.id;
            //sails.sockets.blast("listevent", { room: room });
            return res.redirect(`/room/${hash}`);
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                res.cookie("errmsg", err.msg);
                return res.redirect("/create");
            }
            return res.serverError(err);
        }
    },

    createPage: async (req, res) => {
        try {
            let user = { name: User.getRandomName(req.cookies.username), hash: await User.getUniqueHash(req.cookies.userhash) };
            let rname;
            const re = /^([A-Za-z0-9]+\s?)+$/;
            // create random roomname
            do {
                rname = uniqueNamesGenerator({
                    dictionaries: [adjectives, colors, countries],
                    separator: " ",
                    length: 3,
                    style: "capital",
                });
            } while (!re.test(rname) || rname.length > 21);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/create", { layout: "basic_layout", username: user.name, userhash: user.hash, roomname: rname, errmsg: errmsg });
        } catch (err) {
            sails.log.error(err);
            return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- Join Room
    protectRoom: async (req, res) => {
        try {
            let room = req.body.hash;
            room = await Room.findOne({ hashID: room }).decrypt();
            if (!room) throw error(102, "Sorry, but the room you tried to join does not exist!");

            if (req.body.passwd != room.password) throw error(103, "Invalid password!");
            req.session.roomid = room.id;
            return res.ok();
        } catch (err) {
            sails.log.error(err);
            return res.status(403).json({ err: err });
        }
    },

    roomAccess: async (req, res) => {
        try {
            let hash = req.param("roomID");
            let user = null,
                room = null;

            // check if room exists
            room = await Room.findOne({ hashID: hash }).populate("admin").populate("players");
            if (!room) {
                throw error(102, "Sorry, but the room you tried to join does not exist!");
            }

            // check if room is password protected
            if (room.password.length > 0) {
                if (req.session.roomid != room.id) return res.redirect(`/list?room=${err.roomID}`);
            }

            // check if user object still exists somewhere
            if (req.session.userid) {
                user = await User.findOne({ id: req.session.userid });
                if (!user) {
                    sails.log.info("kill references");
                    // kill references
                    delete req.session.userid;
                    delete req.session.roomid;
                }
                // check if user tries to reconnect
                else if (req.session.roomid == room.id) {
                    // check if player was kicked
                    if (user.kicked) {
                        await leavehandler({ userid: user.id, roomid: room.id, trigger: 2 });
                        delete req.session.userid;
                        delete req.session.roomid;
                        throw error(101, "You have been kicked!");
                    }
                    let admin_flag = false;
                    if (room.admin && room.admin.id == req.session.userid) admin_flag = true;

                    return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID, admin: admin_flag });
                } else if (req.session.roomid) {
                    await leavehandler({ userid: req.session.userid, roomid: req.session.roomid, trigger: 0 });
                    delete req.session.userid;
                }
            }

            // no room connection, carry on
            // check if room is joinable
            if (room.status == "game") throw error(102, "Sorry, but this game is already running!");
            if (room.players.length >= room.maxplayers) throw error(102, "Sorry, but this game is already full!");

            req.session.roomid = room.id;

            return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID, admin: false });
        } catch (err) {
            sails.log.error(err);
            if (err.code) {
                if (err.msg) res.cookie("errmsg", err.msg);
                return res.redirect("/list");
            } else return res.serverError(err);
        }
    },

    socketconnect: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        let room, user;
        try {
            let players = [],
                admin_flag = false;

            if (!req.session.roomid) throw error(101, "You were not authenticated to join this room, please try again!");
            room = await Room.findOne({ id: req.session.roomid }).populate("admin").populate("players");

            if (req.session.userid) {
                user = await User.findOne({ id: req.session.userid });
                // check if user was already replaced by bot
                if (user.bot) {
                    sails.log("User " + user.name + " reconnected, replace Bot");
                    await User.updateOne({ id: req.session.userid }).set({ bot: false });
                    ChatController.joinmsg(user.name, room.hashID, 1);
                    ChatController.replacemsg(user.name, user.botname, room.hashID, 1);
                }
            } else {
                // create new user
                user = await User.newUser(req.cookies.userhash, req.cookies.username);
                req.session.userid = user.id;

                // make user admin if he is the first one to join
                if (room.players.length == 0) {
                    await Room.updateOne({ id: room.id }).set({ admin: user.id });
                    admin_flag = true;
                }

                // join message
                ChatController.joinmsg(user.name, room.hashID);

                // add user to player list
                await Room.addToCollection(room.id, "players", user.id);
                room.players.push(user);
                room.order.push(user.id);
                await Room.updateOne({ id: room.id }).set({ order: room.order });

                sails.sockets.blast("listevent", { room: await Room.getListRoom({ id: room.id }) });
            }

            for (const id of room.order) {
                let tp_obj = room.players.find((el) => el.id == id);
                players.push(await User.getNameAndHash(id));
                players[players.length - 1].team = tp_obj.team;
                if (room.status == "lobby") players[players.length - 1].ready = tp_obj.ready;
            }

            sails.sockets.join(req, room.hashID);
            // check if user is admin
            if ((room.admin && req.session.userid == room.admin.id) || admin_flag) sails.sockets.broadcast(sails.sockets.getId(req), "adminchange", {});
            sails.sockets.broadcast(room.hashID, "userevent", { users: players, max: room.maxplayers, ingame: room.status == "game" ? true : false });

            // save socket ID in user obj
            await User.updateOne({ id: req.session.userid }).set({ socket: sails.sockets.getId(req), unload: false });

            // check if game is running, provide necessary data for reconnect-render
            if (room.status == "game") {
                room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump").populate("called").populate("players");
                
                let p_i = await User.findOne({ id: req.session.userid }).populate("hand");
                let hand = p_i.hand;
                let req_user = await User.getNameAndHash(p_i.id);

                let unplayedcards = [];
                let playedcard;
                
                let round = 1;
                if (!room.players.find((el) => el.wins > 0)) round = 0;
                else if (room.deck.length <= 0) round = 2;

                //sails.log.info(unplayedcards);
                if (room.deck.length) unplayedcards.push(room.trump.id);
                for (const cl of room.deck) {
                    unplayedcards.push(cl.id);
                }
                //sails.log.info(unplayedcards);

                let p_temp, playerhand;
                let stack = [];

                for (let i = 0; i < room.stack.length; i++) {
                    if (room.stack[i].playerID == req.session.userid) playedcard = await Card.findOne({ id: room.stack[i].cardID });
                    p_temp = await User.getNameAndHash(room.stack[i].playerID);
                    stack[i] = { uhash: p_temp.hashID };
                    if (round > 0) stack[i].cardID = room.stack[i].cardID;
                    unplayedcards.push(room.stack[i].cardID);
                }

                players = [];
                for (let id of room.order) {
                    p_temp = await User.findOne({ id: id }).populate("hand");
                    playerhand = p_temp.hand.map((co) => co.id);
                    players.push({
                        name: p_temp.bot ? p_temp.botname : p_temp.name,
                        hashID: p_temp.hashID,
                        hand: playerhand.length,
                        score: p_temp.score,
                        wins: p_temp.wins,
                        team: p_temp.team,
                    });
                    unplayedcards = unplayedcards.concat(playerhand);

                }

                let allCards = await Card.find({ id: { nin: unplayedcards } });

                let r_temp = {
                    deck: room.deck.length,
                    acPl: room.activePlayer,
                    robbed: room.robbed,
                    called: room.called,
                    played: allCards,
                    stack: stack,
                    status: room.status,
                };

                return res.status(200).json({ username: req_user.name, userhash: req_user.hashID, users: players, room: r_temp, hand: hand, trump: room.trump, round: round, playedcard: playedcard });
            }

            return res.status(200).json({ username: user.name, userhash: user.hashID });
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- Leave Room
    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            // check for connected user
            let user = await User.findOne({ id: req.session.userid });
            if (!user) throw error(101, "This User was not connected to any room!");

            // check for room
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) throw error(102, "This Room does not exist!");

            // disconnect from socket room and remove session variables
            sails.sockets.leave(req, room.hashID);
            delete req.session.roomid;
            delete req.session.userid;
            await User.updateOne({ id: user.id }).set({ unload: true });

            await leavehandler({ userid: user.id, roomid: room.id, trigger: 0 });

            // return status 200, redirect on client side
            return res.ok();
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },

    unloadUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let userid = req.session.userid;
            let room, user;
            // check if room exists
            if (req.session.roomid && userid) {
                room = await Room.findOne({ id: req.session.roomid });
                user = await User.findOne({ id: userid });
            } else throw error(101, "Invalid Session!");

            if (!room) throw error(102, "Room does not exist!");
            if (!user) throw error(101, "User does not exist!");
            let roomid = room.id;

            // disconnect user from socket. independently from room status
            sails.sockets.leave(req, room.hashID);
            // user unload
            await User.updateOne({ id: userid }).set({ socket: "", unload: true });

            await handleEmptyRoom(roomid);
            // start 30s timeout if room not empty and player was not kicked
            if (!room.empty && !user.kicked) {
                setTimeout(leavehandler, 30000, { userid: userid, roomid: roomid, trigger: 1 });
            }

            return res.ok();
        } catch (err) {
            sails.log.error(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },
};

// -------------------------------------------------------------------------------------- Helper Functions

async function handleEmptyRoom(roomID) {
    let pids = [],
        empty = true;
    let room = await Room.findOne({ id: roomID }).populate("admin").populate("players");
    // check if room is empty
    if (room.players.length > 0) {
        pids = room.players.map((el) => el.id);
        let human = room.players.find((el) => el.bot == false);
        if (human) {
            // still at least one human player
            let users = [];
            for (const id of room.order) {
                let tp_obj = room.players.find((el) => el.id == id);
                users.push(await User.getNameAndHash(id));
                users[users.length - 1].team = tp_obj.team;
                if (room.status == "lobby") users[users.length - 1].ready = false;
            }
            empty = false;

            // switch admin if neccessary
            if (!room.admin || room.admin.bot) {
                await Room.updateOne({ id: room.id }).set({ admin: human.id });
                sails.sockets.broadcast(human.socket, "adminchange", {});
            }
            sails.sockets.broadcast(room.hashID, "userevent", { users: users, max: room.maxplayers, ingame: room.status == "game" ? true : false });
        } else {
            // no human player left, destroy bots
            await User.destroy({ id: pids });
        }
    }
    room = await Room.getListRoom({ id: room.id });
    room.empty = empty;

    if (empty) {
        sails.sockets.blast("listevent", { room: room });
        // destroy room
        sails.log.debug("destroy room " + room.hashID);
        await Room.destroyOne({ id: roomID });
    }

    return room;
}

async function leavehandler(args) {
    let user = await User.findOne({ id: args.userid });
    let room = await Room.findOne({ id: args.roomid });
    let trigger = args.trigger;

    if (user) sails.log.info("leavehandler triggered for " + user.name + " " + user.id);
    else sails.log.info("leavehandler triggered, but User was already destroyed");
    // check if user reconnected within timeout
    if (!user || !room || user.unload == false) return -1;

    // leave message
    ChatController.leavemsg(user.name, room.hashID, trigger);

    // check room status
    if (room.status == "game") {
        // replace player with Bot
        sails.log.info(user.name + " disconnected, replace with Bot");
        await User.updateOne({ id: user.id }).set({ bot: true, unload: false });
        ChatController.replacemsg(user.name, user.botname, room.hashID, -1);

        let t_room = await handleEmptyRoom(room.id);

        // trigger bot if player left during his turn
        if (!t_room.empty) GameController.triggerBot(room.id, user.id);

        return 0;
    } else {
        // remove user from player list of connected room
        await Room.removeFromCollection(room.id, "players", user.id);
        room.order.splice(room.order.indexOf(user.id), 1);
        await Room.updateOne({ id: room.id }).set({ order: room.order });

        room = await handleEmptyRoom(room.id);

        // update roomlist
        if (!room.empty) sails.sockets.blast("listevent", { room: room });

        // destroy user object
        sails.log.debug("destroy user object " + user.name + " " + user.id);
        await User.destroyOne({ id: user.id });
        return 1;
    }
}
