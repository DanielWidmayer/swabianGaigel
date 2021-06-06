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

        hand: {
            collection: "card",
        },

        score: {
            type: "number",
            defaultsTo: 0,
        },

        ready: {
            type: "boolean",
            defaultsTo: false,
        },

        wins: {
            type: "number",
            defaultsTo: 0,
        },

        team: {
            type: "number",
            defaultsTo: 0
        },

        unload: {
            type: "boolean",
            defaultsTo: false,
        },

        kicked: {
            type: "boolean",
            defaultsTo: false,
        },
    },

    newUser: async (uhash, uname) => {
        // get Name and Hash or use stored values
        let hash = await sails.models.user.getUniqueHash(uhash);
        let name = sails.models.user.getRandomName(uname);
        let bot = uniqueNamesGenerator({
            dictionaries: [colors],
            length: 1,
            style: "capital",
        });

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

        for (const el of players) {
            if (el.bot) res.push({ hashID: el.hashID, name: el.botname, bot: true });
            else res.push({ hashID: el.hashID, name: el.name, bot: false });
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

            for (const el of room.jsonplayers) {
                if (el.bot == true) bots.push(el.playerID);
            }

            return bots;
        } catch (err) {
            throw err;
        }
    },

    newBot: async () => {
        try {
            let hash = await sails.models.user.getUniqueHash(false);
            let bot = uniqueNamesGenerator({
                dictionaries: [colors],
                length: 1,
                style: "capital",
            });

            // create User
            await User.create({
                hashID: hash,
                name: "bot",
                botname: bot,
                bot: true,
                ready: true
            });

            bot = await User.findOne({ hashID: hash });

            return bot;
        } catch (err) {
            throw err;
        }
    },
};
