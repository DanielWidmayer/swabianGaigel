/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require("crypto");
const ChatController = require("./ChatController");

    // TODO - general error handling

module.exports = {
    newRoom: async (req, res) => {
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
            return res.serverError(err);
        }
    },

    createPage: async (req, res) => {
        try {
            let user = await User.findOne({ id: req.session.userid });
            if (!user) throw "Authentication Error!";
            return res.view("basic/create", { layout: "basic_layout", username: user.name, userhash: user.hashID });
        } catch (err) {
            return res.serverError(err);
        }
    },

    roomAccess: async (req, res) => {
        try {
            let hash = req.param("roomID");
            let user, room, players = [], t_p = [];
 
            // check if room exists
            room = await Room.findOne({ hashID: hash });
            if (!room) {
                throw new Error("Sorry, but the room you tried to join does not exist!");
            }

            // get authenticated user, create new one if not authenticated
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else {
                user = await User.newUser(req.cookies.username, res);
                req.session.userid = user.id;
            }

            // check if User is already connected to a Room
            if (req.session.roomid == room.id) {
                // User is connected to this room, access granted
                return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
            } else if (req.session.roomid) {
                // User is connected to another room
                let t_room = await Room.findOne({ id: req.session.roomid });
                // remove user from player list of connected room
                players = t_room.jsonplayers;
                let pin = players.find((el) => el.playerID == user.id);
                players.splice(pin, 1);
                await Room.updateOne({ id: t_room.id }).set({ jsonplayers: players });
                // leave message in old room
                ChatController.leavemsg(user.name, t_room.hashID);
                for (el of players) t_p.push(el.playerID);
                players = await User.getNameAndHash(t_p);
                sails.sockets.broadcast(t_room.hashID, "userevent", { users: players });
                console.log(`${user.name} left room ${hash}`);
                // reset user socket
                await User.updateOne({ id: user.id }).set({ socket: "" });
            }

            // check if room is joinable
            if (room.status == "game") throw new Error("Sorry, but this game is already running!");
            if (room.jsonplayers.length >= room.maxplayers) throw new Error("Sorry, but this game is already full!");


            // add user to player list
            players = room.jsonplayers;
            players.push({ playerID: user.id, hand: [], score: 0 , ready: false});
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            // make user admin if he is the first one to join
            //await Room.updateOne({ id: room.id }).set({ admin: user.id });

            let temp_room = await Room.getListRoom({ id: room.id });
            sails.sockets.blast("listevent", { room: temp_room });

            // validate session roomid
            req.session.roomid = room.id;

            // join message
            ChatController.joinmsg(user.name, room.hashID);
            return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
        } catch (err) {
            return res.redirect("/list");
        }
    },

    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            let players = [];
            let front_p = [];
            // check for connected user
            let user = await User.findOne({ id: req.session.userid });
            if (!user) return res.badRequest(new Error("User was not connected to any room!"));

            // check for room
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) return res.badRequest(new Error("Room does not exist!"));
            let hash = room.hashID;

            // remove user from player list of connected room
            players = room.jsonplayers;
            let pin = players.find((el) => el.playerID == user.id);
            players.splice(pin, 1);
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            // disconnect from socket room and remove session room variable
            sails.sockets.leave(req, hash);
            req.session.roomid = null;

            // leave message
            ChatController.leavemsg(user.name, hash);
            for (el of players) front_p.push(el.playerID);
            players = await User.getNameAndHash(front_p);
            sails.sockets.broadcast(hash, "userevent", { users: players });
            console.log(`${user.name} left room ${hash}`);

            // reset user socket
            await User.updateOne({ id: user.id }).set({ socket: "" });

            // update roomlist
            let temp_room = await Room.getListRoom({ id: room.id })
            sails.sockets.blast("listevent", { room: temp_room });

            // return status 200, redirect on client side
            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    socketconnect: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            if (!req.session.roomid) throw new Error("Authentication Error");
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
            return res.serverError(err);
        }
    },

    userlist: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            let userid = req.session.userid;
            let roomid = req.session.roomid;
            if (!roomid || !userid) return res.badRequest(new Error("invalid session"));

            let room = await Room.findOne({ id: roomid });
            if (!room) return res.badRequest(new Error("room does not exist"));
            else {
                let p_ids = [];
                for (el of room.jsonplayers) p_ids.push(el.playerID);
                let players = await User.getNameAndHash(p_ids);
                return res.json(players);
            }
        } catch (err) {
            return res.serverError(err);
        }
    },

    unloadUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            let userid = req.session.userid;
            // check if room exists
            if (!req.session.roomid) throw new Error("Authentication Error!");
            let room = await Room.findOne({ id: req.session.roomid });
            if (!room) throw new Error("Room does not exist!");

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

                // remove session room variable
                req.session.roomid = null;

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
            }

            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },
};
