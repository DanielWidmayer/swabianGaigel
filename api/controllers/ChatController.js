/**
 * ChatControllerController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
    joinmsg: (username, roomhash, trigger = 0) => {
        // trigger: 0=normal, 1=rejoin
        sails.sockets.broadcast(roomhash, "joinmsg", { user: username, trigger: trigger });
        sails.log(`${username} joined room ${roomhash}`);
    },

    leavemsg: (username, roomhash, trigger = 0) => {
        // trigger: 0=normal, 1=timeout, 2=kick
        sails.sockets.broadcast(roomhash, "leavemsg", { user: username, trigger: trigger });
        sails.log(`${username} left room ${roomhash}`);
    },

    errormsg: (roomhash, msg) => {
        sails.sockets.broadcast(roomhash, "errormsg", { text: msg });
    },

    turnmsg: (user, showscore, roomhash) => {
        sails.sockets.broadcast(roomhash, "turnmsg", { user: user, show: showscore });
    },

    firstturnmsg: (user, roomhash) => {
        sails.sockets.broadcast(roomhash, "firstturnmsg", { user: user });
    },

    cardplayedmsg: (user, card, roomhash) => {
        sails.sockets.broadcast(roomhash, "cardplayedmsg", { user: user, card: card });
    },

    paircalledmsg: (user, symbol, showscore, roomhash) => {
        sails.sockets.broadcast(roomhash, "paircalledmsg", { user: user, show: showscore, symbol: symbol });
    },

    cardrobmsg: (user, card, roomhash) => {
        sails.sockets.broadcast(roomhash, "cardrobmsg", { user: user, card: card });
    },

    gameovermsg: (users, roomhash) => {
        sails.sockets.broadcast(roomhash, "gameovermsg", { users: users });
    },

    firstcardtypemsg: (user, first_type, roomhash) => {
        sails.sockets.broadcast(roomhash, "firstcardtypemsg", { user: user, first_type: first_type });
    },

    botmsg: (bot, roomhash, type = 0) => {
        // type: -1 = leave, 1 = join
        sails.sockets.broadcast(roomhash, "botmsg", { bot: bot, trigger: type });
    },

    replacemsg: (user, bot, roomhash, trigger) => {
        // trigger: -1=player replaced by bot, 1=bot replaced by player
        sails.sockets.broadcast(roomhash, "replacemsg", { bot: bot, user: user, trigger: trigger });
    },

    deckemptymsg: (roomhash) => {
        sails.sockets.broadcast(roomhash, "deckemptymsg", {});
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
            let room = await Room.findOne({ id: roomid }).populate("players");
            let user = await User.findOne({ id: userid });

            // check if user in room
            if (room.players.find((player) => player.id == user.id)) {
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
