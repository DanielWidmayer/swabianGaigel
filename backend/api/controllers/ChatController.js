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

    leavemsg: (username, roomhash, bot = "") => {
        let text = "left the game";
        if (bot.length) text += " and was replaced by Bot";
        sails.sockets.broadcast(roomhash, "leavemsg", { user: username, text: text, bot: bot });
        sails.log(`${username} left room ${roomhash}`);
    },

    controllermsg: (roomhash, msg) => {
        sails.sockets.broadcast(roomhash, "controllermsg", { text: msg });
    },

    turnmsg: (user, roomhash) => {
        sails.sockets.broadcast(roomhash, "turnmsg", { user: user });
    },

    cardplayedmsg: (user, card, roomhash) => {
        sails.sockets.broadcast(roomhash, "cardplayedmsg", { user: user, card: card });
    },

    paircalledmsg: (user, symbol, roomhash) => {
        sails.sockets.broadcast(roomhash, "paircalledmsg", { user: user, symbol: symbol });
    },

    cardrobmsg: (user, card, roomhash) => {
        sails.sockets.broadcast(roomhash, "cardrobmsg", { user: user, card: card });
    },

    gameovermsg: (user, roomhash) => {
        sails.sockets.broadcast(roomhash, "gameovermsg", { user: user });
    },

    firstcardtypemsg: (first_type, roomhash) => {
        sails.sockets.broadcast(roomhash, "firstcardtypemsg", { first_type: first_type });
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
