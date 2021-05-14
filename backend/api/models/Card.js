/**
 * Card.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */


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

primaryKey: 'id';

module.exports = {

  attributes: {

    id: {
      type: 'number',
      autoIncrement: false,
      unique: true,
      required: true
    }, 

    value: {
      type: 'number',
      required: true
    },

    symbol: {
      type: 'number',
      required: true
    }

  },

  dealCard: async (ammount, userID, roomID) => {
    // TO DO - perform some sanity checks like if room and user exist, max and min ammount of cards
    let cards = [];

    let room = await Room.findOne({id: roomID}).populate('deck');
    let carddeck = room.deck;

    let c_temp;
    for (x = 0; x < ammount; x++) {
        c_temp = sails.models.card.getRandomCard(carddeck);
        if (c_temp) {
          cards.push(c_temp.id);
          carddeck.splice(carddeck.findIndex(el => el.id == c_temp.id), 1);
        } else break;
    }

    await Room.removeFromCollection(roomID, 'deck', cards);

    let players = room.jsonplayers;
    let p_index = players.findIndex(el => el.playerID == userID);
    players[p_index].hand = cards;
    await Room.updateOne({id: roomID}).set({jsonplayers: players});

    return await Card.find().where({id: cards});
  },

  getRandomCard: (carddeck) => {
    if (carddeck.length > 0) return carddeck[Math.floor(Math.random() * carddeck.length)];
    else return null;
  }

};

