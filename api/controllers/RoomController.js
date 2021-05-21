/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require("crypto");
const ChatController = require("./ChatController");

const { uniqueNamesGenerator, countries } = require("unique-names-generator");

const error = sails.helpers.errors;

module.exports = {
    // -------------------------------------------------------------------------------------- roomlist
    roomList: async (req, res) => {
        try {
            let active = false;
            let rooms = await Room.getList();
            if (req.session.roomid) {
                active = rooms.find((el) => el.id == req.session.roomid);
            }
            return res.json({ rooms: rooms, active: active });
        } catch (err) {
            sails.log(err);
            return res.serverError(err);
        }
    },

    accessList: async (req, res) => {
        try {
            // get random user values or use cookies
            let uname = User.getRandomName(req.cookies.username);
            let uhash = await User.getUniqueHash(req.cookies.userhash);

            res.cookie("username", uname);
            res.cookie("userhash", uhash);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/roomlist", { layout: "basic_layout", username: uname, userhash: uhash, errmsg: errmsg });
        } catch (err) {
            sails.log(err);
            return res.serverError(err);
        }
    },

    // -------------------------------------------------------------------------------------- Room Creation
    newRoom: async (req, res) => {
        try {
            let data = req.body;
            let re = /^([A-Za-z0-9]+\s?)+$/;
            // sanity checking of post data
            if (data.roomname.length <= 0 || data.roomname.length > 21) throw error(103, "Please provide a Room Name between 1 and 25 characters");
            else if (!re.test(data.roomname)) throw error(103, "Please provide a valid Room Name only containing letters, numbers and single spaces");

            let mp = parseInt(data.maxplayers);
            if (![2,3,4,6].includes(mp)) throw error(103, "Please provide a valid count of max players");

            re = /^[A-Za-z0-9._/\-:\\+#=()&%$§@,;]{5,15}$/;
            let pw = data.passwd;
            if (data.pwcb) {
                if (!re.test(pw)) throw error(103, "Please provide a valid password between 5 and 15 characters");
            } else pw = "";
            // all good

            let hash = crypto.randomBytes(10).toString("hex");
            while (await Room.findOne({ hashID: hash })) {
                sails.log("hashID already in use, creating new one ...");
                hash = crypto.randomBytes(10).toString("hex");
            }
            await Room.create({
                hashID: hash,
                name: data.roomname,
                password: pw,
                maxplayers: mp,
                jsonplayers: [],
                stack: [],
            });
            let room = await Room.findOne({ hashID: hash });
            req.session.roomid = room.id;
            //sails.sockets.blast("listevent", { room: room });
            return res.redirect(`/room/${hash}`);
        } catch (err) {
            sails.log(err);
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
                    dictionaries: [countries],
                    length: 1,
                    style: "capital",
                });
            } while (!re.test(rname) || rname.length > 21);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/create", { layout: "basic_layout", username: user.name, userhash: user.hash, roomname: rname, errmsg: errmsg });
        } catch (err) {
            sails.log(err);
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
            sails.log(err);
            return res.status(403).json({ err: err });
        }
    },

    roomAccess: async (req, res) => {
        try {
            let hash = req.param("roomID");
            let user = null,
                room,
                players = [];

            // check if room exists
            room = await Room.findOne({ hashID: hash });
            if (!room) {
                throw error(102, "Sorry, but the room you tried to join does not exist!");
            }

            // check if room is password protected
            if (room.password.length > 0) {
                if (req.session.roomid != room.id) throw error(102, "This Room is password protected!");
            }

            // check if user object still exists somewhere
            if (req.session.userid) {
                user = await User.findOne({ id: req.session.userid });
                if (!user) {
                    sails.log("kill references");
                    // kill references
                    delete req.session.userid;
                    delete req.session.roomid;
                }
                // check if user tries to reconnect
                else if (req.session.roomid == room.id) {
                    sails.log("bot to user");
                    // change from bot to user again - TODO
                    return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
                } else if (req.session.roomid) {
                    await leavehandler({ userid: req.session.userid, roomid: req.session.roomid });
                }
            }

            // no room connection, carry on
            // check if room is joinable
            if (room.status == "game") throw error(102, "Sorry, but this game is already running!");
            if (room.jsonplayers.length >= room.maxplayers) throw error(102, "Sorry, but this game is already full!");

            // create new user
            user = await User.newUser(req, res);

            // make user admin if he is the first one to join
            if (room.jsonplayers.length == 0) await Room.updateOne({ id: room.id }).set({ admin: user.id });

            // add user to player list
            players = room.jsonplayers;
            players.push({ playerID: user.id, hand: [], score: 0, ready: false, wins: 0, team: 0 });
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            let temp_room = await Room.getListRoom({ id: room.id });
            sails.sockets.blast("listevent", { room: temp_room });

            // validate session
            req.session.roomid = room.id;
            req.session.userid = user.id;

            // join message
            ChatController.joinmsg(user.name, room.hashID);
            return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
        } catch (err) {
            sails.log(err);
            if (err.code) {
                res.cookie("errmsg", err.msg);
                return res.redirect("/list");
            } else return res.serverError(err);
        }
    },

    socketconnect: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let players = [],
                p_temp;
            if (!req.session.roomid) throw error(101, "You were not authenticated to join this room, please try again!");
            let room = await Room.findOne({ id: req.session.roomid });

            for (let el of room.jsonplayers) {
                players.push(await User.getNameAndHash(el.playerID));
                players[players.length - 1].ready = el.ready;
                players[players.length - 1].team = el.team;
            }

            sails.sockets.join(req, room.hashID);
            sails.sockets.broadcast(room.hashID, "userevent", { users: players });

            // save socket ID in user obj
            await User.updateOne({ id: req.session.userid }).set({ socket: sails.sockets.getId(req), unload: false });

            // check if game is running, provide necessary data for reconnect-render
            if (room.status == "game") {
                room = await Room.findOne({ id: req.session.roomid }).populate("deck").populate("trump").populate("called");
                let p_index = room.jsonplayers.findIndex((pl) => pl.playerID == req.session.userid);
                let hand = await Card.find().where({ id: room.jsonplayers[p_index].hand });
                let played = await Card.find();
                let temp;
                for (el of room.deck) {
                    temp = played.findIndex((c) => c.id == el.id);
                    played.splice(temp, 1);
                }
                let stack = [];
                for (i = 0; i < room.stack; i++) {
                    p_temp = await User.getNameAndHash(room.stack[i].playerID);
                    stack.push({
                        uhash: p_temp.hashID,
                        card: room.stack[i].card,
                    });
                }
                for (let el of room.jsonplayers) {
                    p_temp = await User.getNameAndHash(el.playerID);
                    players.push({
                        name: p_temp.name,
                        hashID: p_temp.hashID,
                        hand: el.hand.length,
                        score: el.score,
                        wins: el.wins,
                        team: el.team,
                    });
                }
                let r_temp = {
                    deck: room.deck.length,
                    trump: room.trump,
                    acPl: room.activePlayer,
                    robbed: room.robbed,
                    called: room.called,
                    played: played,
                    stack: stack,
                };

                return res.status(200).json({ users: players, room: r_temp, ownHand: hand });
            }

            return res.ok();
        } catch (err) {
            sails.log(err);
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

            await leavehandler({ userid: user.id, roomid: room.id });

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
            // check if room exists
            if (!req.session.roomid) throw error(101, "roomid Session missing!");
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) throw error(102, "Room does not exist!");
            let roomid = room.id;

            // disconnect user from socket. independently from room status
            sails.sockets.leave(req, room.hashID);
            // user unload
            await User.updateOne({ id: userid }).set({ socket: "", unload: true });

            room = await handleEmptyRoom(roomid);
            // start 30s timeout if room not empty
            if (!room.empty) {
                setTimeout(leavehandler, 30000, { userid: userid, roomid: roomid });
            }

            return res.ok();
        } catch (err) {
            sails.log(err);
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },
};

// -------------------------------------------------------------------------------------- Helper Functions

async function handleEmptyRoom(roomID) {
    let pids = [],
        bots = [],
        empty = true;
    let room = await Room.findOne({ id: roomID }).populate("admin");
    // check if room is empty
    if (room.jsonplayers.length > 0) {
        for (pl of room.jsonplayers) pids.push(pl.playerID);
        bots = await User.find().where({ id: pids });
        let human = bots.find((el) => el.bot == false);
        if (human) {
            // still at least one human player
            let users = [],
                p_temp;
            for (pl of room.jsonplayers) {
                p_temp = await User.getNameAndHash(pl.playerID);
                users.push({
                    hashID: p_temp.hashID,
                    name: p_temp.name,
                    ready: false,
                    team: pl.team,
                });
            }
            sails.sockets.broadcast(room.hashID, "userevent", { users: users });
            empty = false;

            // switch admin if neccessary
            if (room.admin) {
                if (room.admin.bot == true) await Room.updateOne({ id: room.id }).set({ admin: human.id });
            } else {
                await Room.updateOne({ id: room.id }).set({ admin: human.id });
            }
        } else {
            // no human player left, destroy bots
            await User.destroy({ id: pids });
        }
    }
    room = await Room.getListRoom({ id: room.id });

    if (empty) {
        // destroy room
        sails.log("destroy room " + room.hashID);
        await Room.destroyOne({ id: roomID });
    }
    room.empty = empty;
    return room;
}

async function leavehandler(args) {
    let user = await User.findOne({ id: args.userid });
    let room = await Room.findOne({ id: args.roomid });
    let players, p_index;

    if (user) sails.log("leavehandler triggered for " + user.name + " " + user.id);
    else sails.log("leavehandler triggered, but User was already destroyed");
    // check if user reconnected within timeout
    if (!user || !room || user.unload == false) return -1;

    // check room status
    if (room.status == "game") {
        // TODO - replace player with Bot
        sails.log("user disconnected, replace with bot");
        await User.updateOne({ id: user.id }).set({ bot: true });

        room = await handleEmptyRoom(room.id);
        if (!room.empty) {
            // leave message
            ChatController.leavemsg(user.name, room.hashID, user.botname);
        }

        return 0;
    } else {
        // remove user from player list of connected room
        players = room.jsonplayers;
        let pin = players.findIndex((el) => el.playerID == user.id);
        if (pin >= 0) players.splice(pin, 1);

        await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

        room = await handleEmptyRoom(room.id);
        if (!room.empty) {
            // leave message
            ChatController.leavemsg(user.name, room.hashID);
        }

        // update roomlist
        sails.sockets.blast("listevent", { room: room });

        // destroy user object
        sails.log("destroy user object");
        await User.destroyOne({ id: user.id });
        return 1;
    }
}
