/**
 * Room.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    attributes: {
        hashID: {
            type: "string",
            required: true,
        },

        name: {
            type: "string",
            required: true,
        },

        // status: game, lobby, won
        status: {
            type: "string",
            defaultsTo: "lobby",
        },

        password: {
            type: "string",
            encrypt: true,
        },

        maxplayers: {
            type: "number",
            isIn: [2,3,4,6],
        },

        admin: {
            model: "user",
        },

        players: {
            collection: "user",
        },

        order: {
            type: "json",
        },

        activePlayer: {
            type: "number",
            defaultsTo: 0,
        },

        startoff: {
            // Trump, Second Ace, Higher wins
            type: "string",
        },

        deck: {
            collection: "card",
        },

        trump: {
            model: "card",
        },

        robbed: {
            type: "boolean",
            defaultsTo: false,
        },

        called: {
            collection: "card",
        },

        showscore: {
            type: "boolean",
            defaultsTo: true,
        },

        /*
      stack: [
        { playerID: Integer, cardID: Integer }
      ]
    */
        stack: {
            type: "json",
        },
    },

    getListRoom: async (ident) => {
        let room;
        try {
            if (ident.id) room = await Room.findOne({ id: ident.id }).populate("players");
            else if (ident.hash) room = await Room.findOne({ hashID: ident.hash }).populate("players");
            if (room) {
                let players = room.players.map((pl) => pl.hashID);
                return { hashID: room.hashID, name: room.name, password: room.password.length ? true : false, maxplayers: room.maxplayers, players: players };
            } else {
                return null;
            }
        } catch (err) {
            throw err;
        }
    },

    getList: async () => {
        try {
            let rooms = await Room.find().populate("players");
            let lrooms = [],
                players = [];
            for (const el of rooms) {
                players = el.players.map((pl) => pl.hashID);
                lrooms.push({ hashID: el.hashID, name: el.name, password: el.password.length ? true : false, maxplayers: el.maxplayers, players: players });
            }

            return lrooms;
        } catch (err) {
            throw err;
        }
    },
};
