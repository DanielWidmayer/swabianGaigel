/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require("crypto");
const ChatController = require("./ChatController");

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
            let room = {
                hashID: hash,
                name: req.body.roomname,
                password: req.body.passwd ? true : false,
                maxplayers: req.body.maxplayers,
                players: 0,
            };
            sails.sockets.blast("listevent", { room: room });
            //console.log(room);
            return res.redirect(`/join/${hash}`);
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

    joinUser: async (req, res) => {
        let hash = req.param("roomID");

        try {
            let user;
            let players = [];
            // check if room exists
            let room = await Room.findOne({ hashID: hash });
            if (!room) {
                return res.badRequest(new Error("The room you tried to join does not exist!"));
            }

            // get authenticated user, create new one if not authenticated
            if (req.session.userid) user = await User.findOne({ id: req.session.userid });
            else {
                user = await User.newUser(req.cookies.username, res);
                req.session.userid = user.id;
            }

            // check if User is already connected to another Room or this Room
            if (req.session.roomid) {
                let roomid = req.session.roomid;
                // user is already connected to this room  ---- TODO
                if (roomid == room.id) {
                }
            }
            // check if room is joinable
            if (room.status == "game" || room.jsonplayers.length >= room.maxplayers) {
                return res.redirect("/list");
            }

            // add user to player list
            players = room.jsonplayers;
            players.push({ playerID: user.id, hand: [], score: 0 });
            await Room.updateOne({ id: room.id }).set({ jsonplayers: players });

            // make user admin if he is the first one to join
            await Room.updateOne({ id: room.id }).set({ admin: user.id });

            room = await Room.findOne({ id: room.id });
            let temp_room = {
                hashID: room.hashID,
                name: room.name,
                password: room.password ? true : false,
                maxplayers: room.maxplayers,
                players: room.jsonplayers.length,
            };
            sails.sockets.blast("listevent", { room: temp_room });

            // validate session roomid
            req.session.roomid = room.id;

            // join message
            return res.redirect(`/room/${hash}`);
        } catch (err) {
            return res.serverError(err);
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
            let temp_room = {
                hashID: room.hashID,
                name: room.name,
                password: room.password ? true : false,
                maxplayers: room.maxplayers,
                players: players.length,
            };
            sails.sockets.blast("listevent", { room: temp_room });

            // return status 200, redirect on client side
            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    access: async (req, res) => {
        try {
            let hash = req.param("roomID");
            let userid = req.session.userid;
            let roomid = req.session.roomid;

            // check if room exists
            let room = await Room.findOne({ hashID: hash });
            if (room) {
                // check if user exists
                if (userid) {
                    let user = await User.findOne({ id: userid });
                    if (user) {
                        // check if user is already connected to room
                        if (roomid == room.id) {
                            return res.view("room/gameroom", { layout: "room_layout", hash: room.hashID });
                        }
                    }
                }

                // redirect to join, but only if the game is currently not running and room is not full
                if (room.status == "lobby" && room.jsonplayers.length < room.maxplayers) return res.redirect(`/join/${hash}`);
                else return res.redirect("/list");
            } else {
                return res.badRequest(new Error("This room could not be found."));
            }
        } catch (err) {
            return res.serverError(err);
        }
    },

    socketconnect: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            //let room = await Room.findOne({id: req.session.roomid}).populate('players');
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
};
