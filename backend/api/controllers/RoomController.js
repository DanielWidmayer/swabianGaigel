/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require('crypto');
const ChatController = require('./ChatController');


module.exports = {
  
    newRoom: async (req, res) => {
        try {
            let hash = crypto.randomBytes(10).toString('hex');
            while (await Room.findOne({hashID: hash})) {
                sails.log("hashID already in use, creating new one ...");
                hash = crypto.randomBytes(10).toString('hex');
            }
            let room = await Room.create({
                hashID: hash,
                name: req.body.roomname,
                password: req.body.passwd,
                maxplayers: req.body.maxplayers
            });
            room = await Room.findOne({name: req.body.roomname});
            sails.sockets.blast('listevent', { room: room });
            //console.log(room);
            return res.redirect(`/join/${hash}`);
        } catch (err) {
            return res.serverError(err);
        }
    },

    joinUser: async (req, res) => {
        let hash = req.param('roomID');

        try {
            let user;
            // check if room exists
            let room = await Room.findOne({hashID: hash}).populate('players');
            if (!room) {
                return res.badRequest(new Error('The room you tried to join does not exist!'));
            }
            // check if room is joinable
            if (room.status == 'game' || room.players.length >= room.maxplayers) {
                return res.redirect('/list');
            }
    
            // get authenticated user, create new one if not authenticated
            if (req.session.userid) user = await User.findOne({id: req.session.userid})
            else {
                user = await User.newUser(req.cookies.username, res);
                req.session.userid = user.id;
            }

            // add user to player list
            await Room.addToCollection(room.id, 'players').members(user.id);
            //console.log(await Room.findOne({hashID: req.param('roomID')}).populate('players'));

            // validate session roomid
            req.session.roomid = room.id;
    
            // join message
            ChatController.joinmsg(user.name, hash);
    
            return res.redirect(`/room/${hash}`);
        } catch (err) {
            return res.serverError(err);
        }
    },

    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }

        try {
            // check for connected user
            let user = await User.findOne({id: req.session.userid});
            if (!user) return res.badRequest(new Error('User was not connected to any room!'));
            
            // check for room
            let room = await Room.findOne({id: req.session.roomid});
            if (!room) return res.badRequest(new Error('Room does not exist!'));
            let hash = room.hashID;

            // remove user from player list of connected room
            await Room.removeFromCollection(room.id, 'players').members(user.id);
            room = await Room.findOne({hashID: hash}).populate('players');

            // disconnect from socket room and remove session room variable
            sails.sockets.leave(req, hash);
            req.session.roomid = null;

            // leave message
            ChatController.leavemsg(user.name, hash);
            sails.sockets.broadcast(hash, 'userevent', {users: room.players});
            console.log(`${user.name} left room ${hash}`);

            // reset user score, hand and room credentials
            await User.replaceCollection(user.id, 'hand').members([]);
            await User.updateOne({id: user.id}).set({socket: null});

            // update roomlist
            sails.sockets.blast('listevent', { room: room });

            // return status 200, redirect on client side
            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    access: async (req, res) => {
        try {
            let hash = req.param('roomID');
            let userid = req.session.userid;

            // check if room exists
            let room = await Room.findOne({hashID: hash}).populate('players');
            if (room) {
                // check if user exists
                if (userid) {
                    let user = await User.findOne({id: userid});
                    if (user) {
                        // check if user is already connected to room
                        let pass = false;
                        room.players.forEach((el) => {
                            if (el.id == userid) pass = true;
                        });
                        if (pass) return res.view('room/gameroom', {layout: 'room_layout', hash: room.hashID});
                    }
                }

                // redirect to join, but only if the game is currently not running and room is not full
                if (room.status == 'lobby' && room.players.length < room.maxplayers) return res.redirect(`/join/${hash}`);
                else return res.redirect('/list');
            } else {
                return res.badRequest(new Error('This room could not be found.'));
            }

        } catch (err) {
            return res.serverError(err);
        }
    },

    socketconnect: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }

        try {
            let room = await Room.findOne({id: req.session.roomid}).populate('players');
            sails.sockets.join(req, room.hashID);
            sails.sockets.broadcast(room.hashID, 'userevent', {users: room.players});

            // save socket ID in user obj
            await User.updateOne({id: req.session.userid}).set({socket: sails.sockets.getId(req)});

            return res.ok();
        } catch (err) {
            return res.serverError(err);
        }
    },

    userlist: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }

        try {
            let userid = req.session.userid;
            let roomid = req.session.roomid;
            if (!roomid || !userid) return res.badRequest(new Error('invalid session'));

            let room = await Room.findOne({id: roomid}).populate('players');
            if (!room) return res.badRequest(new Error('room does not exist'));
            else {
                return res.json(room.players);
            }
        } catch (err) {
            return res.serverError(err);
        }
    }

};

