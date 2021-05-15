/**
 * ChatControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
    joinmsg: (username, roomhash) => {
        sails.sockets.broadcast(roomhash, "joinmsg", { user: username, text: "has joined the game!" });
        sails.log(`${username} joined room ${roomhash}`);
    },

    leavemsg: (username, roomhash) => {
        sails.sockets.broadcast(roomhash, "leavemsg", { user: username, text: "has left the game!" });
        sails.log(`${username} left room ${roomhash}`);
    },

    controllermsg: (roomhash, msg) => {
        sails.sockets.broadcast(roomhash, "controllermsg", { text: msg });
    },

    turnmsg: (username, roomhash) => {
        sails.sockets.broadcast(roomhash, "turnmsg", { text: "It`s " + username + "'s turn!" });
    },

    chatpost: async (req, res) => {
        if (!req.isSocket) {
            return res.badRequest(new Error("no socket request"));
        }

        try {
            // check session
            let userid = req.session.userid;
            let roomid = req.session.roomid;

            if (!userid || !roomid) return res.badRequest(new Error("session failure"));

            // get user and room
            //let room = await Room.findOne({id: roomid}).populate('players');
            let room = await Room.findOne({ id: roomid });
            let user = await User.findOne({ id: userid });

            // check if user in room
            //if (room.players.find(player => player.id == user.id)) {
            if (room.jsonplayers.find((player) => player.playerID == user.id)) {
                // broadcast message
                sails.sockets.broadcast(room.hashID, "chatmsg", { user: user.name, text: req.body.text });
                return res.ok();
            } else {
                return res.badRequest(new Error("user not in room"));
            }
        } catch (err) {
            return res.serverError(err);
        }
    },
};
