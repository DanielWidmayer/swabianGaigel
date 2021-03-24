/**
 * RoomController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

//const Room = require("../models/Room");
const crypto = require('crypto');
const { isObject } = require('util');


module.exports = {
  
    newRoom: async (req, res) => {
        try {
            let hash = crypto.randomBytes(10).toString('hex');
            while (await Room.findOne({hashID: hash})) {
                console.log("hashID already in use, creating new one ...");
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
        if (req.method == 'GET') {
            try {
                let hash = req.param('roomID');
                // check if room exists
                let room = await Room.findOne({hashID: hash}).populate('players');
                if (!room) return res.badRequest(new Error('The room you tried to join does not exist!'));
                
                return res.view('pages/join');
            } catch (err) {
                return res.serverError(err);
            }
        } else if (req.method == 'POST') {
            try {
                let joinflag = true;
                let username = req.body.username;
    
                //perform some username checks
                if (username.length == 0) return res.redirect(req.url);
    
                // check if room exists
                let hash = req.body.roomid;
                let room = await Room.findOne({hashID: hash}).populate('players');
                if(!room) {
                    return res.badRequest(new Error('The room you tried to join does not exist!'));
                }
    
                // check if username is already in use
                room.players.forEach(item => {
                    //console.log(item);
                    if (item.name == username) joinflag = false;
                });
    
                //check if room is already full
                if (room.players.length >= room.maxplayers) joinflag = false;
    
                if (!joinflag) return res.redirect(req.url);
    
                // player can join, create player
                let user = await User.create({
                    name: username,
                    inroom: room.id
                });
                user = await User.findOne({name: username});
    
                // add user to player list
                await Room.addToCollection(room.id, 'players').members(user.id);
                //console.log(await Room.findOne({hashID: req.param('roomID')}).populate('players'));
    
                // validate session with userid and roomid
                req.session.userid = user.id;
                req.session.roomid = room.id;
    
                // join message
                sails.sockets.broadcast(hash, 'joinmsg', {user: username, text: 'has joined the game!'});
                console.log(`${username} joined room ${hash}`);
    
                // return status 200, redirect on client side
                return res.redirect(`/room/${hash}`);
            } catch (err) {
                return res.serverError(err);
            }
        }
    },

    leaveUser: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error('no socket request'));
        }

        try {
            // check for connected user
            let user = await User.findOne({id: req.session.userid}).populate('inroom');
            if (!user) return res.badRequest(new Error('User was not connected to any room!'));
            let hash = user.inroom.hashID;

            // remove user from player list of connected room
            await Room.removeFromCollection(user.inroom.id, 'players').members(user.id);
            let room = await Room.findOne({hashID: hash}).populate('players');

            // disconnect from socket room and remove session variables
            sails.sockets.leave(req, hash);
            req.session.userid = null;
            req.session.roomid = null;

            // leave message
            sails.sockets.broadcast(hash, 'leavemsg', {user: user.name, text: 'has left the game!'});
            sails.sockets.broadcast(hash, 'userevent', {users: room.players});
            console.log(`${user.name} left room ${hash}`);

            // remove this user object
            await User.destroyOne({id: user.id});

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
            let room = await Room.findOne({hashID: hash});
            if (room) {
                // check if user exists
                if (userid) {
                    let user = await User.findOne({id: userid});
                    if (user) {
                        // check if user is already connected to room
                        if (user.inroom == room.id) return res.view('pages/gameroom');
                    }
                }
                
                return res.redirect(`/join/${hash}`);
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

            // update roomlist
            sails.sockets.blast('listevent', { room: room });

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

