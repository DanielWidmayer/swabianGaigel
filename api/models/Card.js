/**
 * Card.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const crypto = require("crypto");

/* Legende:
  Symbol:
    [0] - Kreuz / Eichel
    [1] - Karo / Schellen
    [2] - Herz / Herz
    [3] - Pik / Blatt
  Value:
    [0]  - 7
    [2]  - Bube / J
    [3]  - Dame / Q
    [4]  - König / K
    [10] - 10
    [11] - Ass
*/

module.exports = {
    attributes: {

        value: {
            type: "number",
            required: true,
        },

        symbol: {
            type: "number",
            required: true,
        },
    },

    dealCard: async (ammount, userID, roomID) => {
        try {
            let cards = [];

            let room = await Room.findOne({ id: roomID }).populate("deck");
            let carddeck = room.deck;
    
            let c_temp;
            for (x = 0; x < ammount; x++) {
                c_temp = sails.models.card.getRandomCard(carddeck);
                if (c_temp) {
                    cards.push(c_temp.id);
                    carddeck.splice(
                        carddeck.findIndex((el) => el.id == c_temp.id),
                        1
                    );
                } else break;
            }
    
            await Room.removeFromCollection(roomID, "deck", cards);
    
            await User.addToCollection(userID, "hand", cards);
    
            return await Card.find().where({ id: cards });
        } catch (err) {
            throw err;
        } 
    },

    getRandomCard: (carddeck) => {
        try {
            let rand = crypto.randomBytes(5);
            rand = Math.abs(rand.readInt16LE()) + Math.floor(Math.random() * (carddeck.length / 2));
            if (carddeck.length > 0) return carddeck[rand % carddeck.length];
            else return null;
        } catch (err) {
            throw err;
        }
        
    },
};
