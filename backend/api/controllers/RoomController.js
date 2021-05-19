/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require("crypto");
const ChatController = require("./ChatController");

const error = sails.helpers.errors;

module.exports = {
    accessList: async (req, res) => {
        try {
            // get random user values or use cookies
            let uname = User.getRandomName(req.cookies.username);
            let uhash = await User.getUniqueHash(req.cookies.userhash);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/roomlist", { layout: "basic_layout", username: uname, userhash: uhash, errmsg: errmsg });
        } catch (err) {
            return res.serverError(err);
        }
    },

    newRoom: async (req, res) => {
        // TODO - check POST-data
        try {
            let hash = crypto.randomBytes(10).toString("hex");
            while (await Room.findOne({ hashID: hash })) {
                sails.log("hashID already in use, creating new one ...");
                hash = crypto.randomBytes(10).toString("hex");
            }
            await Room.create({
                hashID: hash,
                name: req.body.roomname,
                password: req.body.passwd,
                maxplayers: parseInt(req.body.maxplayers),
                jsonplayers: [],
                stack: [],
            });
            let room = await Room.getListRoom({ hash: hash });
            //sails.sockets.blast("listevent", { room: room });
            return res.redirect(`/room/${hash}`);
        } catch (err) {
            if (err.code) {
                res.cookie("errmsg", err.message);
                return res.redirect("/create");
            }
            return res.serverError(err);
        }
    },

    createPage: async (req, res) => {
        try {
            let user = { name: User.getRandomName(req.cookies.username), hash: await User.getUniqueHash(req.cookies.userhash) };

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/create", { layout: "basic_layout", username: user.name, userhash: user.hash, errmsg: errmsg });
        } catch (err) {
            return res.serverError(err);
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

            // check if user tries to reconnect
            if (req.session.roomid == room.id) {
                // User is reconnecting to room, change from bot to user again - TODO

                return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
            }
            // no room connection, carry on
            // check if room is joinable
            if (room.status == "game") throw error(102, "Sorry, but this game is already running!");
            if (room.jsonplayers.length >= room.maxplayers) throw error(102, "Sorry, but this game is already full!");

            // create new user
            user = await User.newUser(req, res);

            // add user to player list
            players = room.jsonplayers;
            players.push({ playerID: user.id, hand: [], score: 0, ready: false, wins: 0, team: 0 });
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            // make user admin if he is the first one to join
            await Room.updateOne({ id: room.id }).set({ admin: user.id });

            let temp_room = await Room.getListRoom({ id: room.id });
            sails.sockets.blast("listevent", { room: temp_room });

            // validate session
            req.session.roomid = room.id;
            req.session.userid = user.id;

            // join message
            ChatController.joinmsg(user.name, room.hashID);
            return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
        } catch (err) {
            if (err.code) {
                res.cookie("errmsg", err.message);
                return res.redirect("/list");
            } else return res.serverError(err);
        }
    },

    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let players = [];
            let pids = [];
            let bots = [];
            // check for connected user
            let user = await User.findOne({ id: req.session.userid });
            if (!user) throw error(101, "This User was not connected to any room!");

            // check for room
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) throw error(102, "This Room does not exist!");
            let hash = room.hashID;

            // remove user from player list of connected room
            players = room.jsonplayers;
            let pin = players.findIndex((el) => el.playerID == user.id);
            players.splice(pin, 1);

            // disconnect from socket room and remove session variables
            sails.sockets.leave(req, hash);
            delete req.session.roomid;
            delete req.session.userid;

            // check if room is empty
            if (players.length > 0) {
                for (pl of players) pids.push(pl.playerID);
                bots = await User.find().where({ id: pids });
                if (bots.find((el) => el.bot == false)) {
                    // still at least one human player
                    await Room.updateOne({ id: room.id }).set({ jsonplayers: players });
                    // leave message
                    ChatController.leavemsg(user.name, hash);
                    let users = [],
                        p_temp;
                    for (pl of players) {
                        p_temp = await User.getNameAndHash(pl.id);
                        users.push({
                            hashID: p_temp.hashID,
                            name: p_temp.name,
                            ready: false,
                            team: pl.team,
                        });
                    }
                    sails.sockets.broadcast(hash, "userevent", { users: users });
                    console.log(`${user.name} left room ${hash}`);

                    room = await Room.getListRoom({ id: room.id });
                } else {
                    // no human player left, destroy bots and room
                    await User.destroy({ id: pids });
                    await Room.destroyOne({ id: room.id });
                    room.empty = true;
                }
            } else {
                // noone left, destroy room
                await Room.destroyOne({ id: room.id });
                room.empty = true;
            }

            // delete user object
            await User.destroyOne({ id: user.id });

            // update roomlist
            sails.sockets.blast("listevent", { room: room });

            // return status 200, redirect on client side
            return res.ok();
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
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
            await User.updateOne({ id: req.session.userid }).set({ socket: sails.sockets.getId(req) });

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
                sails.log(room.jsonplayers[p_index].hand);
                sails.log(hand);
                return res.status(200).json({ users: players, room: r_temp, ownHand: hand });
            }

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

            // disconnect user from socket. independently from room status
            sails.sockets.leave(req, room.hashID);
            await User.updateOne({ id: userid }).set({ socket: "" });

            // check room status
            if (room.status == "game") {
                // TODO - replace player with Bot
                sails.log("user disconnected, replace with bot");
            } else {
                // remove user from player list of connected room
                players = room.jsonplayers;
                let pin = players.find((el) => el.playerID == userid);
                players.splice(pin, 1);

                // remove session variables
                delete req.session.roomid;
                delete req.session.userid;

                let pids = [];
                // check if room is empty
                if (players.length > 0) {
                    for (pl of players) pids.push(pl.playerID);
                    bots = await User.find().where({ id: pids });
                    if (bots.find((el) => el.bot == false)) {
                        // still at least one human player
                        await Room.updateOne({ id: room.id }).set({ jsonplayers: players });
                        // leave message
                        ChatController.leavemsg(user.name, room.hashID);
                        let users = [],
                            p_temp;
                        for (pl of players) {
                            p_temp = await User.getNameAndHash(pl.id);
                            users.push({
                                hashID: p_temp.hashID,
                                name: p_temp.name,
                                ready: false,
                                team: pl.team,
                            });
                        }
                        sails.sockets.broadcast(room.hashID, "userevent", { users: users });

                        room = await Room.getListRoom({ id: room.id });
                    } else {
                        // no human player left, destroy bots and room
                        sails.log("destroy room " + room.hashID);
                        await User.destroy({ id: pids });
                        await Room.destroyOne({ id: room.id });
                        room.empty = true;
                    }
                } else {
                    // noone left, destroy room
                    sails.log("destroy room " + room.hashID);
                    await Room.destroyOne({ id: room.id });
                    room.empty = true;
                }

                // update roomlist
                sails.sockets.blast("listevent", { room: room });

                // destroy user object
                sails.log("destroy user object");
                await User.destroyOne({ id: userid });
            }

            return res.ok();
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },
};
