/**
 * ListController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {
    // -------------------------------------------------------------- index action
    index: (req, res) => {
        return res.view("basic/index", { layout: "index_layout" });
    },

    // -------------------------------------------------------------- roomlist actions
    roomList: async (req, res) => {
        try {
            let active = false;
            let rooms = await Room.getList();
            if (req.session.roomid && parseInt(req.cookies.userhash) != NaN) {
                let ar = await Room.findOne({ id: req.session.roomid });
                if (ar) {
                    active = rooms.find((el) => el.hashID == ar.hashID);
                    if (!active.players.includes(parseInt(req.cookies.userhash))) active = false;
                }
            }
            return res.json({ rooms: rooms, active: active, ahash: req.cookies.userhash });
        } catch (err) {
            sails.log(err);
            return res.serverError(err);
        }
    },

    accessList: async (req, res) => {
        try {
            let p_user, uname, uhash;
            // check for existing credentials, get random otherwise
            if (req.session.userid) {
                p_user = await User.findOne({ id: req.session.userid });
                if (p_user) {
                    uname = p_user.name;
                    uhash = p_user.hashID;
                } else {
                    uname = User.getRandomName(req.cookies.username != "undefined" ? req.cookies.username : null);
                    uhash = await User.getUniqueHash(req.cookies.userhash != "undefined" ? req.cookies.userhash : null);
                }
            } else {
                uname = User.getRandomName(req.cookies.username != "undefined" ? req.cookies.username : null);
                uhash = await User.getUniqueHash(req.cookies.userhash != "undefined" ? req.cookies.userhash : null);
            }

            res.cookie("username", uname);
            res.cookie("userhash", uhash);

            let errmsg = req.cookies.errmsg;
            if (errmsg) res.clearCookie("errmsg");

            let pwprotect = req.cookies.protected;
            if (pwprotect) res.clearCookie("protected");

            return res.view("basic/roomlist", { layout: "basic_layout", username: uname, userhash: uhash, errmsg: errmsg, protected: pwprotect });
        } catch (err) {
            sails.log(err);
            return res.serverError(err);
        }
    },

};

