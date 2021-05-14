/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const { uniqueNamesGenerator, adjectives, names, animals } = require("unique-names-generator");

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
    },

    newUser: async (c_username, res) => {
        let hash = 0;
        let name = "";
        // generate unique hash
        do {
            hash = Math.floor(Math.random() * (999 - 100) + 100);
        } while (await User.findOne({ hashID: hash }));

        // check for username cookie
        if (c_username) name = c_username;
        else {
            name = uniqueNamesGenerator({
                dictionaries: [adjectives, animals, names],
                separator: "",
                length: 2,
                style: "capital",
            });
        }

        res.cookie("username", name);
        res.cookie("userhash", hash);

        // create User
        await User.create({
            hashID: hash,
            name: name,
        });

        let user = await User.findOne({ hashID: hash });

        return user;
    },

    getNameAndHash: async (pids) => {
        let players = await User.find().where({ id: pids });
        let res = [];

        for (el of players) {
            res.push({ hashID: el.hashID, name: el.name });
        }

        if (res.length == 1) return res.pop();
        else return res;
    },
};
