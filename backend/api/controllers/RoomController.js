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
            let uhash = await User.getRandomHash(req.cookies.userhash);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");
    
            return res.view('basic/roomlist', { layout: 'basic_layout', username: uname, userhash: uhash, errmsg: errmsg });
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
            sails.sockets.blast("listevent", { room: room });
            //console.log(room);
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
            let user = { name: User.getRandomName(req.cookies.username), hash: await User.getRandomHash(req.cookies.userhash) };

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            return res.view("basic/create", { layout: "basic_layout", username: user.name, userhash: user.hash , errmsg: errmsg });
        } catch (err) {
            return res.serverError(err);
        }
    },

    roomAccess: async (req, res) => {
        try {
            let hash = req.param("roomID");
            let user = null, room, players = [], t_p = [];
 
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
            players.push({ playerID: user.id, hand: [], score: 0 , ready: false});
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
                res.cookie('errmsg', err.message);
                return res.redirect('/list');
            }
            else return res.serverError(err);
        }
    },

    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let players = [];
            let front_p = [];
            // check for connected user
            let user = await User.findOne({ id: req.session.userid });
            if (!user) throw error(101, "This User was not connected to any room!");

            // check for room
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) throw error(102, "This Room does not exist!");
            let hash = room.hashID;

            // remove user from player list of connected room
            players = room.jsonplayers;
            let pin = players.find((el) => el.playerID == user.id);
            players.splice(pin, 1);
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            // disconnect from socket room and remove session variables
            sails.sockets.leave(req, hash);
            delete req.session.roomid;
            delete req.session.userid;

            // leave message
            ChatController.leavemsg(user.name, hash);
            for (el of players) front_p.push(el.playerID);
            players = await User.getNameAndHash(front_p);
            sails.sockets.broadcast(hash, "userevent", { users: players });
            console.log(`${user.name} left room ${hash}`);

            // delete user object
            await User.destroyOne({ id: user.id });

            // update roomlist
            let temp_room = await Room.getListRoom({ id: room.id })
            sails.sockets.blast("listevent", { room: temp_room });

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
            if (!req.session.roomid) throw error(101, "You were not authenticated to join this room, please try again!");
            let room = await Room.findOne({ id: req.session.roomid });
            let p_ids = [];
            for (el of room.jsonplayers) {
                p_ids.push(el.playerID);
            }
            let players = await User.getNameAndHash(p_ids);
            sails.sockets.join(req, room.hashID);
            sails.sockets.broadcast(room.hashID, "userevent", { users: players });

            // save socket ID in user obj
            await User.updateOne({ id: req.session.userid }).set({ socket: sails.sockets.getId(req) });

            return res.ok();
        } catch (err) {
            if (err.code) return res.badRequest(err);
            return res.serverError(err);
        }
    },

    userlist: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("socket request expected, got http instead."));
        }

        try {
            let userid = req.session.userid;
            let roomid = req.session.roomid;
            if (!roomid || !userid) throw error(101, "Invalid Session");

            let room = await Room.findOne({ id: roomid });
            if (!room) throw error(102, "Room does not exist");
            else {
                let p_ids = [];
                for (el of room.jsonplayers) p_ids.push(el.playerID);
                let players = await User.getNameAndHash(p_ids);
                return res.json(players);
            }
        } catch (err) {
            if (err.code) return res.badRequest(err);
            return res.serverError(err);
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
                sails.log("in game");
            } else {
                // remove user from player list of connected room
                players = room.jsonplayers;
                let pin = players.find((el) => el.playerID == userid);
                players.splice(pin, 1);
                await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

                // remove session variables
                delete req.session.roomid;
                delete req.session.userid;

                pin = [];
                let user = await User.findOne({ id: userid });
                // leave message
                ChatController.leavemsg(user.name, room.hashID);
                for (el of players) pin.push(el.playerID);
                players = await User.getNameAndHash(pin);
                sails.sockets.broadcast(hash, "userevent", { users: players });
                console.log(`${user.name} left room ${hash}`);

                // update roomlist
                let temp_room = await Room.getNameAndHash({ id: room.id });
                sails.sockets.blast("listevent", { room: temp_room });

                // destroy user object
                await User.destroyOne({ id: user.id });
            }

            return res.ok();
        } catch (err) {
            if (err.code) return res.badRequest(err);
            else return res.serverError(err);
        }
    },
};
