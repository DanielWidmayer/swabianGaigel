/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const { uniqueNamesGenerator, adjectives, names, animals, colors } = require("unique-names-generator");

module.exports = {
    attributes: {
        hashID: {
            type: "number",
            required: true,
            unique: true,
        },

        name: {
            type: "string",
            required: true,
        },

        socket: {
            type: "string",
        },

        botname: {
            type: "string",
            required: true,
        },

        bot: {
            type: "boolean",
            defaultsTo: false,
        },
    },

    newUser: async (req, res) => {
        // get Name and Hash or use stored values
        let hash = await sails.models.user.getUniqueHash(req.cookies.userhash);
        let name = sails.models.user.getRandomName(req.cookies.username);
        let bot = uniqueNamesGenerator({
            dictionaries: [colors],
            length: 1,
            style: "capital",
        });

        // store values on cookies
        res.cookie("username", name);
        res.cookie("userhash", hash);

        // create User
        await User.create({
            hashID: hash,
            name: name,
            botname: bot,
        });

        let user = await User.findOne({ hashID: hash });

        return user;
    },

    getNameAndHash: async (pids) => {
        let players = await User.find().where({ id: pids });
        let res = [];

        for (el of players) {
            if (el.bot) res.push({ hashID: el.hashID, name: el.botname });
            else res.push({ hashID: el.hashID, name: el.name });
        }

        if (res.length == 1) return res.pop();
        else return res;
    },

    getRandomName: (c_name) => {
        try {
            let uname;
            if (c_name) uname = c_name;
            // generate random name
            else
                uname = uniqueNamesGenerator({
                    dictionaries: [adjectives, animals, names],
                    separator: "",
                    length: 2,
                    style: "capital",
                });

            return uname;
        } catch (err) {
            throw err;
        }
    },

    getUniqueHash: async (c_hash) => {
        try {
            let uhash;
            if (c_hash) uhash = c_hash;
            else uhash = Math.floor(Math.random() * (999 - 100) + 100);
            // unique hash
            while (await User.findOne({ hashID: uhash })) {
                uhash = Math.floor(Math.random() * (999 - 100) + 100);
            }

            return uhash;
        } catch (err) {
            throw err;
        }
    },

    getBots: async (roomID) => {
        try {
            let bots = [];
            let room = await Room.findOne({ id: roomID });

            for (el of room.jsonplayers) {
                if (el.bot == true) bots.push(el.playerID);
            }

            return bots;
        } catch (err) {
            throw err;
        }
    },

    getPlayers: async (roomID) => {
        try {
            let players = [];
            let room = await Room.findOne({ id: roomID });

            for (el of room.jsonplayers) {
                if (el.bot == false) players.push(el.playerID);
            }

            return players;
        } catch (err) {
            throw err;
        }
    },
};
